// 全局配置
const API_CONFIG = {
    // API基础地址 - 已配置为您提供的Workers API域名
    baseUrl: "http://api.mistakes.huigg.xyz/api",
    // 请求超时时间(毫秒)
    timeout: 30000,
    // 分页大小
    pageSize: 10
};

// 工具函数：处理API请求
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: API_CONFIG.timeout
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.statusText}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error(`请求${url}失败:`, error);
        throw error;
    }
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 显示加载动画
function showLoading(element) {
    if (element) {
        element.innerHTML = `
            <div class="flex justify-center items-center py-8">
                <div class="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            </div>
        `;
    }
}

// 显示错误信息
function showError(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="bg-red-50 border border-red-100 p-4 rounded-lg text-center">
                <i class="fa fa-exclamation-circle text-red-500 text-xl mb-2"></i>
                <p class="text-red-500">${message}</p>
            </div>
        `;
    }
}

// 显示成功信息
function showSuccess(element, message) {
    if (element) {
        element.innerHTML = `
            <div class="bg-green-50 border border-green-100 p-4 rounded-lg text-center">
                <i class="fa fa-check-circle text-green-500 text-xl mb-2"></i>
                <p class="text-green-500">${message}</p>
            </div>
        `;
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    
    // 设置通知样式
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-50', 'border', 'border-green-200', 'text-green-700');
            notification.innerHTML = `<i class="fa fa-check-circle mr-2"></i>${message}`;
            break;
        case 'error':
            notification.classList.add('bg-red-50', 'border', 'border-red-200', 'text-red-700');
            notification.innerHTML = `<i class="fa fa-exclamation-circle mr-2"></i>${message}`;
            break;
        case 'warning':
            notification.classList.add('bg-yellow-50', 'border', 'border-yellow-200', 'text-yellow-700');
            notification.innerHTML = `<i class="fa fa-exclamation-triangle mr-2"></i>${message}`;
            break;
        default:
            notification.classList.add('bg-blue-50', 'border', 'border-blue-200', 'text-blue-700');
            notification.innerHTML = `<i class="fa fa-info-circle mr-2"></i>${message}`;
    }
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动关闭
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}
    