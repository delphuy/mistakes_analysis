// 全局变量
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
        window.location.href = 'https://mistakesanalysis.huigg.xyz/';
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
        const analysis = await apiRequest(`/analyses/${analysisId}`);
        
        if (!analysis) {
            throw new Error('未找到该分析报告');
        }
        
        // 填充基本信息
        analysisTitle.textContent = analysis.title || '学习分析报告';
        analysisExam.textContent = analysis.examType || '未知考试';
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
        const examResponse = await apiRequest(`/exams/${analysis.examId}`);
        const examData = examResponse || {};
        
        // 计算总分和平均分
        let scoresSum = 0;
        let scoresCount = 0;
        let highest = { score: 0, subject: '' };
        let lowest = { score: 100, subject: '' };
        
        // 获取科目配置
        const configResponse = await apiRequest('/config');
        const configData = configResponse || { subjects: [] };
        const subjectMap = {};
        configData.subjects.forEach(subject => {
            subjectMap[subject.key] = subject.name;
        });
        
        // 计算分数统计
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
            const historyResponse = await apiRequest(`/exams/history?grade=${encodeURIComponent(examData.grade)}`);
            const historyData = historyResponse || [];
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
        'rgba(22, 93, 255, 0.7)',
        'rgba(54, 207, 201, 0.7)',
        'rgba(114, 46, 209, 0.7)',
        'rgba(255, 127, 80, 0.7)',
        'rgba(255, 193, 7, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(23, 162, 184, 0.7)',
        'rgba(108, 99, 255, 0.7)'
    ];
    
    // 过滤并排序学科数据
    const subjectEntries = Object.entries(subjectMap).map(([key, name]) => ({
        key,
        name,
        score: examData[key] !== undefined ? parseFloat(examData[key]) : null
    })).filter(item => item.score !== null && !isNaN(item.score));
    
    // 按分数从高到低排序
    subjectEntries.sort((a, b) => b.score - a.score);
    
    // 填充图表数据
    subjectEntries.forEach((subject, index) => {
        labels.push(subject.name);
        data.push(subject.score);
    });
    
    // 销毁已存在的图表
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
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw}分`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '分';
                        }
                    }
                }
            }
        }
    });
}

// 绘制成绩趋势图表
function drawScoreTrendChart(historyData, subjectMap) {
    const ctx = document.getElementById('score-trend-chart').getContext('2d');
    
    // 如果历史数据不足，显示提示
    if (historyData.length < 2) {
        document.getElementById('score-trend-container').innerHTML = `
            <div class="text-center py-10 text-gray-400">
                <i class="fa fa-line-chart text-2xl mb-2"></i>
                <p>历史数据不足，无法生成趋势图表</p>
            </div>
        `;
        return;
    }
    
    // 准备图表数据
    const labels = historyData.map(item => formatDate(item.date));
    
    // 选择分数最高的3个学科
    const subjectScores = {};
    
    // 计算每个学科的平均分
    Object.keys(subjectMap).forEach(key => {
        let total = 0;
        let count = 0;
        
        historyData.forEach(exam => {
            if (exam[key] !== undefined && !isNaN(exam[key])) {
                total += parseFloat(exam[key]);
                count++;
            }
        });
        
        if (count > 0) {
            subjectScores[key] = total / count;
        }
    });
    
    // 按平均分排序，取前3名
    const topSubjects = Object.entries(subjectScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(item => item[0]);
    
    // 准备数据集
    const datasets = topSubjects.map((key, index) => {
        const colors = [
            { border: 'rgba(54, 207, 201, 1)', background: 'rgba(54, 207, 201, 0.1)' },
            { border: 'rgba(114, 46, 209, 1)', background: 'rgba(114, 46, 209, 0.1)' },
            { border: 'rgba(255, 127, 80, 1)', background: 'rgba(255, 127, 80, 0.1)' }
        ];
        
        return {
            label: subjectMap[key],
            data: historyData.map(exam => exam[key] !== undefined ? parseFloat(exam[key]) : null),
            borderColor: colors[index].border,
            backgroundColor: colors[index].background,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: colors[index].border,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });
    
    // 销毁已存在的图表
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
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}分`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '分';
                        }
                    }
                }
            }
        }
    });
}

// 填充优势学科
function populateStrengthsSubjects(strengths, subjectMap) {
    if (!strengths || strengths.length === 0) {
        strengthsSubjects.innerHTML = `
            <div class="text-center py-6 text-gray-400">
                <p>未分析出明显的优势学科</p>
            </div>
        `;
        return;
    }
    
    strengthsSubjects.innerHTML = '';
    
    strengths.forEach(strength => {
        const subjectName = subjectMap[strength.key] || '未知学科';
        const trendIcon = strength.trend === 'up' 
            ? '<i class="fa fa-arrow-up text-green-600"></i> 进步明显'
            : '<i class="fa fa-minus text-gray-400"></i> 保持稳定';
        
        const subjectElement = document.createElement('div');
        subjectElement.className = 'border border-green-100 bg-green-50 p-4 rounded-lg mb-4';
        
        subjectElement.innerHTML = `
            <div class="font-medium flex justify-between">
                <span>${subjectName} (${strength.score}分)</span>
                <span>${trendIcon}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2">${strength.comment || '表现优秀，继续保持'}</p>
            <div class="mt-2 pt-2 border-t border-green-100">
                <p class="font-medium text-sm">优势知识点：</p>
                <ul class="text-sm text-gray-600 list-disc pl-5 mt-1">
                    ${strength.knowledgePoints.map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
        `;
        
        strengthsSubjects.appendChild(subjectElement);
    });
}

// 填充薄弱学科
function populateWeaknessesSubjects(weaknesses, subjectMap) {
    if (!weaknesses || weaknesses.length === 0) {
        weaknessesSubjects.innerHTML = `
            <div class="text-center py-6 text-gray-400">
                <p>各学科发展均衡，没有明显的薄弱学科</p>
            </div>
        `;
        return;
    }
    
    weaknessesSubjects.innerHTML = '';
    
    weaknesses.forEach(weakness => {
        const subjectName = subjectMap[weakness.key] || '未知学科';
        let trendIcon = '';
        
        if (weakness.trend === 'down') {
            trendIcon = '<i class="fa fa-arrow-down text-orange-600"></i> 需要加强';
        } else if (weakness.trend === 'up') {
            trendIcon = '<i class="fa fa-arrow-up text-green-600"></i> 正在进步';
        } else {
            trendIcon = '<i class="fa fa-minus text-gray-400"></i> 持平';
        }
        
        const subjectElement = document.createElement('div');
        subjectElement.className = 'border border-orange-100 bg-orange-50 p-4 rounded-lg mb-4';
        
        subjectElement.innerHTML = `
            <div class="font-medium flex justify-between">
                <span>${subjectName} (${weakness.score}分)</span>
                <span>${trendIcon}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2">${weakness.comment || '有较大提升空间'}</p>
            <div class="mt-2 pt-2 border-t border-orange-100">
                <p class="font-medium text-sm">薄弱知识点：</p>
                <ul class="text-sm text-gray-600 list-disc pl-5 mt-1">
                    ${weakness.knowledgePoints.map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
        `;
        
        weaknessesSubjects.appendChild(subjectElement);
    });
}

// 填充错题分析
function populateMistakesAnalysis(mistakesAnalysis, subjectMap) {
    if (!mistakesAnalysis || mistakesAnalysis.length === 0) {
        mistakesAnalysis.innerHTML = `
            <div class="text-center py-6 text-gray-400">
                <p>未找到相关错题数据</p>
            </div>
        `;
        return;
    }
    
    mistakesAnalysis.innerHTML = '';
    
    mistakesAnalysis.forEach(analysis => {
        const subjectName = subjectMap[analysis.subject] || '未知学科';
        
        const analysisElement = document.createElement('div');
        analysisElement.className = 'border border-blue-100 bg-blue-50 p-4 rounded-lg mb-4';
        
        analysisElement.innerHTML = `
            <div class="font-medium">${subjectName} - ${analysis.knowledgePoint}</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
                <div class="bg-white p-2 rounded">
                    <p class="text-gray-500">错误次数</p>
                    <p class="font-medium">${analysis.errorCount}次</p>
                </div>
                <div class="bg-white p-2 rounded">
                    <p class="text-gray-500">错误率</p>
                    <p class="font-medium">${analysis.errorRate}%</p>
                </div>
                <div class="bg-white p-2 rounded">
                    <p class="text-gray-500">相关知识点</p>
                    <p class="font-medium">${analysis.relatedKnowledge}</p>
                </div>
            </div>
            <p class="text-sm text-primary mt-2">改进建议: ${analysis.suggestion}</p>
        `;
        
        mistakesAnalysis.appendChild(analysisElement);
    });
}

// 填充提升建议
function populateImprovementSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        improvementSuggestions.innerHTML = `
            <div class="text-center py-6 text-gray-400">
                <p>暂无提升建议</p>
            </div>
        `;
        return;
    }
    
    improvementSuggestions.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'mb-6 last:mb-0';
        
        suggestionElement.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 mt-0.5">
                    ${index + 1}
                </div>
                <div>
                    <p class="font-medium">${suggestion.title}</p>
                    <p class="text-gray-600 mt-1">${suggestion.content}</p>
                    
                    ${suggestion.details && suggestion.details.length > 0 ? `
                        <div class="mt-3 pl-4 border-l-2 border-gray-100">
                            <p class="text-sm font-medium mb-2">具体措施：</p>
                            <ul class="text-sm text-gray-600 space-y-1">
                                ${suggestion.details.map(detail => `
                                    <li class="flex items-start">
                                        <i class="fa fa-check-circle text-green-500 mt-1 mr-2"></i>
                                        <span>${detail}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        improvementSuggestions.appendChild(suggestionElement);
    });
}

// 下载分析报告
function downloadAnalysisReport() {
    showNotification('正在准备报告下载...', 'info');
    
    // 在实际应用中，这里可以生成PDF或其他格式的报告
    setTimeout(() => {
        showNotification('报告下载功能即将上线', 'info');
    }, 1000);
}

// 显示错误信息
function showError(message) {
    loadingIndicator.classList.add('hidden');
    contentContainer.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    errorDetails.textContent = message;
}
    