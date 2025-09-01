// 全局变量
const API_BASE_URL = 'https://api.mistakes.huigg.xyz/api';
let analysisId = null;

// DOM 元素
const backToHome = document.getElementById('back-to-home');
const downloadReport = document.getElementById('download-report');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const errorDetails = document.getElementById('error-details');
const retryLoading = document.getElementById('retry-loading');
const contentContainer = document.getElementById('content-container');
const analysisTitle = document.getElementById('analysis-title');
const analysisExam = document.getElementById('analysis-exam');
const analysisDate = document.getElementById('analysis-date');
const overallEvaluation = document.getElementById('overall-evaluation');
const totalScore = document.getElementById('total-score');
const avgScore = document.getElementById('avg-score');
const highestScore = document.getElementById('highest-score');
const highestSubject = document.getElementById('highest-subject');
const lowestScore = document.getElementById('lowest-score');
const lowestSubject = document.getElementById('lowest-subject');
const strengthsSubjects = document.getElementById('strengths-subjects');
const weaknessesSubjects = document.getElementById('weaknesses-subjects');
const mistakesAnalysis = document.getElementById('mistakes-analysis');
const improvementSuggestions = document.getElementById('improvement-suggestions');

// 页面参数解析
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    analysisId = getQueryParam('id');
    
    if (!analysisId) {
        showError('无效的分析报告ID');
        return;
    }
    
    // 绑定事件监听器
    backToHome.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    retryLoading.addEventListener('click', loadAnalysisDetails);
    
    downloadReport.addEventListener('click', downloadAnalysisReport);
    
    // 加载分析详情
    loadAnalysisDetails();
});

// 加载分析详情
async function loadAnalysisDetails() {
    try {
        // 显示加载状态
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        contentContainer.classList.add('hidden');
        
        // 获取分析报告
        const response = await fetch(`${API_BASE_URL}/analyses/${analysisId}`);
        
        if (!response.ok) {
            throw new Error('获取分析报告失败');
        }
        
        const analysis = await response.json();
        
        if (!analysis) {
            throw new Error('未找到该分析报告');
        }
        
        // 填充基本信息
        analysisTitle.textContent = analysis.title;
        analysisExam.textContent = analysis.examType;
        analysisDate.textContent = formatDate(analysis.createdAt);
        
        // 如果没有分析结果，显示提示
        if (!analysis.result) {
            overallEvaluation.textContent = '分析结果正在生成中，请稍后刷新页面查看';
            loadingIndicator.classList.add('hidden');
            contentContainer.classList.remove('hidden');
            return;
        }
        
        // 填充总体评价
        overallEvaluation.textContent = analysis.result.overallEvaluation || '暂无总体评价';
        
        // 获取考试成绩数据（用于计算总分等）
        const examResponse = await fetch(`${API_BASE_URL}/exams/${analysis.examId}`);
        const examData = await examResponse.json();
        
        // 计算总分和平均分
        let scoresSum = 0;
        let scoresCount = 0;
        let highest = { score: 0, subject: '' };
        let lowest = { score: 100, subject: '' };
        
        // 获取科目配置
        const configResponse = await fetch(`${API_BASE_URL}/config`);
        const configData = await configResponse.json();
        const subjectMap = {};
        configData.subjects.forEach(subject => {
            subjectMap[subject.key] = subject.name;
        });
        
        // 计算分数统计
        if (examData) {
            Object.entries(examData).forEach(([key, value]) => {
                if (subjectMap[key] && !isNaN(value)) {
                    const score = parseFloat(value);
                    scoresSum += score;
                    scoresCount++;
                    
                    if (score > highest.score) {
                        highest = { score, subject: subjectMap[key] };
                    }
                    
                    if (score < lowest.score) {
                        lowest = { score, subject: subjectMap[key] };
                    }
                }
            });
        }
        
        // 填充成绩统计
        totalScore.textContent = scoresSum.toFixed(1);
        avgScore.textContent = scoresCount > 0 ? (scoresSum / scoresCount).toFixed(1) : '0';
        highestScore.textContent = highest.score.toFixed(1);
        highestSubject.textContent = highest.subject;
        lowestScore.textContent = lowest.score.toFixed(1);
        lowestSubject.textContent = lowest.subject;
        
        // 绘制成绩概览图表
        drawScoresOverviewChart(examData, subjectMap);
        
        // 获取历史成绩数据并绘制趋势图表
        if (examData && examData.grade) {
            const historyResponse = await fetch(`${API_BASE_URL}/exams/history?grade=${encodeURIComponent(examData.grade)}`);
            const historyData = await historyResponse.json();
            drawScoreTrendChart(historyData, subjectMap);
        }
        
        // 填充优势学科
        populateStrengthsSubjects(analysis.result.strengths, subjectMap);
        
        // 填充薄弱学科
        populateWeaknessesSubjects(analysis.result.weaknesses, subjectMap);
        
        // 填充错题分析
        populateMistakesAnalysis(analysis.result.mistakesAnalysis, subjectMap);
        
        // 填充提升建议
        populateImprovementSuggestions(analysis.result.improvementSuggestions);
        
        // 显示内容
        loadingIndicator.classList.add('hidden');
        contentContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('加载分析报告失败:', error);
        showError(error.message);
    }
}

// 绘制成绩概览图表
function drawScoresOverviewChart(examData, subjectMap) {
    const ctx = document.getElementById('scores-overview-chart').getContext('2d');
    
    // 准备图表数据
    const labels = [];
    const data = [];
    const backgroundColors = [
        'rgba(22, 93, 255, 0.7)', 'rgba(54, 207, 201, 0.7)', 'rgba(114, 46, 209, 0.7)',
        'rgba(255, 127, 80, 0.7)', 'rgba(255, 193, 7, 0.7)', 'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(23, 162, 184, 0.7)',
        'rgba(108, 99, 255, 0.7)'
    ];
    
    // 从考试数据中提取科目成绩
    Object.entries(examData).forEach(([key, value], index) => {
        if (subjectMap[key] && !isNaN(value)) {
            labels.push(subjectMap[key]);
            data.push(parseFloat(value));
        }
    });
    
    // 销毁已存在的图表（如果有）
    if (window.scoresOverviewChart) {
        window.scoresOverviewChart.destroy();
    }
    
    // 创建新图表
    window.scoresOverviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '本次成绩',
                data: data,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: 12,
                    cornerRadius: 8
                }
            }
        }
    });
}

// 绘制成绩趋势图表
function drawScoreTrendChart(historyData, subjectMap) {
    const ctx = document.getElementById('score-trend-chart').getContext('2d');
    
    // 如果没有历史数据，显示提示信息
    if (!historyData || historyData.length === 0) {
        document.getElementById('score-trend-container').innerHTML = 
            '<p class="text-center text-gray-400 py-8">暂无历史成绩数据</p>';
        return;
    }
    
    // 准备图表数据
    const labels = historyData.map(item => formatDate(item.date, true));
    const datasets = [];
    const colors = [
        { border: 'rgba(22, 93, 255, 1)', background: 'rgba(22, 93, 255, 0.1)' },
        { border: 'rgba(54, 207, 201, 1)', background: 'rgba(54, 207, 201, 0.1)' },
        { border: 'rgba(114, 46, 209, 1)', background: 'rgba(114, 46, 209, 0.1)' },
        { border: 'rgba(255, 127, 80, 1)', background: 'rgba(255, 127, 80, 0.1)' }
    ];
    
    // 选择主要科目绘制趋势图
    const mainSubjects = ['chinese', 'math', 'english', 'physics'];
    let colorIndex = 0;
    
    mainSubjects.forEach(subjectKey => {
        if (subjectMap[subjectKey]) {
            const subjectData = historyData.map(item => {
                return !isNaN(item[subjectKey]) ? parseFloat(item[subjectKey]) : null;
            });
            
            datasets.push({
                label: subjectMap[subjectKey],
                data: subjectData,
                borderColor: colors[colorIndex].border,
                backgroundColor: colors[colorIndex].background,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: colors[colorIndex].border,
                pointRadius: 4,
                pointHoverRadius: 6
            });
            
            colorIndex = (colorIndex + 1) % colors.length;
        }
    });
    
    // 销毁已存在的图表（如果有）
    if (window.scoreTrendChart) {
        window.scoreTrendChart.destroy();
    }
    
    // 创建新图表
    window.scoreTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: 12,
                    cornerRadius: 8
                }
            }
        }
    });
}

// 填充优势学科
function populateStrengthsSubjects(strengths, subjectMap) {
    if (!strengths || strengths.length === 0) {
        strengthsSubjects.innerHTML = '<p class="text-center text-gray-400 py-4">暂无优势学科分析</p>';
        return;
    }
    
    let html = '';
    strengths.forEach(strength => {
        const subjectName = subjectMap[strength.key] || '未知科目';
        const trendIcon = strength.trend === 'up' ? 
            '<i class="fa fa-arrow-up text-green-600"></i> 进步明显' : 
            '<i class="fa fa-check text-green-600"></i> 保持优秀';
        
        html += `
        <div class="border border-green-100 bg-green-50 p-4 rounded-lg mb-4 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="font-medium flex justify-between">
                <span>${subjectName} (${strength.score.toFixed(1)}分)</span>
                <span>${trendIcon}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2">${strength.comment}</p>
            <div class="mt-2 pt-2 border-t border-green-100">
                <p class="font-medium text-sm">优势知识点：</p>
                <ul class="text-sm text-gray-600 list-disc pl-5 mt-1">
                    ${strength.knowledgePoints.map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
        </div>
        `;
    });
    
    strengthsSubjects.innerHTML = html;
}

// 填充薄弱学科
function populateWeaknessesSubjects(weaknesses, subjectMap) {
    if (!weaknesses || weaknesses.length === 0) {
        weaknessesSubjects.innerHTML = '<p class="text-center text-gray-400 py-4">暂无薄弱学科分析</p>';
        return;
    }
    
    let html = '';
    weaknesses.forEach(weakness => {
        const subjectName = subjectMap[weakness.key] || '未知科目';
        let trendIcon = '';
        
        if (weakness.trend === 'down') {
            trendIcon = '<i class="fa fa-arrow-down text-orange-600"></i> 需要加强';
        } else if (weakness.trend === 'up') {
            trendIcon = '<i class="fa fa-arrow-up text-orange-600"></i> 有所进步';
        } else {
            trendIcon = '<i class="fa fa-minus text-orange-600"></i> 持平';
        }
        
        html += `
        <div class="border border-orange-100 bg-orange-50 p-4 rounded-lg mb-4 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="font-medium flex justify-between">
                <span>${subjectName} (${weakness.score.toFixed(1)}分)</span>
                <span>${trendIcon}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2">${weakness.comment}</p>
            <div class="mt-2 pt-2 border-t border-orange-100">
                <p class="font-medium text-sm">薄弱知识点：</p>
                <ul class="text-sm text-gray-600 list-disc pl-5 mt-1">
                    ${weakness.knowledgePoints.map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
        </div>
        `;
    });
    
    weaknessesSubjects.innerHTML = html;
}

// 填充错题分析
function populateMistakesAnalysis(mistakes, subjectMap) {
    if (!mistakes || mistakes.length === 0) {
        mistakesAnalysis.innerHTML = '<p class="text-center text-gray-400 py-4">暂无错题分析</p>';
        return;
    }
    
    let html = '';
    mistakes.forEach(mistake => {
        const subjectName = subjectMap[mistake.subject] || '未知科目';
        
        html += `
        <div class="border border-blue-100 bg-blue-50 p-4 rounded-lg mb-4 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="font-medium">${subjectName} - ${mistake.knowledgePoint}</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
                <div class="bg-white p-2 rounded">
                    <p class="text-gray-500">错误次数</p>
                    <p class="font-medium">${mistake.errorCount}次</p>
                </div>
                <div class="bg-white p-2 rounded">
                    <p class="text-gray-500">错误率</p>
                    <p class="font-medium">${mistake.errorRate}%</p>
                </div>
                <div class="bg-white p-2 rounded">
                    <p class="text-gray-500">相关知识点</p>
                    <p class="font-medium">${mistake.relatedKnowledge}</p>
                </div>
            </div>
            <p class="text-sm text-primary mt-2">改进建议: ${mistake.suggestion}</p>
        </div>
        `;
    });
    
    mistakesAnalysis.innerHTML = html;
}

// 填充提升建议
function populateImprovementSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        improvementSuggestions.innerHTML = '<p class="text-center text-gray-400 py-4">暂无提升建议</p>';
        return;
    }
    
    let html = '';
    suggestions.forEach((suggestion, index) => {
        html += `
        <div class="mb-6 transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div class="flex">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 mt-0.5">
                    ${index + 1}
                </div>
                <div>
                    <p class="font-medium">${suggestion.title}</p>
                    <p class="text-gray-600 mt-1">${suggestion.content}</p>
                    
                    ${suggestion.details && suggestion.details.length > 0 ? `
                    <div class="mt-3 pl-4 border-l-2 border-primary/20">
                        <p class="text-sm font-medium mb-2">具体措施：</p>
                        <ul class="text-sm text-gray-600 space-y-1">
                            ${suggestion.details.map(detail => `<li class="flex items-start">
                                <i class="fa fa-check-circle text-primary mt-1 mr-2"></i>
                                <span>${detail}</span>
                            </li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        `;
    });
    
    improvementSuggestions.innerHTML = html;
}

// 显示错误信息
function showError(message, details = '') {
    loadingIndicator.classList.add('hidden');
    contentContainer.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    
    document.getElementById('error-message-text').textContent = message;
    
    if (details) {
        errorDetails.textContent = details;
        errorDetails.classList.remove('hidden');
    } else {
        errorDetails.classList.add('hidden');
    }
}

// 格式化日期
function formatDate(dateString, short = false) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return short ? `${month}-${day}` : `${year}-${month}-${day}`;
}

// 下载分析报告
async function downloadAnalysisReport() {
    try {
        // 显示加载状态
        downloadReport.disabled = true;
        downloadReport.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> 正在生成...';
        
        const response = await fetch(`${API_BASE_URL}/analyses/${analysisId}/export`);
        
        if (!response.ok) {
            throw new Error('生成报告失败');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `成绩分析报告_${analysisTitle.textContent}_${formatDate(new Date())}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('下载报告失败:', error);
        alert('下载报告失败: ' + error.message);
    } finally {
        // 恢复按钮状态
        downloadReport.disabled = false;
        downloadReport.innerHTML = '<i class="fa fa-download mr-2"></i> 下载报告';
    }
}
    