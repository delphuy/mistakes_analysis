// 全局变量
const API_BASE_URL = 'https://api.mistakes.huigg.xyz/api';
let configData = null;

// DOM 元素
const uploadMistakeCard = document.getElementById('upload-mistake-card');
const analyzeScoresCard = document.getElementById('analyze-scores-card');
const uploadMistakeModal = document.getElementById('upload-mistake-modal');
const analyzeScoresModal = document.getElementById('analyze-scores-modal');
const closeUploadModal = document.getElementById('close-upload-modal');
const closeAnalyzeModal = document.getElementById('close-analyze-modal');
const cancelUpload = document.getElementById('cancel-upload');
const cancelAnalysis = document.getElementById('cancel-analysis');
const fileUploadArea = document.getElementById('file-upload-area');
const mistakeFileInput = document.getElementById('mistake-file-input');
const mistakeForm = document.getElementById('mistake-form');
const analyzeForm = document.getElementById('analyze-form');
const saveMistakeBtn = document.getElementById('save-mistake');
const generateAnalysisBtn = document.getElementById('generate-analysis');
const uploadProgress = document.getElementById('upload-progress');
const uploadFilename = document.getElementById('upload-filename');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadPercentage = document.getElementById('upload-percentage');
const ocrProcessing = document.getElementById('ocr-processing');
const recognizedContent = document.getElementById('recognized-content');
const analysisProcessing = document.getElementById('analysis-processing');
const successToast = document.getElementById('success-toast');
const successMessage = document.getElementById('success-message');

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 加载配置数据
    loadConfigData();
    
    // 加载历史数据
    loadMistakesHistory();
    loadAnalysesHistory();
    
    // 绑定事件监听器
    bindEventListeners();
});

// 绑定事件监听器
function bindEventListeners() {
    // 模态框控制
    uploadMistakeCard.addEventListener('click', openUploadModal);
    analyzeScoresCard.addEventListener('click', openAnalyzeModal);
    closeUploadModal.addEventListener('click', closeUploadModalHandler);
    closeAnalyzeModal.addEventListener('click', closeAnalyzeModalHandler);
    cancelUpload.addEventListener('click', closeUploadModalHandler);
    cancelAnalysis.addEventListener('click', closeAnalyzeModalHandler);
    
    // 文件上传区域
    fileUploadArea.addEventListener('click', () => mistakeFileInput.click());
    mistakeFileInput.addEventListener('change', handleFileSelection);
    fileUploadArea.addEventListener('dragover', handleDragOver);
    fileUploadArea.addEventListener('dragleave', handleDragLeave);
    fileUploadArea.addEventListener('drop', handleFileDrop);
    
    // 表单提交
    mistakeForm.addEventListener('submit', handleMistakeFormSubmit);
    analyzeForm.addEventListener('submit', handleAnalyzeFormSubmit);
}

// 加载配置数据
async function loadConfigData() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        
        if (!response.ok) {
            throw new Error('获取配置数据失败');
        }
        
        configData = await response.json();
        
        // 填充下拉选项
        populateGradeOptions();
        populateExamTypeOptions();
        populateSubjectOptions();
        
        // 加载考试数据（用于成绩分析）
        loadExamData();
        
    } catch (error) {
        console.error('加载配置数据失败:', error);
        showToast(`加载配置失败: ${error.message}`);
    }
}

// 填充年级选项
function populateGradeOptions() {
    const gradeSelect = document.getElementById('mistake-grade');
    if (!gradeSelect || !configData?.grades) return;
    
    configData.grades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        gradeSelect.appendChild(option);
    });
}

// 填充考试类型选项
function populateExamTypeOptions() {
    const examTypeSelect = document.getElementById('mistake-exam-type');
    if (!examTypeSelect || !configData?.examTypes) return;
    
    configData.examTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        examTypeSelect.appendChild(option);
    });
}

// 填充科目选项
function populateSubjectOptions() {
    const subjectSelect = document.getElementById('mistake-subject');
    if (!subjectSelect || !configData?.subjects) return;
    
    configData.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.key;
        option.textContent = subject.name;
        option.dataset.name = subject.name; // 存储科目名称用于后续使用
        subjectSelect.appendChild(option);
    });
}

// 加载考试数据
async function loadExamData() {
    const examSelect = document.getElementById('analysis-exam');
    const examsLoading = document.getElementById('exams-loading');
    const noExams = document.getElementById('no-exams');
    const analyzeFormContainer = document.getElementById('analyze-form-container');
    
    try {
        const response = await fetch(`${API_BASE_URL}/exams`);
        
        if (!response.ok) {
            throw new Error('获取考试数据失败');
        }
        
        const exams = await response.json();
        
        examsLoading.classList.add('hidden');
        
        if (exams.length === 0) {
            noExams.classList.remove('hidden');
            return;
        }
        
        analyzeFormContainer.classList.remove('hidden');
        
        // 填充考试选项
        exams.forEach(exam => {
            const option = document.createElement('option');
            option.value = exam.id;
            option.textContent = `${exam.grade} - ${exam.examType} (${formatDate(exam.date)})`;
            examSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('加载考试数据失败:', error);
        examsLoading.classList.add('hidden');
        noExams.classList.remove('hidden');
        noExams.innerHTML = `
            <i class="fa fa-exclamation-circle text-danger text-5xl mb-4"></i>
            <p class="text-gray-300">加载考试数据失败</p>
            <p class="text-gray-200 text-sm mt-2">${error.message}</p>
            <button onclick="loadExamData()" class="btn-primary mt-4">重试</button>
        `;
    }
}

// 加载历史错题
async function loadMistakesHistory() {
    const mistakesLoading = document.getElementById('mistakes-loading');
    const noMistakes = document.getElementById('no-mistakes');
    const mistakesTableContainer = document.getElementById('mistakes-table-container');
    const mistakesTableBody = document.getElementById('mistakes-table-body');
    
    try {
        const response = await fetch(`${API_BASE_URL}/mistakes`);
        
        if (!response.ok) {
            throw new Error('获取错题数据失败');
        }
        
        const mistakes = await response.json();
        
        mistakesLoading.classList.add('hidden');
        
        if (mistakes.length === 0) {
            noMistakes.classList.remove('hidden');
            return;
        }
        
        mistakesTableContainer.classList.remove('hidden');
        
        // 填充错题表格
        mistakes.forEach(mistake => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';
            
            row.innerHTML = `
                <td class="py-3 whitespace-nowrap">${mistake.subjectName}</td>
                <td class="py-3 whitespace-nowrap">${mistake.grade}</td>
                <td class="py-3 whitespace-nowrap">${mistake.examType}</td>
                <td class="py-3">${mistake.fileName}</td>
                <td class="py-3 whitespace-nowrap">${formatDate(mistake.createdAt)}</td>
                <td class="py-3 whitespace-nowrap">
                    <button onclick="viewMistake('${mistake.id}')" class="text-primary hover:text-primary/80 text-sm">
                        查看
                    </button>
                </td>
            `;
            
            mistakesTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('加载错题历史失败:', error);
        mistakesLoading.classList.add('hidden');
        noMistakes.classList.remove('hidden');
        noMistakes.innerHTML = `
            <i class="fa fa-exclamation-circle text-danger text-5xl mb-4"></i>
            <p class="text-gray-300">加载错题数据失败</p>
            <p class="text-gray-200 text-sm mt-2">${error.message}</p>
            <button onclick="loadMistakesHistory()" class="btn-primary mt-4">重试</button>
        `;
    }
}

// 加载历史分析报告
async function loadAnalysesHistory() {
    const analysesLoading = document.getElementById('analyses-loading');
    const noAnalyses = document.getElementById('no-analyses');
    const analysesTableContainer = document.getElementById('analyses-table-container');
    const analysesTableBody = document.getElementById('analyses-table-body');
    
    try {
        const response = await fetch(`${API_BASE_URL}/analyses`);
        
        if (!response.ok) {
            throw new Error('获取分析报告数据失败');
        }
        
        const analyses = await response.json();
        
        analysesLoading.classList.add('hidden');
        
        if (analyses.length === 0) {
            noAnalyses.classList.remove('hidden');
            return;
        }
        
        analysesTableContainer.classList.remove('hidden');
        
        // 填充分析报告表格
        analyses.forEach(analysis => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';
            
            row.innerHTML = `
                <td class="py-3">${analysis.title}</td>
                <td class="py-3 whitespace-nowrap">${analysis.examType}</td>
                <td class="py-3 whitespace-nowrap">${formatDate(analysis.createdAt)}</td>
                <td class="py-3 whitespace-nowrap">
                    <button onclick="viewAnalysis('${analysis.id}')" class="text-accent hover:text-accent/80 text-sm">
                        查看
                    </button>
                </td>
            `;
            
            analysesTableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('加载分析报告历史失败:', error);
        analysesLoading.classList.add('hidden');
        noAnalyses.classList.remove('hidden');
        noAnalyses.innerHTML = `
            <i class="fa fa-exclamation-circle text-danger text-5xl mb-4"></i>
            <p class="text-gray-300">加载分析报告数据失败</p>
            <p class="text-gray-200 text-sm mt-2">${error.message}</p>
            <button onclick="loadAnalysesHistory()" class="btn-primary mt-4">重试</button>
        `;
    }
}

// 处理文件选择
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// 处理拖放事件
function handleDragOver(event) {
    event.preventDefault();
    fileUploadArea.classList.add('border-primary');
}

function handleDragLeave() {
    fileUploadArea.classList.remove('border-primary');
}

function handleFileDrop(event) {
    event.preventDefault();
    fileUploadArea.classList.remove('border-primary');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
}

// 处理文件上传和OCR识别
function processFile(file) {
    // 验证文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        showToast('请上传PNG、JPG或PDF格式的文件', 'error');
        return;
    }
    
    // 显示上传进度
    uploadFilename.textContent = file.name;
    uploadProgress.classList.remove('hidden');
    uploadProgressBar.style.width = '0%';
    uploadPercentage.textContent = '0%';
    
    // 创建FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // 模拟上传进度
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        uploadProgressBar.style.width = `${progress}%`;
        uploadPercentage.textContent = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // 上传完成后进行OCR识别
            ocrProcessing.classList.remove('hidden');
            
            // 调用API进行OCR识别
            const ocrFormData = new FormData();
            ocrFormData.append('file', file);
            
            // 这里只是模拟，实际会在提交表单时处理
            setTimeout(() => {
                ocrProcessing.classList.add('hidden');
                saveMistakeBtn.disabled = false;
                
                // 实际应用中这里会显示真实的OCR结果
                recognizedContent.value = `正在识别文件内容...\n\n文件名称: ${file.name}\n文件大小: ${(file.size / 1024).toFixed(1)}KB\n文件类型: ${file.type}`;
            }, 1500);
        }
    }, 100);
}

// 处理错题表单提交
async function handleMistakeFormSubmit(event) {
    event.preventDefault();
    
    const file = mistakeFileInput.files[0];
    if (!file) {
        showToast('请先上传文件', 'error');
        return;
    }
    
    // 获取表单数据
    const subjectSelect = document.getElementById('mistake-subject');
    const subject = subjectSelect.value;
    const subjectName = subjectSelect.options[subjectSelect.selectedIndex].dataset.name;
    const grade = document.getElementById('mistake-grade').value;
    const examType = document.getElementById('mistake-exam-type').value;
    const reason = document.getElementById('mistake-reason').value;
    const notes = document.getElementById('mistake-notes').value;
    
    // 验证必填字段
    if (!subject || !grade || !examType) {
        showToast('请填写所有必填字段', 'error');
        return;
    }
    
    // 创建FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('subjectName', subjectName);
    formData.append('grade', grade);
    formData.append('examType', examType);
    formData.append('reason', reason);
    formData.append('notes', notes);
    formData.append('content', recognizedContent.value);
    
    // 显示加载状态
    saveMistakeBtn.disabled = true;
    saveMistakeBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 保存中...';
    
    try {
        // 提交表单数据
        const response = await fetch(`${API_BASE_URL}/mistakes`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || '保存错题失败');
        }
        
        // 显示成功提示
        showToast('错题保存成功');
        
        // 关闭模态框
        closeUploadModalHandler();
        
        // 重置表单
        mistakeForm.reset();
        mistakeFileInput.value = '';
        uploadProgress.classList.add('hidden');
        recognizedContent.value = '';
        
        // 重新加载错题历史
        document.getElementById('mistakes-table-body').innerHTML = '';
        loadMistakesHistory();
        
    } catch (error) {
        console.error('保存错题失败:', error);
        showToast(`保存失败: ${error.message}`, 'error');
        saveMistakeBtn.disabled = false;
        saveMistakeBtn.innerHTML = '保存错题';
    }
}

// 处理分析表单提交
async function handleAnalyzeFormSubmit(event) {
    event.preventDefault();
    
    // 获取表单数据
    const examId = document.getElementById('analysis-exam').value;
    const title = document.getElementById('analysis-title').value;
    
    // 验证字段
    if (!examId || !title) {
        showToast('请填写所有必填字段', 'error');
        return;
    }
    
    // 显示加载状态
    generateAnalysisBtn.disabled = true;
    generateAnalysisBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 生成中...';
    analyzeFormContainer.classList.add('hidden');
    analysisProcessing.classList.remove('hidden');
    
    try {
        // 提交分析请求
        const response = await fetch(`${API_BASE_URL}/analyses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                examId,
                title
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || '生成分析报告失败');
        }
        
        // 显示成功提示
        showToast('分析报告生成成功');
        
        // 关闭模态框
        closeAnalyzeModalHandler();
        
        // 重置表单
        analyzeForm.reset();
        
        // 重新加载分析报告历史
        document.getElementById('analyses-table-body').innerHTML = '';
        loadAnalysesHistory();
        
        // 跳转到分析报告页面
        viewAnalysis(result.analysisId);
        
    } catch (error) {
        console.error('生成分析报告失败:', error);
        showToast(`生成失败: ${error.message}`, 'error');
        analysisProcessing.classList.add('hidden');
        analyzeFormContainer.classList.remove('hidden');
        generateAnalysisBtn.disabled = false;
        generateAnalysisBtn.innerHTML = '生成分析报告';
    }
}

// 打开上传错题模态框
function openUploadModal() {
    uploadMistakeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// 打开成绩分析模态框
function openAnalyzeModal() {
    analyzeScoresModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// 关闭上传错题模态框
function closeUploadModalHandler() {
    uploadMistakeModal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // 重置表单状态
    mistakeForm.reset();
    mistakeFileInput.value = '';
    uploadProgress.classList.add('hidden');
    ocrProcessing.classList.add('hidden');
    recognizedContent.value = '';
    saveMistakeBtn.disabled = true;
    saveMistakeBtn.innerHTML = '保存错题';
}

// 关闭成绩分析模态框
function closeAnalyzeModalHandler() {
    analyzeScoresModal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // 重置表单状态
    analyzeForm.reset();
    analysisProcessing.classList.add('hidden');
    generateAnalysisBtn.disabled = false;
    generateAnalysisBtn.innerHTML = '生成分析报告';
}

// 查看错题
function viewMistake(mistakeId) {
    window.open(`view-mistake.html?id=${mistakeId}`, '_blank');
}

// 查看分析报告
function viewAnalysis(analysisId) {
    window.open(`view-analysis.html?id=${analysisId}`, '_blank');
}

// 显示提示消息
function showToast(message, type = 'success') {
    successMessage.textContent = message;
    
    if (type === 'error') {
        successToast.classList.remove('bg-success');
        successToast.classList.add('bg-danger');
    } else {
        successToast.classList.remove('bg-danger');
        successToast.classList.add('bg-success');
    }
    
    // 显示提示
    successToast.classList.remove('translate-y-20', 'opacity-0');
    
    // 3秒后隐藏
    setTimeout(() => {
        successToast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}
    