// 全局变量
let mistakeId = null;

// DOM 元素
const backToHome = document.getElementById('back-to-home');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const contentContainer = document.getElementById('content-container');
const mistakeTitle = document.getElementById('mistake-title');
const mistakeGrade = document.getElementById('mistake-grade');
const mistakeExam = document.getElementById('mistake-exam');
const mistakeReason = document.getElementById('mistake-reason');
const mistakeNotes = document.getElementById('mistake-notes');
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
        window.location.href = 'https://mistakesanalysis.huigg.xyz/';
    });
    
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
        
        // 获取错题数据
        const mistake = await apiRequest(`/mistakes/${mistakeId}`);
        
        if (!mistake) {
            throw new Error('未找到该错题');
        }
        
        // 填充基本信息
        mistakeTitle.textContent = mistake.fileName || '错题详情';
        mistakeGrade.textContent = mistake.grade || '未知';
        mistakeExam.textContent = mistake.examType || '未知';
        mistakeReason.textContent = mistake.reason || '未填写';
        mistakeNotes.textContent = mistake.notes || '无备注信息';
        
        // 显示文件内容
        if (mistake.fileUrl) {
            if (mistake.fileType.startsWith('image/')) {
                mistakeViewer.innerHTML = `
                    <img src="${mistake.fileUrl}" 
                         alt="${mistake.fileName}" 
                         class="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm">
                `;
            } else if (mistake.fileType === 'application/pdf') {
                mistakeViewer.innerHTML = `
                    <div class="w-full">
                        <embed src="${mistake.fileUrl}" 
                               type="application/pdf" 
                               width="100%" 
                               height="600px" 
                               class="rounded-lg shadow-sm">
                        <p class="text-center text-sm text-gray-400 mt-2">
                            如无法预览，请<a href="${mistake.fileUrl}" target="_blank" class="text-primary">点击下载</a>
                        </p>
                    </div>
                `;
            } else {
                mistakeViewer.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fa fa-file-o text-4xl text-gray-300 mb-3"></i>
                        <p class="text-gray-500">${mistake.fileName}</p>
                        <a href="${mistake.fileUrl}" target="_blank" class="text-primary mt-2 inline-block">
                            <i class="fa fa-download mr-1"></i> 下载文件
                        </a>
                    </div>
                `;
            }
        } else {
            mistakeViewer.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fa fa-file-o text-4xl mb-3"></i>
                    <p>未找到相关文件</p>
                </div>
            `;
        }
        
        // 显示识别内容
        recognizedContent.textContent = mistake.content || '无识别内容';
        
        // 显示内容
        loadingIndicator.classList.add('hidden');
        contentContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('加载错题详情失败:', error);
        showError(error.message);
    }
}

// 显示错误信息
function showError(message) {
    loadingIndicator.classList.add('hidden');
    contentContainer.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    errorMessage.querySelector('p').textContent = message;
}
    