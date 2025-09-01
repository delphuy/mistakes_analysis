// 全局变量
let configData = null;
let mistakesList = [];
let analysesList = [];
const mistakeFileInput = document.getElementById('mistake-file-input');

// DOM元素
const uploadMistakeBtn = document.getElementById('upload-mistake-btn');
const analyzeScoreBtn = document.getElementById('analyze-score-btn');
const uploadModal = document.getElementById('upload-modal');
const analyzeModal = document.getElementById('analyze-modal');
const closeUploadModal = document.getElementById('close-upload-modal');
const closeAnalyzeModal = document.getElementById('close-analyze-modal');
const mistakesTable = document.getElementById('mistakes-table-body');
const analysesTable = document.getElementById('analyses-table-body');
const uploadForm = document.getElementById('upload-form');
const analyzeForm = document.getElementById('analyze-form');
const fileInput = document.getElementById('file-input');
const filePreview = document.getElementById('file-preview');
const uploadProgress = document.getElementById('upload-progress');
const ocrContent = document.getElementById('ocr-content');
const generateAnalysisBtn = document.getElementById('generate-analysis-btn');
const analysisProgress = document.getElementById('analysis-progress');

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 加载配置数据
        await loadConfigData();
        
        // 加载历史错题
        await loadMistakesList();
        
        // 加载历史分析报告
        await loadAnalysesList();
        
        // 初始化表单
        initForms();
        
    } catch (error) {
        console.error('页面初始化失败:', error);
        showNotification('页面加载失败，请刷新重试', 'error');
    }
});

// 加载配置数据
async function loadConfigData() {
    try {
        configData = await apiRequest('/config');
        
        // 填充年级下拉框
        const gradeSelect = document.getElementById('grade-select');
        const examTypeSelect = document.getElementById('exam-type-select');
        const subjectSelect = document.getElementById('subject-select');
        const analyzeExamSelect = document.getElementById('analyze-exam-select');
        
        // 填充年级
        configData.grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
        
        // 填充考试类型
        configData.examTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            examTypeSelect.appendChild(option);
        });
        
        // 填充科目
        configData.subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.key;
            option.textContent = subject.name;
            option.dataset.name = subject.name;
            subjectSelect.appendChild(option);
        });
        
        // 加载考试列表填充分析表单
        const exams = await apiRequest('/exams');
        exams.forEach(exam => {
            const option = document.createElement('option');
            option.value = exam.id;
            option.textContent = `${exam.examType} (${formatDate(exam.date)})`;
            analyzeExamSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('加载配置数据失败:', error);
        throw error;
    }
}

// 加载历史错题列表
async function loadMistakesList() {
    try {
        const mistakesContainer = document.getElementById('mistakes-table-container');
        showLoading(mistakesContainer);
        
        mistakesList = await apiRequest('/mistakes');
        
        if (mistakesList.length === 0) {
            mistakesTable.parentElement.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-6 text-gray-400">
                        <i class="fa fa-file-text-o text-2xl mb-2"></i>
                        <p>暂无错题记录</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // 清空表格
        mistakesTable.innerHTML = '';
        
        // 填充表格
        mistakesList.forEach(mistake => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors';
            
            row.innerHTML = `
                <td class="py-3 px-4">${mistake.subjectName || '-'}</td>
                <td class="py-3 px-4">${mistake.grade || '-'}</td>
                <td class="py-3 px-4">${mistake.examType || '-'}</td>
                <td class="py-3 px-4 truncate max-w-[150px]">${mistake.fileName || '-'}</td>
                <td class="py-3 px-4">${formatDate(mistake.createdAt)}</td>
                <td class="py-3 px-4">
                    <button class="text-primary hover:text-primary/80 view-mistake-btn" 
                            data-id="${mistake.id}">
                        <i class="fa fa-eye mr-1"></i> 查看
                    </button>
                </td>
            `;
            
            mistakesTable.appendChild(row);
        });
        
        // 添加查看事件监听
        document.querySelectorAll('.view-mistake-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mistakeId = e.currentTarget.dataset.id;
                window.open(`view-mistake.html?id=${mistakeId}`, '_blank');
            });
        });
        
    } catch (error) {
        console.error('加载错题列表失败:', error);
        showError(mistakesContainer, '加载错题记录失败');
    }
}

// 加载历史分析报告列表
async function loadAnalysesList() {
    try {
        const analysesContainer = document.getElementById('analyses-table-container');
        showLoading(analysesContainer);
        
        analysesList = await apiRequest('/analyses');
        
        if (analysesList.length === 0) {
            analysesTable.parentElement.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-6 text-gray-400">
                        <i class="fa fa-bar-chart text-2xl mb-2"></i>
                        <p>暂无分析报告</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // 清空表格
        analysesTable.innerHTML = '';
        
        // 填充表格
        analysesList.forEach(analysis => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors';
            
            row.innerHTML = `
                <td class="py-3 px-4 truncate max-w-[150px]">${analysis.title || '-'}</td>
                <td class="py-3 px-4">${analysis.examType || '-'}</td>
                <td class="py-3 px-4">${formatDate(analysis.createdAt)}</td>
                <td class="py-3 px-4">
                    <button class="text-primary hover:text-primary/80 view-analysis-btn" 
                            data-id="${analysis.id}">
                        <i class="fa fa-eye mr-1"></i> 查看
                    </button>
                </td>
            `;
            
            analysesTable.appendChild(row);
        });
        
        // 添加查看事件监听
        document.querySelectorAll('.view-analysis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const analysisId = e.currentTarget.dataset.id;
                window.open(`view-analysis.html?id=${analysisId}`, '_blank');
            });
        });
        
    } catch (error) {
        console.error('加载分析报告列表失败:', error);
        showError(analysesContainer, '加载分析报告失败');
    }
}

// 初始化表单
function initForms() {
    // 上传文件预览
    mistakeFileInput.addEventListener('change', handleFileSelect);
    
    // 上传按钮点击事件
    uploadMistakeBtn.addEventListener('click', () => {
        uploadModal.classList.remove('hidden');
        // 添加动画
        setTimeout(() => {
            uploadModal.classList.add('modal-visible');
        }, 10);
    });
    // 绑定文件上传区域点击事件（触发文件选择）
    document.getElementById('file-upload-area').addEventListener('click', () => {
        mistakeFileInput.click();
    });
      
    // 分析按钮点击事件
    analyzeScoreBtn.addEventListener('click', () => {
        analyzeModal.classList.remove('hidden');
        // 添加动画
        setTimeout(() => {
            analyzeModal.classList.add('modal-visible');
        }, 10);
    });
    
    // 关闭上传模态框
    closeUploadModal.addEventListener('click', closeUploadModalFunc);
    
    // 关闭分析模态框
    closeAnalyzeModal.addEventListener('click', closeAnalyzeModalFunc);
    
    // 点击模态框外部关闭
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) closeUploadModalFunc();
    });
    
    analyzeModal.addEventListener('click', (e) => {
        if (e.target === analyzeModal) closeAnalyzeModalFunc();
    });
    
    // 提交上传表单
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUploadMistake();
    });
    
    // 生成分析报告
    generateAnalysisBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleGenerateAnalysis();
    });
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) {
        filePreview.innerHTML = '';
        return;
    }

    // 验证文件类型
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/jpg',
        'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
        showNotification('不支持的文件类型，仅支持JPG、PNG、PDF格式', 'error');
        mistakeFileInput.value = '';
        return;
    }

    // 验证文件大小（不超过10MB）
    if (file.size > 10 * 1024 * 1024) {
        showNotification('文件过大，最大支持10MB', 'error');
        mistakeFileInput.value = '';
        return;
    }

    // 显示文件名和上传进度
    document.getElementById('upload-filename').textContent = file.name;
    document.getElementById('upload-progress').classList.remove('hidden');
    document.getElementById('file-upload-area').classList.add('hidden');

    // 调用后端OCR接口（由worker.js处理实际识别逻辑）
    uploadAndRecognizeFile(file);
}

// 处理文件预览
function handleFilePreview(e) {
    const file = e.target.files[0];
    if (!file) {
        filePreview.innerHTML = '';
        return;
    }

    // 验证文件类型
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/jpg',
        'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
        showNotification('不支持的文件类型，仅支持JPG、PNG、PDF格式', 'error');
        fileInput.value = '';
        filePreview.innerHTML = '';
        return;
    }

    // 验证文件大小（补充完整之前的代码）
    if (file.size > 10 * 1024 * 1024) {
        showNotification('文件过大，最大支持10MB', 'error');
        fileInput.value = '';
        filePreview.innerHTML = '';
        return;
    }

    // 显示文件名
    document.getElementById('upload-filename').textContent = file.name;
    document.getElementById('upload-progress').classList.remove('hidden');

    // 模拟上传进度（实际项目中可根据真实进度更新）
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        document.getElementById('upload-progress-bar').style.width = `${progress}%`;
        document.getElementById('upload-percentage').textContent = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            // 上传完成后调用OCR识别
            handleOcrRecognition(file);
        }
    }, 300);
}

// 处理OCR识别
async function handleOcrRecognition(file) {
    try {
        // 显示识别中状态
        document.getElementById('file-upload-area').classList.add('hidden');
        document.getElementById('ocr-processing').classList.remove('hidden');
        document.getElementById('upload-progress').classList.add('hidden');

        // 构建FormData（ocr.space API要求multipart/form-data格式）
        const formData = new FormData();
        formData.append('image', file);
        formData.append('apikey', configData.ocr.api_key); // 从configData获取API密钥
        formData.append('language', 'chs'); // 中文识别
        formData.append('isOverlayRequired', 'false');

        // 调用ocr.space API
        const response = await fetch(configData.ocr.api_url, {
            method: 'POST',
            body: formData,
            timeout: API_CONFIG.timeout
        });

        const result = await response.json();

        // 处理识别结果
        if (result.IsErroredOnProcessing) {
            throw new Error(`识别失败: ${result.ErrorDetails}`);
        }

        // 提取识别文本（取第一个结果）
        const ocrText = result.ParsedResults?.[0]?.ParsedText || '';
        
        // 填充识别内容到表单
        document.getElementById('recognized-content').value = ocrText;

        // 隐藏识别中状态，显示表单内容
        document.getElementById('ocr-processing').classList.add('hidden');
        document.getElementById('mistake-form').classList.remove('hidden');

    } catch (error) {
        console.error('OCR识别失败:', error);
        showNotification(`识别失败: ${error.message}`, 'error');
        // 恢复上传区域显示
        document.getElementById('file-upload-area').classList.remove('hidden');
        document.getElementById('ocr-processing').classList.add('hidden');
    }
}

// 上传文件并调用后端OCR接口
async function uploadAndRecognizeFile(file) {
    try {
        // 构建FormData
        const formData = new FormData();
        formData.append('file', file);

        // 显示上传进度（模拟，实际可通过XMLHttpRequest监听进度）
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + 10, 90); // 预留10%给后端处理
            document.getElementById('upload-progress-bar').style.width = `${progress}%`;
            document.getElementById('upload-percentage').textContent = `${progress}%`;
        }, 300);

        // 调用后端OCR接口（worker.js提供的端点）
        const response = await apiRequest('/ocr/recognize', 'POST', formData, {
            // 覆盖默认Content-Type，让浏览器自动设置multipart/form-data边界
            headers: {}
        });

        clearInterval(progressInterval);
        // 进度设为100%
        document.getElementById('upload-progress-bar').style.width = '100%';
        document.getElementById('upload-percentage').textContent = '100%';

        // 隐藏上传进度，显示识别中状态
        setTimeout(() => {
            document.getElementById('upload-progress').classList.add('hidden');
            document.getElementById('ocr-processing').classList.remove('hidden');
        }, 500);

        // 后端返回识别结果后处理
        if (response.success && response.content) {
            // 隐藏识别中状态，显示表单
            document.getElementById('ocr-processing').classList.add('hidden');
            document.getElementById('mistake-form').classList.remove('hidden');
            // 填充识别内容
            document.getElementById('recognized-content').value = response.content;
            // 启用保存按钮
            document.getElementById('save-mistake').removeAttribute('disabled');
        } else {
            throw new Error(response.message || '识别失败，未返回有效内容');
        }

    } catch (error) {
        console.error('OCR处理失败:', error);
        showNotification(`处理失败: ${error.message}`, 'error');
        // 恢复上传区域
        document.getElementById('file-upload-area').classList.remove('hidden');
        document.getElementById('upload-progress').classList.add('hidden');
        document.getElementById('ocr-processing').classList.add('hidden');
        mistakeFileInput.value = '';
    }
}

// 上传文件并识别内容
async function uploadFileAndRecognize(file) {
    try {
        // 显示上传进度
        uploadProgress.classList.remove('hidden');
        uploadProgress.querySelector('.progress-bar').style.width = '10%';
        
        // 创建FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // 上传文件
        const response = await fetch(`${API_CONFIG.baseUrl}/upload`, {
            method: 'POST',
            body: formData
        });
        
        uploadProgress.querySelector('.progress-bar').style.width = '50%';
        
        if (!response.ok) {
            throw new Error('文件上传失败');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || '文件上传失败');
        }
        
        // 保存文件信息到表单
        const fileInfoInput = document.getElementById('file-info');
        fileInfoInput.value = JSON.stringify(result.data);
        
        uploadProgress.querySelector('.progress-bar').style.width = '60%';
        
        // 识别文件内容
        const ocrResult = await apiRequest('/ocr/recognize', 'POST', {
            fileUrl: result.data.fileUrl
        });
        
        uploadProgress.querySelector('.progress-bar').style.width = '100%';
        
        if (ocrResult.success && ocrResult.content) {
            ocrContent.value = ocrResult.content;
        } else {
            ocrContent.value = '未能识别文件内容，请手动输入';
            showNotification('文件内容识别失败，请手动输入', 'warning');
        }
        
        // 隐藏进度条
        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            uploadProgress.querySelector('.progress-bar').style.width = '0';
        }, 500);
        
    } catch (error) {
        console.error('文件上传和识别失败:', error);
        uploadProgress.classList.add('hidden');
        uploadProgress.querySelector('.progress-bar').style.width = '0';
        showNotification(`文件处理失败: ${error.message}`, 'error');
    }
}

// 处理上传错题
async function handleUploadMistake() {
    try {
        // 获取表单数据
        const subjectSelect = document.getElementById('subject-select');
        const grade = document.getElementById('grade-select').value;
        const examType = document.getElementById('exam-type-select').value;
        const reason = document.getElementById('reason-select').value;
        const notes = document.getElementById('notes-textarea').value;
        const content = ocrContent.value;
        const fileInfoInput = document.getElementById('file-info');
        
        // 验证表单
        if (!subjectSelect.value || !grade || !examType) {
            showNotification('科目、年级和考试类型为必填项', 'warning');
            return;
        }
        
        if (!fileInfoInput.value) {
            showNotification('请先上传错题文件', 'warning');
            return;
        }
        
        // 构建请求数据
        const mistakeData = {
            subject: subjectSelect.value,
            subjectName: subjectSelect.options[subjectSelect.selectedIndex].dataset.name,
            grade,
            examType,
            reason,
            notes,
            content,
            fileInfo: JSON.parse(fileInfoInput.value)
        };
        
        // 显示加载状态
        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 保存中...';
        
        // 提交数据
        const result = await apiRequest('/mistakes', 'POST', mistakeData);
        
        if (result.success && result.data.mistakeId) {
            showNotification('错题保存成功', 'success');
            
            // 关闭模态框
            closeUploadModalFunc();
            
            // 重置表单
            uploadForm.reset();
            filePreview.innerHTML = '';
            ocrContent.value = '';
            fileInfoInput.value = '';
            fileInput.value = '';
            
            // 重新加载错题列表
            await loadMistakesList();
        } else {
            throw new Error(result.message || '保存错题失败');
        }
        
    } catch (error) {
        console.error('保存错题失败:', error);
        showNotification(`保存失败: ${error.message}`, 'error');
    } finally {
        // 恢复按钮状态
        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '保存错题';
    }
}

// 处理生成分析报告
async function handleGenerateAnalysis() {
    try {
        // 获取表单数据
        const examId = document.getElementById('analyze-exam-select').value;
        const analysisTitle = document.getElementById('analysis-title').value;
        
        // 验证表单
        if (!examId) {
            showNotification('请选择要分析的考试', 'warning');
            return;
        }
        
        if (!analysisTitle) {
            showNotification('请输入分析报告标题', 'warning');
            return;
        }
        
        // 显示加载状态
        generateAnalysisBtn.disabled = true;
        generateAnalysisBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 生成中...';
        analysisProgress.classList.remove('hidden');
        
        // 调用API生成分析报告
        const result = await apiRequest('/analyses', 'POST', {
            examId,
            title: analysisTitle
        });
        
        if (result.success && result.data.analysisId) {
            showNotification('分析报告已开始生成，将在几分钟内完成', 'success');
            
            // 关闭模态框
            closeAnalyzeModalFunc();
            
            // 重置表单
            analyzeForm.reset();
            
            // 重新加载分析报告列表
            await loadAnalysesList();
        } else {
            throw new Error(result.message || '生成分析报告失败');
        }
        
    } catch (error) {
        console.error('生成分析报告失败:', error);
        showNotification(`生成失败: ${error.message}`, 'error');
    } finally {
        // 恢复按钮状态
        generateAnalysisBtn.disabled = false;
        generateAnalysisBtn.innerHTML = '生成分析报告';
        analysisProgress.classList.add('hidden');
    }
}

// 关闭上传模态框
function closeUploadModalFunc() {
    uploadModal.classList.remove('modal-visible');
    setTimeout(() => {
        uploadModal.classList.add('hidden');
    }, 300);
}

// 关闭分析模态框
function closeAnalyzeModalFunc() {
    analyzeModal.classList.remove('modal-visible');
    setTimeout(() => {
        analyzeModal.classList.add('hidden');
    }, 300);
}
    
// 补充apiRequest支持FormData（修改config.js中的apiRequest，此处为适配逻辑）
// 注：实际应在config.js中扩展apiRequest函数，支持自定义headers和FormData
async function apiRequest(endpoint, method = 'GET', data = null, options = {}) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const fetchOptions = {
        method,
        ...options,
        headers: {
            ...(options.headers || {}),
            // 若为FormData，不手动设置Content-Type
            ...(!(data instanceof FormData) && { 'Content-Type': 'application/json' })
        },
        timeout: API_CONFIG.timeout
    };

    if (data && !(data instanceof FormData)) {
        fetchOptions.body = JSON.stringify(data);
    } else if (data instanceof FormData) {
        fetchOptions.body = data;
    }

    try {
        const response = await fetch(url, fetchOptions);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `请求失败: ${response.statusText}`);
        }

        return result;
    } catch (error) {
        console.error(`请求${url}失败:`, error);
        throw error;
    }
}