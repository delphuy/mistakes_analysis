from datetime import datetime
from . import db

class ErrorQuestion(db.Model):
    """错题模型"""
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)  # 原始文件名
    file_path = db.Column(db.String(255), nullable=False)  # 存储路径
    file_type = db.Column(db.String(10), nullable=False)  # 文件类型：image或pdf
    content = db.Column(db.Text)  # 识别的内容
    subject = db.Column(db.String(50))  # 科目
    grade = db.Column(db.String(20))  # 年级
    exam = db.Column(db.String(100))  # 考试名称
    reason = db.Column(db.String(200))  # 收录原因
    note = db.Column(db.Text)  # 备注
    upload_time = db.Column(db.DateTime, default=datetime.utcnow)  # 上传时间
    
    def __repr__(self):
        return f'<ErrorQuestion {self.filename}>'

class ExamScore(db.Model):
    """考试成绩模型"""
    id = db.Column(db.Integer, primary_key=True)
    grade = db.Column(db.String(20), nullable=False)  # 年级
    exam_type = db.Column(db.String(50), nullable=False)  # 考试类型
    date = db.Column(db.Date, nullable=False)  # 考试日期
    chinese = db.Column(db.Float)  # 语文成绩
    math = db.Column(db.Float)  # 数学成绩
    english = db.Column(db.Float)  # 英语成绩
    physics = db.Column(db.Float)  # 物理成绩
    chemistry = db.Column(db.Float)  # 化学成绩
    history = db.Column(db.Float)  # 历史成绩
    politics = db.Column(db.Float)  # 政治成绩
    geography = db.Column(db.Float)  # 地理成绩
    biology = db.Column(db.Float)  # 生物成绩
    sports = db.Column(db.Float)  # 体育成绩
    note = db.Column(db.Text)  # 备注
    import_time = db.Column(db.DateTime, default=datetime.utcnow)  # 导入时间
    
    def __repr__(self):
        return f'<ExamScore {self.grade} {self.exam_type} {self.date}>'

class AnalysisResult(db.Model):
    """分析结果模型"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)  # 报告标题
    content = db.Column(db.Text, nullable=False)  # 分析内容
    related_exams = db.Column(db.String(500))  # 关联的考试ID，用逗号分隔
    related_questions = db.Column(db.String(500))  # 关联的错题ID，用逗号分隔
    create_time = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间
    
    def __repr__(self):
        return f'<AnalysisResult {self.title}>'
