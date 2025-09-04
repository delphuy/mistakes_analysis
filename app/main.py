from flask import Blueprint, render_template, request, redirect, url_for, flash, send_from_directory, abort, jsonify
from .models import db, ErrorQuestion, ExamScore, AnalysisResult
from datetime import datetime
import os
import uuid
import pandas as pd
from werkzeug.utils import secure_filename
import requests
import json
import re
from flask import current_app
from flask_caching import Cache

# 创建缓存实例
cache = Cache()
# 创建蓝图
bp = Blueprint('main', __name__)

@bp.route('/analysis_results')
@cache.cached(timeout=300)  # 缓存5分钟
def analysis_results():
    """查看所有分析结果"""
    analyses = AnalysisResult.query.order_by(AnalysisResult.create_time.desc()).all()
    return render_template('analysis_results.html', analyses=analyses)

# 创建蓝图
bp = Blueprint('main', __name__)


def allowed_file(filename, file_type='question'):
    """
    检查文件是否为允许的类型
    file_type: 'question' 表示错题文件, 'score' 表示成绩文件
    """
    if file_type == 'question':
        # 错题文件允许的类型
        allowed_extensions = current_app.config.get('UPLOAD_EXTENSIONS', ['.jpg', '.jpeg', '.png', '.pdf'])
    else:
        # 成绩文件允许的类型
        allowed_extensions = ['.xlsx', '.xls', '.csv', '.json']

    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in [ext[1:] for ext in allowed_extensions]


@bp.route('/check_ocr_status/<int:question_id>')
def check_ocr_status(question_id):
    """检查OCR识别状态"""
    question = ErrorQuestion.query.get_or_404(question_id)

    if question.content:
        return jsonify({
            'status': 'completed',
            'content': question.content
        })
    else:
        return jsonify({
            'status': 'processing'
        })

@bp.route('/')
def index():
    """首页"""
    # 获取最近的错题和分析结果
    recent_questions = ErrorQuestion.query.order_by(ErrorQuestion.upload_time.desc()).limit(5).all()
    recent_analyses = AnalysisResult.query.order_by(AnalysisResult.create_time.desc()).limit(5).all()

    return render_template('index.html',
                           recent_questions=recent_questions,
                           recent_analyses=recent_analyses)


@bp.route('/upload_question', methods=['GET', 'POST'])
def upload_question():
    """上传错题页面"""
    if request.method == 'POST':
        # 检查是否有文件上传
        if 'file' not in request.files:
            flash('没有文件部分')
            return redirect(request.url)

        file = request.files['file']
        # 如果用户没有选择文件
        if file.filename == '':
            flash('没有选择文件')
            return redirect(request.url)

        # 如果文件合法
        if file and allowed_file(file.filename, 'question'):

            # 生成唯一文件名
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)

            # 确保上传目录存在
            os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(file_path)

            # 确定文件类型
            file_ext = os.path.splitext(filename)[1].lower()
            file_type = 'image' if file_ext in ['.jpg', '.jpeg', '.png'] else 'pdf'

            # 创建错题记录
            new_question = ErrorQuestion(
                filename=filename,
                file_path=unique_filename,
                file_type=file_type
            )
            db.session.add(new_question)
            db.session.commit()

            # 保存应用上下文，以便在线程中使用
            app = current_app._get_current_object()

            # 调用OCR API识别内容（仅图片）
            if file_type == 'image':
                try:
                    # 使用异步处理OCR识别
                    from threading import Thread

                    # 定义OCR处理函数，将需要的外部变量作为参数传入
                    def process_ocr(question_id, file_path, filename):
                        try:
                            print(f"开始OCR处理，文件路径: {file_path}")

                            # 创建应用上下文
                            with app.app_context():
                                # 获取OCR API配置
                                ocr_api_key = current_app.config['OCR_API_KEY']
                                ocr_api_url = current_app.config['OCR_API_URL']

                                print(f"OCR API URL: {ocr_api_url}")
                                print(f"使用API密钥: {ocr_api_key[:10]}...")  # 只显示密钥前10个字符

                                # 尝试方法1：使用multipart/form-data格式发送文件
                                try:
                                    with open(file_path, 'rb') as f:
                                        files = {'file': (filename, f, 'image/jpeg')}
                                        data = {
                                            'apikey': ocr_api_key,
                                            'language': 'chs',
                                            'detectOrientation': 'true',
                                            'scale': 'true',
                                            'OCREngine': 2
                                        }

                                        print("发送OCR请求（方法1）...")
                                        response = requests.post(
                                            ocr_api_url,
                                            files=files,
                                            data=data,
                                            timeout=30  # 添加超时设置
                                        )

                                        print(f"OCR响应状态码: {response.status_code}")

                                        if response.status_code == 200:
                                            result = response.json()
                                            print(f"OCR响应内容: {result}")

                                            if result.get('IsErroredOnProcessing') is False and result.get(
                                                    'ParsedResults'):
                                                parsed_text = result['ParsedResults'][0]['ParsedText']
                                                print(f"识别到的文本: {parsed_text[:100]}...")  # 只显示前100个字符

                                                # 更新数据库
                                                question = ErrorQuestion.query.get(question_id)
                                                question.content = parsed_text
                                                db.session.commit()
                                                print("OCR识别结果已保存到数据库")
                                                return
                                            else:
                                                error_message = result.get('ErrorMessage', '未知错误')
                                                print(f"OCR处理失败: {error_message}")
                                        else:
                                            print(f"OCR API调用失败: {response.text}")
                                except Exception as e:
                                    print(f"方法1失败: {str(e)}")

                                # 尝试方法2：使用base64编码发送文件
                                try:
                                    import base64

                                    with open(file_path, 'rb') as f:
                                        file_content = f.read()
                                        base64_content = base64.b64encode(file_content).decode('utf-8')

                                    data = {
                                        'apikey': ocr_api_key,
                                        'language': 'chs',
                                        'detectOrientation': 'true',
                                        'scale': 'true',
                                        'OCREngine': 2,
                                        'base64Image': f'data:image/jpeg;base64,{base64_content}'
                                    }

                                    print("发送OCR请求（方法2）...")
                                    response = requests.post(
                                        ocr_api_url,
                                        json=data,
                                        timeout=30  # 添加超时设置
                                    )

                                    print(f"OCR响应状态码: {response.status_code}")

                                    if response.status_code == 200:
                                        result = response.json()
                                        print(f"OCR响应内容: {result}")

                                        if result.get('IsErroredOnProcessing') is False and result.get('ParsedResults'):
                                            parsed_text = result['ParsedResults'][0]['ParsedText']
                                            print(f"识别到的文本: {parsed_text[:100]}...")  # 只显示前100个字符

                                            # 更新数据库
                                            question = ErrorQuestion.query.get(question_id)
                                            question.content = parsed_text
                                            db.session.commit()
                                            print("OCR识别结果已保存到数据库")
                                            return
                                        else:
                                            error_message = result.get('ErrorMessage', '未知错误')
                                            print(f"OCR处理失败: {error_message}")
                                    else:
                                        print(f"OCR API调用失败: {response.text}")
                                except Exception as e:
                                    print(f"方法2失败: {str(e)}")

                                # 如果两种方法都失败，设置一个默认内容
                                print("所有OCR方法都失败，设置默认内容")
                                question = ErrorQuestion.query.get(question_id)
                                question.content = "OCR识别失败，请手动编辑内容"
                                db.session.commit()

                        except Exception as e:
                            print(f"OCR处理异常: {str(e)}")
                            import traceback
                            traceback.print_exc()  # 打印完整的异常堆栈

                    # 启动线程处理OCR，将需要的参数传入
                    thread = Thread(target=process_ocr, args=(new_question.id, file_path, filename))
                    thread.daemon = True  # 设置为守护线程，主线程退出时自动结束
                    thread.start()

                    flash('文件上传成功，正在识别内容...')
                except Exception as e:
                    print(f"启动OCR处理线程异常: {str(e)}")
                    flash(f'文件上传成功，但启动识别时发生错误: {str(e)}')

            # 跳转到编辑页面
            return redirect(url_for('main.edit_question', question_id=new_question.id))
        else:
            flash('不支持的文件类型，请上传JPG、PNG或PDF格式的文件')
            return redirect(request.url)

    # GET 请求时返回上传页面
    return render_template('upload_question.html')

@bp.route('/edit_question/<int:question_id>', methods=['GET', 'POST'])
def edit_question(question_id):
    """编辑错题信息"""
    question = ErrorQuestion.query.get_or_404(question_id)

    if request.method == 'POST':
        question.subject = request.form.get('subject')
        question.grade = request.form.get('grade')
        question.exam = request.form.get('exam')
        question.reason = request.form.get('reason')
        question.note = request.form.get('note')

        # 如果用户修改了识别内容
        if 'content' in request.form:
            question.content = request.form.get('content')

        db.session.commit()
        flash('错题信息已保存')
        return redirect(url_for('main.error_questions'))

    return render_template('edit_question.html', question=question)


@bp.route('/view_question/<int:question_id>')
def view_question(question_id):
    """查看错题文件"""
    question = ErrorQuestion.query.get_or_404(question_id)
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], question.file_path)

    if not os.path.exists(file_path):
        abort(404)

    return send_from_directory(current_app.config['UPLOAD_FOLDER'], question.file_path)


@bp.route('/error_questions')
def error_questions():
    """查看所有错题"""
    # 获取筛选参数
    subject = request.args.get('subject', '')
    grade = request.args.get('grade', '')

    # 构建查询
    query = ErrorQuestion.query.order_by(ErrorQuestion.upload_time.desc())

    # 应用筛选
    if subject:
        query = query.filter(ErrorQuestion.subject == subject)
    if grade:
        query = query.filter(ErrorQuestion.grade == grade)

    questions = query.all()

    # 获取所有科目和年级用于筛选
    subjects = db.session.query(ErrorQuestion.subject).distinct().all()
    grades = db.session.query(ErrorQuestion.grade).distinct().all()

    return render_template('error_questions.html',
                           questions=questions,
                           subjects=[s[0] for s in subjects if s[0]],
                           grades=[g[0] for g in grades if g[0]],
                           current_subject=subject,
                           current_grade=grade)


@bp.route('/import_scores', methods=['GET', 'POST'])
def import_scores():
    """导入成绩文件（支持Excel、CSV、JSON）"""
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('没有文件部分')
            return redirect(request.url)

        file = request.files['file']

        if file.filename == '':
            flash('没有选择文件')
            return redirect(request.url)

        # 检查文件类型
        if file and allowed_file(file.filename, 'score'):
            try:
                filename = secure_filename(file.filename)
                file_ext = os.path.splitext(filename)[1].lower()

                # 根据文件类型读取数据
                if file_ext in ['.xlsx', '.xls']:
                    df = pd.read_excel(file.stream)
                elif file_ext == '.csv':
                    df = pd.read_csv(file.stream)
                elif file_ext == '.json':
                    df = pd.read_json(file.stream)
                else:
                    flash('不支持的文件类型')
                    return redirect(request.url)

                # 检查必要的列是否存在
                required_columns = ['grade', 'examType', 'date']
                missing_columns = [col for col in required_columns if col not in df.columns]
                if missing_columns:
                    flash(f'文件缺少必要的列: {", ".join(missing_columns)}')
                    return redirect(request.url)

                # 导入数据
                imported_count = 0
                for _, row in df.iterrows():
                    # 转换日期格式
                    try:
                        date = pd.to_datetime(row['date']).date()
                    except:
                        flash(f'日期格式错误: {row["date"]}，跳过此行')
                        continue

                    # 创建成绩记录
                    score = ExamScore(
                        grade=row['grade'],
                        exam_type=row['examType'],
                        date=date,
                        chinese=row.get('chinese'),
                        math=row.get('math'),
                        english=row.get('english'),
                        physics=row.get('physics'),
                        chemistry=row.get('chemistry'),
                        history=row.get('history'),
                        politics=row.get('politics'),
                        geography=row.get('geography'),
                        biology=row.get('biology'),
                        sports=row.get('sports'),
                        note=row.get('note')
                    )
                    db.session.add(score)
                    imported_count += 1

                db.session.commit()
                flash(f'成功导入 {imported_count} 条成绩记录')
                return redirect(url_for('main.grade_analysis'))
            except Exception as e:
                flash(f'导入失败: {str(e)}')
                return redirect(request.url)
        else:
            flash('不支持的文件类型，请上传Excel、CSV或JSON格式的文件')
            return redirect(request.url)

    return render_template('import_scores.html')

@bp.route('/grade_analysis')
def grade_analysis():
    """成绩分析页面"""
    # 使用分页查询，减少一次性加载的数据量
    page = request.args.get('page', 1, type=int)
    per_page = 10  # 每页显示10条记录

    # 获取考试记录，按日期倒序排列
    exams_pagination = ExamScore.query.order_by(ExamScore.date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    exams = exams_pagination.items

    # 获取错题记录，限制数量
    questions = ErrorQuestion.query.limit(50).all()  # 最多加载50条错题记录

    return render_template('grade_analysis.html',
                           exams=exams,
                           questions=questions,
                           pagination=exams_pagination)


@bp.route('/generate_analysis', methods=['POST'])
def generate_analysis():
    """生成分析报告"""
    try:
        data = request.get_json()
        exam_ids = data.get('exam_ids', [])
        question_ids = data.get('question_ids', [])

        current_app.logger.info(f"收到分析请求: exam_ids={exam_ids}, question_ids={question_ids}")
        print(f"收到分析请求: exam_ids={exam_ids}, question_ids={question_ids}")

        if not exam_ids and not question_ids:
            return jsonify({'status': 'error', 'message': '请至少选择一项考试或错题'})

        # 获取选中的考试数据
        exams = []
        if exam_ids:
            exams = ExamScore.query.filter(ExamScore.id.in_(exam_ids)).all()
            current_app.logger.info(f"找到 {len(exams)} 个考试记录")
            print(f"找到 {len(exams)} 个考试记录")

        # 获取选中的错题数据
        questions = []
        if question_ids:
            questions = ErrorQuestion.query.filter(ErrorQuestion.id.in_(question_ids)).all()
            current_app.logger.info(f"找到 {len(questions)} 个错题记录")
            print(f"找到 {len(questions)} 个错题记录")

        # 准备发送给API的内容
        content = "请基于以下考试成绩和错题信息进行学习分析：\n\n"

        # 添加考试成绩信息
        if exams:
            content += "考试成绩信息：\n"
            for exam in exams:
                content += f"- {exam.grade} {exam.exam_type} ({exam.date}):\n"
                content += f"  语文: {exam.chinese if exam.chinese else '无'}\n"
                content += f"  数学: {exam.math if exam.math else '无'}\n"
                content += f"  英语: {exam.english if exam.english else '无'}\n"
                content += f"  物理: {exam.physics if exam.physics else '无'}\n"
                content += f"  化学: {exam.chemistry if exam.chemistry else '无'}\n"
                content += f"  历史: {exam.history if exam.history else '无'}\n"
                content += f"  政治: {exam.politics if exam.politics else '无'}\n"
                content += f"  地理: {exam.geography if exam.geography else '无'}\n"
                content += f"  生物: {exam.biology if exam.biology else '无'}\n"

        # 添加错题信息
        if questions:
            content += "\n错题信息：\n"
            for question in questions:
                content += f"- {question.subject} ({question.grade} {question.exam}):\n"
                content += f"  内容摘要: {question.content[:100] if question.content else '无内容'}...\n"
                content += f"  错误原因: {question.reason if question.reason else '无'}\n"

        # 添加特定指令，要求返回结构化数据
        content += "\n\n请按照以下格式返回分析结果：\n\n"
        content += "1. 成绩趋势分析：包含每次考试的总分和各科分数\n"
        content += "2. 学科对比分析：包含各科目的对比分析\n"
        content += "3. 错题类型分析：包含各类错误原因的百分比\n"
        content += "4. 学习建议：包含具体的学习建议\n\n"
        content += "请使用Markdown格式返回，并在分析末尾添加以下结构化数据块：\n\n"
        content += "```\n"
        content += "成绩趋势数据：\n"
        content += "- 考试1名称: 总分\n"
        content += "- 考试2名称: 总分\n"
        content += "```\n\n"
        content += "```\n"
        content += "学科对比数据：\n"
        content += "- 语文: 分数\n"
        content += "- 数学: 分数\n"
        content += "- 英语: 分数\n"
        content += "```\n\n"
        content += "```\n"
        content += "错题类型数据：\n"
        content += "- 概念不清: 百分比%\n"
        content += "- 计算错误: 百分比%\n"
        content += "- 审题失误: 百分比%\n"
        content += "- 方法不当: 百分比%\n"
        content += "- 知识点盲区: 百分比%\n"
        content += "```\n\n"

        # 调用Deepseek API生成分析
        try:
            deepseek_api_key = current_app.config.get('DEEPSEEK_API_KEY')
            deepseek_api_url = current_app.config.get('DEEPSEEK_API_URL',
                                                      'https://api.deepseek.com/v1/chat/completions')

            if not deepseek_api_key:
                return jsonify({
                    'status': 'error',
                    'message': '请先在config.py中配置DEEPSEEK_API_KEY'
                })

            print(f"调用Deepseek API: {deepseek_api_url}")
            print(f"发送请求内容: {content[:500]}...")  # 只打印前500个字符

            # 构建请求数据
            request_data = {
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "system",
                        "content": "你是初中生学习分析智能体 \"学析优\"，依托考试成绩与错题库，需分析成绩真实性（趋势/横纵对比）、学科/知识点长短板及成因，给提优建议（优势拓展/短板补漏），定分阶段训练方案，交互需可视化、语言鼓励。请按照用户要求的格式返回分析结果，包含结构化数据。"
                    },
                    {
                        "role": "user",
                        "content": content
                    }
                ]
            }

            print(f"请求数据: {request_data}")

            response = requests.post(
                deepseek_api_url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {deepseek_api_key}'
                },
                json=request_data,
                timeout=60  # 添加超时设置
            )

            print(f"API响应状态: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"API响应内容: {result}")

                # 添加更多的错误检查
                if (result and
                        'choices' in result and
                        result['choices'] and
                        isinstance(result['choices'], list) and
                        len(result['choices']) > 0 and
                        'message' in result['choices'][0] and
                        'content' in result['choices'][0]['message']):

                    analysis_content = result['choices'][0]['message']['content']
                    print(f"获取到的分析内容: {analysis_content[:500]}...")  # 只打印前500个字符

                    # 尝试提取结构化数据
                    extracted_data = extract_structured_data(analysis_content)
                    print(f"提取的结构化数据: {extracted_data}")

                    # 如果没有提取到结构化数据，从分析内容中生成
                    if not extracted_data['score_trend'] and not extracted_data['subject_compare'] and not \
                    extracted_data['error_category']:
                        print("没有提取到结构化数据，从分析内容中生成")
                        extracted_data = generate_structured_data_from_content(analysis_content, exams, questions)
                        print(f"生成的结构化数据: {extracted_data}")

                    # 将提取的数据添加到分析内容中
                    analysis_content += "\n\n### 结构化数据\n\n"
                    analysis_content += "```\n"
                    analysis_content += f"成绩趋势数据: {extracted_data.get('score_trend', {})}\n\n"
                    analysis_content += f"学科对比数据: {extracted_data.get('subject_compare', {})}\n\n"
                    analysis_content += f"错题类型数据: {extracted_data.get('error_category', {})}\n"
                    analysis_content += "```\n"
                else:
                    print("API响应格式不正确，使用模拟分析")
                    analysis_content = generate_mock_analysis(exams, questions)

                # 保存分析结果
                title = f"学习分析报告 ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
                new_analysis = AnalysisResult(
                    title=title,
                    content=analysis_content,
                    related_exams=','.join(map(str, exam_ids)),
                    related_questions=','.join(map(str, question_ids))
                )
                db.session.add(new_analysis)
                db.session.commit()

                print(f"保存的分析内容: {analysis_content[:500]}...")  # 打印前500个字符

                return jsonify({
                    'status': 'success',
                    'analysis_id': new_analysis.id
                })
            else:
                print(f"API调用失败: {response.text}")
                return jsonify({
                    'status': 'error',
                    'message': f'API调用失败: {response.text}'
                })
        except requests.exceptions.Timeout:
            print("API请求超时")
            return jsonify({
                'status': 'error',
                'message': 'API请求超时，请稍后重试'
            })
        except requests.exceptions.RequestException as e:
            print(f"API请求异常: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'API请求异常: {str(e)}'
            })
        except Exception as e:
            print(f"API调用异常: {str(e)}")
            import traceback
            traceback.print_exc()  # 打印完整的异常堆栈
            return jsonify({
                'status': 'error',
                'message': f'API调用异常: {str(e)}'
            })

    except Exception as e:
        print(f"生成分析报告异常: {str(e)}")
        import traceback
        traceback.print_exc()  # 打印完整的异常堆栈
        return jsonify({
            'status': 'error',
            'message': f'生成分析报告失败: {str(e)}'
        })

def generate_structured_data_from_content(content, exams, questions):
    """从分析内容中生成结构化数据"""
    data = {
        'score_trend': {},
        'subject_compare': {},
        'error_category': {}
    }

    # 从分析内容中提取成绩趋势数据
    score_trend_match = re.search(r'成绩趋势分析[\s\S]*?(?=\n\n##|\n###|$)', content)
    if score_trend_match:
        score_trend_text = score_trend_match.group(0)

        # 尝试提取考试名称和分数
        exam_scores = []
        for exam in exams:
            # 尝试在分析内容中找到该考试的总分
            exam_score_match = re.search(rf'{exam.exam_type}.*?(\d+)分', score_trend_text)
            if exam_score_match:
                exam_scores.append((exam.exam_type, int(exam_score_match.group(1))))

        # 如果没有找到，使用计算的总分
        if not exam_scores:
            subjects = ['chinese', 'math', 'english', 'physics', 'chemistry', 'history', 'politics', 'geography',
                        'biology']
            for exam in exams:
                total_score = sum(
                    [getattr(exam, subject) for subject in subjects if getattr(exam, subject) is not None])
                exam_scores.append((exam.exam_type, total_score))

        # 添加到数据中
        for exam_name, score in exam_scores:
            data['score_trend'][exam_name] = score

    # 从分析内容中提取学科对比数据
    subject_compare_match = re.search(r'学科能力对比[\s\S]*?(?=\n\n##|\n###|$)', content)
    if subject_compare_match:
        subject_compare_text = subject_compare_match.group(0)

        # 尝试提取各科分数
        subjects = ['语文', '数学', '英语']
        for subject in subjects:
            subject_score_match = re.search(rf'{subject}.*?(\d+)分', subject_compare_text)
            if subject_score_match:
                data['subject_compare'][subject] = int(subject_score_match.group(1))

    # 如果没有找到，使用最后一次考试的数据
    if not data['subject_compare'] and exams:
        last_exam = exams[0]  # 假设 exams 是按时间倒序排列的
        subjects = ['chinese', 'math', 'english']
        subject_names = ['语文', '数学', '英语']

        for subject, name in zip(subjects, subject_names):
            score = getattr(last_exam, subject)
            if score is not None:
                data['subject_compare'][name] = score

    # 从分析内容中提取错题类型数据
    error_category_match = re.search(r'错题类型分析[\s\S]*?(?=\n\n##|\n###|$)', content)
    if error_category_match:
        error_category_text = error_category_match.group(0)

        # 统计错题原因
        reason_counts = {}
        for question in questions:
            reason = question.reason if question.reason else '其他原因'
            reason_counts[reason] = reason_counts.get(reason, 0) + 1

        # 计算百分比
        total = sum(reason_counts.values())
        if total > 0:
            for reason, count in reason_counts.items():
                data['error_category'][reason] = int((count / total) * 100)

    return data

def extract_structured_data(content):
    """从分析内容中提取结构化数据"""
    data = {
        'score_trend': {
            'labels': [],
            'datasets': []
        },
        'subject_compare': {
            'labels': [],
            'datasets': []
        },
        'error_category': {
            'labels': [],
            'datasets': []
        }
    }

    print(f"开始提取结构化数据，内容类型: {type(content)}")

    # 提取成绩趋势数据
    score_trend_match = re.search(r'成绩趋势数据：[\s\S]*?(?=\n\n```|\n###|$)', content)
    if score_trend_match:
        score_trend_text = score_trend_match.group(0)
        print(f"找到成绩趋势数据: {score_trend_text}")

        # 直接使用 finditer 进行匹配
        for match in re.finditer(r'- (.*?): (\d+)', score_trend_text):
            exam_name, score = match.groups()
            print(f"提取到成绩数据: {exam_name} = {score}")
            data['score_trend']['labels'].append(exam_name)
            data['score_trend']['datasets'].append(int(score))
    else:
        print("未找到成绩趋势数据")

    # 提取学科对比数据
    subject_compare_match = re.search(r'学科对比数据：[\s\S]*?(?=\n\n```|\n###|$)', content)
    if subject_compare_match:
        subject_compare_text = subject_compare_match.group(0)
        print(f"找到学科对比数据: {subject_compare_text}")

        # 直接使用 finditer 进行匹配
        for match in re.finditer(r'- (.*?): (\d+)', subject_compare_text):
            subject, score = match.groups()
            print(f"提取到学科数据: {subject} = {score}")
            data['subject_compare']['labels'].append(subject)
            data['subject_compare']['datasets'].append(int(score))
    else:
        print("未找到学科对比数据")

    # 提取错题类型数据
    error_category_match = re.search(r'错题类型数据：[\s\S]*?(?=\n\n```|\n###|$)', content)
    if error_category_match:
        error_category_text = error_category_match.group(0)
        print(f"找到错题类型数据: {error_category_text}")

        # 直接使用 finditer 进行匹配
        for match in re.finditer(r'- (.*?): (\d+)%', error_category_text):
            error_type, percentage = match.groups()
            print(f"提取到错题类型数据: {error_type} = {percentage}")
            data['error_category']['labels'].append(error_type)
            data['error_category']['datasets'].append(int(percentage))
    else:
        print("未找到错题类型数据")

    print(f"最终提取的数据: {data}")
    return data

@bp.route('/view_analysis/<int:analysis_id>')
def view_analysis(analysis_id):
    """查看分析结果"""
    analysis = AnalysisResult.query.get_or_404(analysis_id)
    return render_template('analysis_result.html', analysis=analysis)

@bp.route('/analysis_results')
def analysis_results():
    """查看所有分析结果"""
    analyses = AnalysisResult.query.order_by(AnalysisResult.create_time.desc()).all()
    return render_template('analysis_results.html', analyses=analyses)

def generate_mock_analysis(exams, questions):
    """生成模拟分析内容"""
    analysis = "# 学习分析报告\n\n"

    # 分析成绩趋势
    if exams:
        analysis += "## 成绩趋势分析\n\n"
        analysis += "根据您提供的考试成绩数据，可以看出以下趋势：\n\n"

        # 计算各科平均分
        subjects = ['chinese', 'math', 'english', 'physics', 'chemistry', 'history', 'politics', 'geography', 'biology']
        subject_names = ['语文', '数学', '英语', '物理', '化学', '历史', '政治', '地理', '生物']

        subject_scores = {}
        for subject, name in zip(subjects, subject_names):
            scores = [getattr(exam, subject) for exam in exams if getattr(exam, subject) is not None]
            if scores:
                subject_scores[name] = sum(scores) / len(scores)

        if subject_scores:
            # 找出最高分和最低分的科目
            best_subject = max(subject_scores, key=subject_scores.get)
            worst_subject = min(subject_scores, key=subject_scores.get)

            analysis += f"- **优势学科**：{best_subject}（平均分：{subject_scores[best_subject]:.1f}）\n"
            analysis += f"- **薄弱学科**：{worst_subject}（平均分：{subject_scores[worst_subject]:.1f}）\n\n"

        analysis += "建议您继续保持优势学科的学习势头，同时加强薄弱学科的复习和练习。\n\n"

        # 添加具体的成绩趋势数据，便于图表提取
        analysis += "### 成绩趋势数据\n\n"
        for exam in exams:
            total_score = sum([getattr(exam, subject) for subject in subjects if getattr(exam, subject) is not None])
            analysis += f"- {exam.exam_type}: {total_score}分\n"
        analysis += "\n"

    # 分析错题类型
    if questions:
        analysis += "## 错题类型分析\n\n"

        # 统计错题原因
        reason_counts = {}
        for question in questions:
            reason = question.reason if question.reason else '其他原因'
            reason_counts[reason] = reason_counts.get(reason, 0) + 1

        if reason_counts:
            # 计算百分比
            total = sum(reason_counts.values())
            analysis += "根据错题分析，您各类型错误的比例如下：\n\n"

            for reason, count in reason_counts.items():
                percentage = (count / total) * 100
                analysis += f"- {reason}: {percentage:.0f}%\n"
            analysis += "\n"

            # 找出最常见的错误原因
            most_common_reason = max(reason_counts, key=reason_counts.get)
            analysis += f"您最常见的错误原因是：**{most_common_reason}**。\n\n"

            # 提供建议
            if most_common_reason == '概念不清':
                analysis += "建议您加强对基础概念的理解，可以通过阅读教材、观看相关视频课程或请教老师同学来澄清概念。\n\n"
            elif most_common_reason == '计算错误':
                analysis += "建议您加强计算练习，提高计算的准确性和速度。可以每天安排一定时间进行专项计算训练。\n\n"
            elif most_common_reason == '审题失误':
                analysis += "建议您在答题前仔细阅读题目，标记关键词，确保完全理解题意后再开始作答。\n\n"
            elif most_common_reason == '方法不当':
                analysis += "建议您学习更多的解题方法和技巧，可以通过做典型例题、总结解题思路来提高。\n\n"
            elif most_common_reason == '知识点盲区':
                analysis += "建议您系统复习相关知识点，找出自己的知识盲区，有针对性地进行补充学习。\n\n"
            else:
                analysis += "建议您分析错题的具体原因，有针对性地进行改进。\n\n"

    # 学科能力对比
    if exams:
        analysis += "## 学科能力对比\n\n"
        analysis += "根据最近的考试成绩，您的各科能力对比如下：\n\n"

        # 提取各科目的成绩变化
        subjects = ['语文', '数学', '英语']
        subject_scores = {}

        for exam in exams:
            for subject, name in zip(subjects, subjects):
                score = getattr(exam, subject)
                if score is not None:
                    subject_scores[name] = subject_scores.get(name, []) + [score]

        # 构建学科对比数据
        for subject, scores in subject_scores.items():
            if scores:
                # 计算趋势
                if len(scores) >= 2:
                    trend = "上升" if scores[-1] > scores[0] else "下降" if scores[-1] < scores[0] else "稳定"
                    analysis += f"- **{subject}** ({trend})：{scores}\n"
                else:
                    analysis += f"- **{subject}**：{scores}\n"
        analysis += "\n"

    # 学习建议
    analysis += "## 学习建议\n\n"
    analysis += "1. **制定合理的学习计划**：根据自己的学习情况和目标，制定长期和短期的学习计划，合理安排时间。\n\n"
    analysis += "2. **注重基础知识的掌握**：加强对基础概念、公式和定理的理解和记忆，这是提高学习成绩的基础。\n\n"
    analysis += "3. **多做练习，及时总结**：通过大量的练习来巩固所学知识，同时及时总结解题方法和技巧。\n\n"
    analysis += "4. **错题集的利用**：定期复习错题，分析错误原因，避免重复犯错。\n\n"
    analysis += "5. **保持良好的学习习惯**：养成课前预习、课上认真听讲、课后及时复习的良好习惯。\n\n"

    # 阶段性学习计划
    analysis += "## 阶段性学习计划\n\n"
    analysis += "### 第一阶段（1-2周）\n"
    analysis += "- 系统复习近期所学知识点，找出自己的薄弱环节\n"
    analysis += "- 针对薄弱环节进行专项练习\n"
    analysis += "- 整理错题集，分析错误原因\n\n"

    analysis += "### 第二阶段（3-4周）\n"
    analysis += "- 加强综合练习，提高解题能力\n"
    analysis += "- 定期进行模拟测试，检验学习效果\n"
    analysis += "- 根据测试结果调整学习重点\n\n"

    analysis += "### 第三阶段（5-6周）\n"
    analysis += "- 全面复习，查漏补缺\n"
    analysis += "- 重点复习易错知识点和题型\n"
    analysis += "- 调整心态，保持良好的学习状态\n\n"

    analysis += "希望这份分析报告对您有所帮助！祝您学习进步！"

    return analysis
