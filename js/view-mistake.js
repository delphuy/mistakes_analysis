// 全局变量
const API_BASE_URL = 'https://api.mistakes.huigg.xyz/api';
let mistakeId = null;

// DOM 元素
const backToHome = document.getElementById('back-to-home');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const errorDetails = document.getElementById('error-details');
const retryLoading = document.getElementById('retry-loading');
const contentContainer = document.getElementById('content-container');
const mistakeTitle = document.getElementById('mistake-title');
const mistakeGrade = document.getElementById('mistake-grade');
const mistakeExam = document.getElementById('mistake-exam');
const mistakeReason = document.getElementById('mistake-reason');
const mistakeNotes = document.getElementById('mistake-notes');
const mistakeCreatedAt = document.getElementById('mistake-created-at');
const mistakeViewer = document.getElementById('mistake-viewer');
const recognizedContent = document.getElementById('recognized-content');

// 页面参数解析
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    mistakeId = getQueryParam('id');
    
    if (!mistakeId) {
        showError('无效的错题ID');
        return;
    }
    
    // 绑定事件监听器
    backToHome.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    retryLoading.addEventListener('click', loadMistakeDetails);
    
    // 加载错题详情
    loadMistakeDetails();
});

// 加载错题详情
async function loadMistakeDetails() {
    try {
        // 显示加载状态
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        contentContainer.classList.add('hidden');
        
        // 获取错题信息
        const response = await fetch(`${API_BASE_URL}/mistakes/${mistakeId}`);
        
        if (!response.ok) {
            throw new Error('获取错题信息失败');
        }
        
        const mistake = await response.json();
        
        if (!mistake) {
            throw new Error('未找到该错题');
        }
        
        // 填充页面内容
        mistakeTitle.textContent = `${mistake.subjectName} - ${mistake.fileName}`;
        mistakeGrade.textContent = mistake.grade;
        mistakeExam.textContent = mistake.examType;
        mistakeReason.textContent = mistake.reason || '无';
        mistakeNotes.textContent = mistake.notes || '无';
        mistakeCreatedAt.textContent = formatDate(mistake.createdAt);
        recognizedContent.textContent = mistake.content || '无识别内容';
        
        // 加载错题文件
        loadMistakeFile(mistake.fileId, mistake.fileName);
        
        // 显示内容
        loadingIndicator.classList.add('hidden');
        contentContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('加载错题详情失败:', error);
        showError(error.message);
    }
}

// 加载错题文件
async function loadMistakeFile(fileId, fileName) {
    try {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`);
        
        if (!response.ok) {
            throw new Error('获取文件失败');
        }
        
        const contentType = response.headers.get('content-type');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // 根据文件类型显示不同的内容
        if (contentType.startsWith('image/')) {
            // 图片文件
            mistakeViewer.innerHTML = `
                <img src="${url}" alt="${fileName}" class="w-full h-auto rounded-lg shadow-sm" />
            `;
        } else if (contentType === 'application/pdf') {
            // PDF文件
            mistakeViewer.innerHTML = `
                <embed src="${url}" type="application/pdf" width="100%" height="500px" class="rounded-lg" />
                <p class="text-center text-gray-300 text-sm mt-2">如果无法显示，请下载查看</p>
                <div class="text-center mt-4">
                    <a href="${url}" download="${fileName}" class="inline-flex items-center text-primary hover:text-primary/80 text-sm">
                        <i class="fa fa-download mr-1"></i> 下载PDF文件
                    </a>
                </div>
            `;
        } else {
            mistakeViewer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fa fa-file-o text-gray-200 text-5xl mb-4"></i>
                    <p class="text-gray-400">不支持的文件类型</p>
                    <a href="${url}" download="${fileName}" class="inline-flex items-center text-primary hover:text-primary/80 text-sm mt-2">
                        <i class="fa fa-download mr-1"></i> 下载文件
                    </a>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('加载错题文件失败:', error);
        mistakeViewer.innerHTML = `
            <div class="text-center py-8">
                <i class="fa fa-exclamation-circle text-danger text-3xl mb-2"></i>
                <p class="text-gray-400">无法加载文件</p>
                <p class="text-gray-300 text-sm">${error.message}</p>
            </div>
        `;
    }
}

// 显示错误信息
function showError(message) {
    loadingIndicator.classList.add('hidden');
    contentContainer.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    errorDetails.textContent = message;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
    