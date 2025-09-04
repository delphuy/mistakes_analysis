// 全局变量存储图表实例
let charts = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM内容已加载');

    // 检查图表数据元素
    const chartDataElement = document.getElementById('chart-data');
    if (chartDataElement) {
        console.log("找到图表数据元素");
        const content = chartDataElement.getAttribute('data-content');
        console.log("图表数据内容:", content);
    } else {
        console.error("找不到图表数据元素");
    }

    // 渲染Markdown内容
    renderMarkdown();

    // 初始化所有表单验证
    console.log('初始化表单验证');
    initFormValidation();

    // 初始化所有图表
    console.log('初始化图表');
    initCharts();

    // 初始化文件上传预览
    console.log('初始化文件上传预览');
    initFileUploadPreview();

    // 初始化分析生成功能
    console.log('初始化分析生成功能');
    initAnalysisGeneration();

    // 为导航栏添加滚动效果
    console.log('初始化导航栏滚动效果');
    initNavbarScrollEffect();

    // 初始化新窗口链接
    console.log('初始化新窗口链接');
    initNewWindowLinks();

    // 额外添加拖放支持（如果需要）
    console.log('初始化拖放支持');
    initDragAndDrop();

    // 默认全选所有复选框
    console.log('默认全选所有复选框');
    document.querySelectorAll('input[type="checkbox"][name$="_ids"]').forEach(checkbox => {
        checkbox.checked = true;
    });

    // 初始化已选项目显示
    console.log('初始化已选项目显示');
    updateSelectedItems('exam');
    updateSelectedItems('question');

    // 如果是分析结果页面，渲染Markdown内容
    if (window.location.pathname.includes('/view_analysis/')) {
        renderMarkdown();
    }

    console.log('所有初始化完成');
});

// 初始化新窗口链接
function initNewWindowLinks() {
    const links = document.querySelectorAll('[data-new-window]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(this.href, '_blank');
        });
    });
}

// 导航栏滚动效果
function initNavbarScrollEffect() {
    const header = document.querySelector('header');
    if (!header) return;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
            header.classList.add('shadow-md', 'bg-white/95', 'backdrop-blur-sm');
            header.classList.remove('shadow-sm', 'bg-white');
        } else {
            header.classList.remove('shadow-md', 'bg-white/95', 'backdrop-blur-sm');
            header.classList.add('shadow-sm', 'bg-white');
        }
    });
}

// 表单验证初始化
function initFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            let isValid = true;
            
            // 验证必填字段
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('input-error');
                    
                    // 添加错误消息（如果不存在）
                    let errorMsg = field.nextElementSibling;
                    if (!errorMsg || !errorMsg.classList.contains('error-message')) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        errorMsg.textContent = '此字段为必填项';
                        field.parentNode.insertBefore(errorMsg, field.nextSibling);
                    }
                } else {
                    field.classList.remove('input-error');
                    
                    // 移除错误消息
                    let errorMsg = field.nextElementSibling;
                    if (errorMsg && errorMsg.classList.contains('error-message')) {
                        errorMsg.remove();
                    }
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                // 滚动到第一个错误字段
                const firstError = form.querySelector('.input-error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstError.focus();
                }
            }
        });
    });
}

// 使用防抖函数减少频繁操作
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 优化文件上传预览
function initFileUploadPreview() {
    const fileInputs = document.querySelectorAll('input[type="file"]');

    fileInputs.forEach(input => {
        // 查找预览容器
        let previewContainer = input.closest('form').querySelector('.file-preview');
        if (!previewContainer) {
            // 如果找不到预览容器，创建一个
            previewContainer = document.createElement('div');
            previewContainer.className = 'file-preview mt-3';
            input.parentNode.insertBefore(previewContainer, input.nextSibling);
        }

        // 使用防抖函数减少频繁操作
        const debouncedUpdatePreview = debounce(function() {
            updateFilePreview(input, previewContainer);
        }, 300);

        input.addEventListener('change', debouncedUpdatePreview);

        // 添加拖放功能
        const dropZone = input.closest('.border-dashed');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-primary', 'bg-primary/10');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-primary', 'bg-primary/10');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-primary', 'bg-primary/10');

                if (e.dataTransfer.files.length > 0) {
                    input.files = e.dataTransfer.files;
                    debouncedUpdatePreview();
                }
            });
        }
    });
}

function updateFilePreview(input, previewContainer) {
    if (!previewContainer) return;

    const files = input.files;
    if (!files || files.length === 0) {
        previewContainer.innerHTML = '<div class="text-gray-500 text-sm">未选择文件</div>';
        return;
    }

    let html = '<div class="space-y-3">';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = getFileTypeIcon(file);

        html += `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div class="flex items-center">
                    <i class="${fileType.icon} ${fileType.color} mr-3 text-lg"></i>
                    <div>
                        <div class="text-sm font-medium text-gray-900">${file.name}</div>
                        <div class="text-xs text-gray-500">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button type="button" onclick="removeFile(this, '${input.id}')"
                        class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fa fa-times"></i>
                </button>
            </div>
        `;
    }

    html += '</div>';
    previewContainer.innerHTML = html;
}

function getFileTypeIcon(file) {
    if (file.type.startsWith('image/')) {
        return { icon: 'fa fa-file-image-o', color: 'text-primary' };
    } else if (file.type === 'application/pdf') {
        return { icon: 'fa fa-file-pdf-o', color: 'text-red-500' };
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        return { icon: 'fa fa-file-excel-o', color: 'text-green-500' };
    } else if (file.name.endsWith('.csv')) {
        return { icon: 'fa fa-file-text-o', color: 'text-blue-500' };
    } else if (file.name.endsWith('.json')) {
        return { icon: 'fa fa-file-code-o', color: 'text-purple-500' };
    } else {
        return { icon: 'fa fa-file-o', color: 'text-gray-500' };
    }
}

function removeFile(button, inputId) {
    const fileItem = button.closest('.flex.items-center.justify-between');
    fileItem.remove();

    // 清空文件输入
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
    }

    // 如果没有文件了，显示提示
    const container = fileItem.parentElement;
    if (container.children.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm">未选择文件</div>';
    }
}

// 初始化图表
function initCharts() {
    // 获取数据
    const chartDataElement = document.getElementById('chart-data');
    if (!chartDataElement) {
        console.error("找不到图表数据元素");
        return;
    }

    const content = chartDataElement.getAttribute('data-content');
    if (!content) {
        console.error("找不到分析内容");
        return;
    }

    // 解析JSON内容
    let analysisContent;
    try {
        analysisContent = JSON.parse(content);
        console.log("解析后的分析内容:", analysisContent);
    } catch (e) {
        console.error('解析分析内容失败:', e);
        return;
    }

    // 从内容中提取结构化数据
    const chartData = extractStructuredData(analysisContent);

    // 打印三个分析区域的数据
    console.log("成绩趋势数据:", chartData.scoreTrend);
    console.log("学科对比数据:", chartData.subjectCompare);
    console.log("错题类型数据:", chartData.errorCategory);

    // 成绩趋势图
    const scoreTrendCtx = document.getElementById('score-trend-chart');
    if (scoreTrendCtx) {
        if (chartData.scoreTrend.labels.length > 0 && chartData.scoreTrend.datasets.length > 0) {
            console.log("初始化成绩趋势图");

            // 构建图表数据
            const chartDataFormatted = {
                labels: chartData.scoreTrend.labels,
                datasets: [{
                    label: '总分',
                    data: chartData.scoreTrend.datasets,
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            };

            charts.scoreTrend = new Chart(scoreTrendCtx, {
                type: 'line',
                data: chartDataFormatted,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            usePointStyle: true,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 0,
                            max: 300,  // 假设总分最高为300分
                            ticks: {
                                stepSize: 50
                            }
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        } else {
            console.log("成绩趋势图没有数据，显示空状态");
            // 如果没有数据，显示空状态
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center py-10 text-gray-500';
            emptyState.innerHTML = '<i class="fa fa-chart-line text-4xl mb-3 opacity-30"></i><p>暂无成绩趋势数据</p>';
            scoreTrendCtx.parentNode.appendChild(emptyState);
        }
    }

    // 学科对比图
    const subjectCompareCtx = document.getElementById('subject-compare-chart');
    if (subjectCompareCtx) {
        if (chartData.subjectCompare.labels.length > 0 && chartData.subjectCompare.datasets.length > 0) {
            console.log("初始化学科对比图");

            // 构建图表数据
            const chartDataFormatted = {
                labels: chartData.subjectCompare.labels,
                datasets: chartData.subjectCompare.datasets
            };

            charts.subjectCompare = new Chart(subjectCompareCtx, {
                type: 'line',
                data: chartDataFormatted,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            usePointStyle: true,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 0,
                            max: 100,
                            ticks: {
                                stepSize: 20
                            }
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        } else {
            console.log("学科对比图没有数据，显示空状态");
            // 如果没有数据，显示空状态
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center py-10 text-gray-500';
            emptyState.innerHTML = '<i class="fa fa-chart-area text-4xl mb-3 opacity-30"></i><p>暂无学科对比数据</p>';
            subjectCompareCtx.parentNode.appendChild(emptyState);
        }
    }

    // 错题类型分析图
    const errorCategoryCtx = document.getElementById('error-category-chart');
    if (errorCategoryCtx) {
        if (chartData.errorCategory.labels.length > 0 && chartData.errorCategory.datasets.length > 0) {
            console.log("初始化错题类型分析图");

            // 构建图表数据
            const chartDataFormatted = {
                labels: chartData.errorCategory.labels,
                datasets: [{
                    data: chartData.errorCategory.datasets,
                    backgroundColor: [
                        '#4F46E5',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444',
                        '#8B5CF6'
                    ],
                    borderWidth: 1
                }]
            };

            charts.errorCategory = new Chart(errorCategoryCtx, {
                type: 'doughnut',
                data: chartDataFormatted,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                        }
                    },
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        } else {
            console.log("错题类型分析图没有数据，显示空状态");
            // 如果没有数据，显示空状态
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center py-10 text-gray-500';
            emptyState.innerHTML = '<i class="fa fa-chart-pie text-4xl mb-3 opacity-30"></i><p>暂无错题类型数据</p>';
            errorCategoryCtx.parentNode.appendChild(emptyState);
        }
    }
}

// 更新图表数据
function updateChart(chartId, data) {
    if (charts[chartId]) {
        charts[chartId].data = data;
        charts[chartId].update();
    }
}

// 初始化分析生成功能
function initAnalysisGeneration() {
    const generateBtn = document.getElementById('generate-analysis-btn');
    if (!generateBtn) {
        console.error('找不到生成分析报告按钮');
        return;
    }

    console.log('找到生成分析报告按钮，添加点击事件监听器');

    generateBtn.addEventListener('click', function() {
        console.log('生成分析报告按钮被点击');

        // 获取选中的考试和错题
        const selectedExams = Array.from(document.querySelectorAll('input[name="exam_ids"]:checked'))
            .map(checkbox => checkbox.value);

        const selectedQuestions = Array.from(document.querySelectorAll('input[name="question_ids"]:checked'))
            .map(checkbox => checkbox.value);

        console.log('选中的考试:', selectedExams);
        console.log('选中的错题:', selectedQuestions);

        // 验证选择
        if (selectedExams.length === 0 && selectedQuestions.length === 0) {
            showToast('请至少选择一项考试或错题进行分析', 'error');
            return;
        }

        // 显示加载动画
        showLoading('正在生成分析报告，这可能需要几分钟时间...');

        // 禁用按钮防止重复点击
        generateBtn.disabled = true;
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 分析中...';

        // 获取当前页面的URL路径
        const currentPath = window.location.pathname;
        const baseUrl = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

        // 发送请求生成分析
        fetch(baseUrl + 'generate_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                exam_ids: selectedExams,
                question_ids: selectedQuestions
            })
        })
        .then(response => {
            console.log('收到响应:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('分析结果:', data);

            if (data.status === 'success' && data.analysis_id) {
                // 打开新窗口查看分析结果
                window.open(baseUrl + 'view_analysis/' + data.analysis_id, '_blank');
                showToast('分析报告生成成功！', 'success');
            } else {
                throw new Error(data.message || '生成分析报告失败');
            }
        })
        .catch(error => {
            console.error('生成分析报告错误:', error);
            showToast('生成分析报告失败: ' + error.message, 'error');
        })
        .finally(() => {
            // 隐藏加载动画
            hideLoading();

            // 恢复按钮状态
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
        });
    });
}

// 辅助函数：获取CSRF令牌
function getCSRFToken() {
    // 尝试从meta标签获取
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
        return metaToken.getAttribute('content');
    }

    // 尝试从cookie获取
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];
    return cookieValue || '';
}

// 添加Toast提示功能
function showToast(message, type = 'info') {
    // 移除已存在的toast
    const existingToast = document.getElementById('custom-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fa ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // 自动消失
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// 显示加载动画
function showLoading(message) {
    // 移除已存在的加载动画
    hideLoading();

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';

    const loadingContent = document.createElement('div');
    loadingContent.className = 'bg-white p-6 rounded-lg shadow-xl flex flex-col items-center min-w-[300px]';

    const spinner = document.createElement('div');
    spinner.className = 'w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4';

    const text = document.createElement('p');
    text.className = 'text-gray-700 font-medium';
    text.textContent = message || '加载中...';

    loadingContent.appendChild(spinner);
    loadingContent.appendChild(text);
    loadingDiv.appendChild(loadingContent);
    document.body.appendChild(loadingDiv);
}

// 隐藏加载动画
function hideLoading() {
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// 辅助函数：格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 辅助函数：获取CSRF令牌
function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];
    return cookieValue || '';
}

// 显示加载动画
function showLoading(message) {
    // 移除已存在的加载动画
    hideLoading();
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
    
    const loadingContent = document.createElement('div');
    loadingContent.className = 'bg-white p-6 rounded-lg shadow-xl flex flex-col items-center';
    
    const spinner = document.createElement('div');
    spinner.className = 'w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4';
    
    const text = document.createElement('p');
    text.className = 'text-gray-700 font-medium';
    text.textContent = message || '加载中...';
    
    loadingContent.appendChild(spinner);
    loadingContent.appendChild(text);
    loadingDiv.appendChild(loadingContent);
    document.body.appendChild(loadingDiv);
}

// 隐藏加载动画
function hideLoading() {
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function initDragAndDrop() {
    const dropZones = document.querySelectorAll('.border-dashed');
    dropZones.forEach(zone => {
        const fileInput = zone.querySelector('input[type="file"]');

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('border-primary');
            zone.classList.add('bg-primary/5');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('border-primary');
            zone.classList.remove('bg-primary/5');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('border-primary');
            zone.classList.remove('bg-primary/5');

            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                // 触发change事件以更新预览
                const event = new Event('change');
                fileInput.dispatchEvent(event);
            }
        });
    });
}

function toggleAll(type) {
    const checkboxes = document.querySelectorAll(`input[name="${type}_ids"]`);
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);

    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
}

// 更新已选项目显示
function updateSelectedItems(type) {
    const checkboxes = document.querySelectorAll(`input[name="${type}_ids"]:checked`);
    const container = document.getElementById(`selected-${type}s`);
    const listContainer = document.getElementById(`selected-${type}s-list`);

    if (!container || !listContainer) return;

    if (checkboxes.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    listContainer.innerHTML = '';

    checkboxes.forEach(checkbox => {
        const label = document.querySelector(`label[for="${checkbox.id}"]`);
        if (label) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary/10 text-primary text-xs';
            badge.textContent = label.textContent.trim();
            listContainer.appendChild(badge);
        }
    });
}

/ 添加Markdown渲染功能
function renderMarkdown() {
    const contentElement = document.getElementById('analysis-content');
    if (!contentElement) return;

    // 获取原始内容
    const originalContent = contentElement.innerHTML;

    // 简单的Markdown到HTML转换
    let htmlContent = originalContent
        // 标题
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 粗体
        .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
        // 斜体
        .replace(/\*(.*)\*/g, '<em>$1</em>')
        // 无序列表
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        // 有序列表
        .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // 换行
        .replace(/\n/g, '<br>');

    // 包装列表项
    htmlContent = htmlContent.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    contentElement.innerHTML = htmlContent;
}

// 滚动到指定区域
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId + '-chart').closest('.card');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 高亮效果
        section.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
        setTimeout(() => {
            section.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
        }, 2000);
    }
}