/* ===================================
   儿童打卡积分系统 - 应用逻辑
   =================================== */

// 应用状态
const AppState = {
    tasks: [],
    rewards: [],
    history: [],
    recycleBin: [], // 回收箱
    stats: {
        totalPoints: 0,
        streakDays: 0,
        maxStreak: 0,
        totalCheckins: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        lastCheckInDate: null
    },
    // 锁定状态
    todayLocked: false,
    todaySignature: null,
    lockDate: null
};

// 防止统计出现负数
function clampStats() {
    const s = AppState.stats;
    s.totalPoints = Math.max(0, s.totalPoints || 0);
    s.totalEarned = Math.max(0, s.totalEarned || 0);
    s.totalRedeemed = Math.max(0, s.totalRedeemed || 0);
    s.totalCheckins = Math.max(0, s.totalCheckins || 0);
}

// 默认任务 - 日常任务
const defaultTasks = [
    { id: 1, emoji: '🌅', name: '早上准时起床', points: 1, completed: false },
    { id: 2, emoji: '📖', name: '早读', points: 2, completed: false },
    { id: 3, emoji: '🍳', name: '吃完早餐', points: 1, completed: false },
    { id: 4, emoji: '🚪', name: '准时出门', points: 1, completed: false },
    { id: 5, emoji: '✏️', name: '每晚做完作业', points: 2, completed: false },
    { id: 6, emoji: '📚', name: '复习3科', points: 3, completed: false },
    { id: 7, emoji: '📕', name: '阅读课外书', points: 2, completed: false },
    { id: 8, emoji: '🧹', name: '搞好自己房间卫生', points: 2, completed: false },
    { id: 9, emoji: '😴', name: '准时睡觉', points: 1, completed: false },
    // 额外加分项
    { id: 10, emoji: '🧹', name: '【加分】扫地', points: 2, completed: false },
    { id: 11, emoji: '👕', name: '【加分】收衣服', points: 2, completed: false },
    { id: 12, emoji: '👔', name: '【加分】收拾衣服', points: 2, completed: false },
    { id: 13, emoji: '👶', name: '【加分】主动帮妹妹或照顾妹妹', points: 3, completed: false }
];

// 默认奖励
const defaultRewards = [
    { id: 1, emoji: '📺', name: '看30分钟电视', cost: 50 },
    { id: 2, emoji: '🎬', name: '选择自己喜欢的电影', cost: 80 },
    { id: 3, emoji: '🎁', name: '购买20元内礼物', cost: 100 }
];

// DOM 元素缓存
const DOM = {};
// 文本转义防止 XSS
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    cacheDOM();
    loadData();
    initializeApp();
    bindEvents();
    // 初始渲染 UI (带动画)
    DOM.tasksList.classList.add('animate-in');
    DOM.shopList.classList.add('animate-in');
    DOM.historyList.classList.add('animate-in');
    updateUI();

    // 移除动画类，防止后续更新时重复动画
    setTimeout(() => {
        DOM.tasksList.classList.remove('animate-in');
        DOM.shopList.classList.remove('animate-in');
        DOM.historyList.classList.remove('animate-in');
    }, 1000);

    // 后台初始化 Supabase 并同步
    if (typeof initSupabaseAuto === 'function') {
        // 显示加载提示
        document.body.classList.add('loading');

        try {
            const supabaseOk = await initSupabaseAuto();
            if (supabaseOk) {
                // 尝试从云端加载数据
                await tryLoadFromCloud();
            }
        } catch (e) {
            console.error('Supabase init failed:', e);
        } finally {
            document.body.classList.remove('loading');
        }
    }
});

// 缓存 DOM 元素
function cacheDOM() {
    DOM.totalPoints = document.getElementById('totalPoints');
    DOM.pointsDisplay = document.querySelector('.points-display');
    DOM.digitalClock = document.getElementById('digitalClock');
    DOM.greeting = document.getElementById('greeting');
    DOM.currentDate = document.getElementById('currentDate');
    DOM.tasksList = document.getElementById('tasksList');
    DOM.shopList = document.getElementById('shopList');
    DOM.shopPoints = document.getElementById('shopPoints');
    DOM.historyList = document.getElementById('historyList');
    DOM.progressText = document.getElementById('progressText');
    DOM.progressFill = document.getElementById('progressFill');

    // 统计
    DOM.totalCheckins = document.getElementById('totalCheckins');
    DOM.totalEarned = document.getElementById('totalEarned');
    DOM.totalRedeemed = document.getElementById('totalRedeemed');
    DOM.maxStreak = document.getElementById('maxStreak');

    // 弹窗
    DOM.taskModal = document.getElementById('taskModal');
    DOM.rewardModal = document.getElementById('rewardModal');
    DOM.successModal = document.getElementById('successModal');
    DOM.passwordModal = document.getElementById('passwordModal');
    DOM.celebration = document.getElementById('celebration');

    // 表单
    DOM.taskEmoji = document.getElementById('taskEmoji');
    DOM.taskName = document.getElementById('taskName');
    DOM.taskPoints = document.getElementById('taskPoints');
    DOM.rewardEmoji = document.getElementById('rewardEmoji');
    DOM.rewardName = document.getElementById('rewardName');
    DOM.rewardPoints = document.getElementById('rewardPoints');
    DOM.earnedPoints = document.getElementById('earnedPoints');
    DOM.successMessage = document.getElementById('successMessage');

    // 签名相关
    DOM.signatureSection = document.getElementById('signatureSection');
    DOM.signatureCanvas = document.getElementById('signatureCanvas');
    DOM.signaturePlaceholder = document.getElementById('signaturePlaceholder');
    DOM.lockedNotice = document.getElementById('lockedNotice');
    DOM.lockedSignature = document.getElementById('lockedSignature');
    DOM.addTaskBtn = document.getElementById('addTaskBtn');

    // 密码相关
    DOM.unlockPassword = document.getElementById('unlockPassword');
    DOM.passwordError = document.getElementById('passwordError');

    // 确认弹窗相关
    DOM.confirmModal = document.getElementById('confirmModal');
    DOM.confirmIcon = document.getElementById('confirmIcon');
    DOM.confirmTitle = document.getElementById('confirmTitle');
    DOM.confirmMessage = document.getElementById('confirmMessage');
    DOM.confirmOk = document.getElementById('confirmOk');
    DOM.confirmCancel = document.getElementById('confirmCancel');

    // 回收箱相关
    DOM.recycleList = document.getElementById('recycleList');
    DOM.recycleEmpty = document.getElementById('recycleEmpty');

    // 奖励卡片相关
    DOM.rewardEmojiLarge = document.getElementById('rewardEmojiLarge');
    DOM.rewardNameLarge = document.getElementById('rewardNameLarge');
    DOM.rewardCostLarge = document.getElementById('rewardCostLarge');
}

// 从本地存储加载数据
function loadData() {
    const savedData = localStorage.getItem('kidsCheckinApp');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            AppState.tasks = data.tasks || [];
            AppState.rewards = data.rewards || [];
            AppState.history = data.history || [];
            AppState.recycleBin = data.recycleBin || [];
            AppState.stats = data.stats || AppState.stats;
            AppState.todayLocked = data.todayLocked || false;
            AppState.todaySignature = data.todaySignature || null;
            AppState.lockDate = data.lockDate || null;

            // 自动按任务 ID 排序，确保默认任务顺序正确
            AppState.tasks.sort((a, b) => a.id - b.id);

            // 检查是否是新的一天，如果是则重置任务完成状态
            checkNewDay();
            return;
        } catch (e) {
            console.warn('本地存储数据损坏，已重置', e);
            localStorage.removeItem('kidsCheckinApp');
        }
    }
    // 首次使用或数据损坏，初始化默认数据
    AppState.tasks = JSON.parse(JSON.stringify(defaultTasks));
    AppState.rewards = JSON.parse(JSON.stringify(defaultRewards));
    saveData();
}

// 保存数据到本地存储
function saveData() {
    const data = {
        tasks: AppState.tasks,
        rewards: AppState.rewards,
        history: AppState.history,
        recycleBin: AppState.recycleBin,
        stats: AppState.stats,
        todayLocked: AppState.todayLocked,
        todaySignature: AppState.todaySignature,
        lockDate: AppState.lockDate
    };
    localStorage.setItem('kidsCheckinApp', JSON.stringify(data));
    // 同步到云端（非阻塞，带节流）
    scheduleSyncToCloud();
    syncToCloud();
}

// 云同步节流/去抖
let syncTimer = null;
let syncInFlight = false;
function scheduleSyncToCloud() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
        if (syncInFlight) return; // 上一次还在进行，跳过本次
        syncInFlight = true;
        try {
            await syncToCloud();
        } finally {
            syncInFlight = false;
        }
    }, 2000); // 2s 去抖，避免频繁全量写
}
// 同步到 Supabase 云端
async function syncToCloud() {
    console.log('syncToCloud 被调用');
    console.log('isSupabaseReady:', typeof isSupabaseReady === 'function' ? isSupabaseReady() : 'function not found');

    if (typeof isSupabaseReady !== 'function' || !isSupabaseReady()) {
        console.log('Supabase 未就绪，跳过同步');
        return;
    }

    try {
        console.log('开始推送数据到云端...');
        await syncTasksToCloud(AppState.tasks);
        await syncRewardsToCloud(AppState.rewards);
        await syncStatsToCloud(AppState.stats);
        if (typeof syncHistoryToCloud === 'function') {
            await syncHistoryToCloud(AppState.history);
        }
        console.log('✅ 数据已成功推送到云端');
    } catch (error) {
        console.error('云端同步失败:', error);
    }
}

// 尝试从云端加载数据 - 优先云端数据以支持多设备同步
async function tryLoadFromCloud() {
    if (typeof isSupabaseReady !== 'function' || !isSupabaseReady()) return;

    try {
        // 始终先从云端加载最新数据
        const cloudTasks = await loadTasksFromCloud();
        const cloudRewards = await loadRewardsFromCloud();
        const cloudStats = await loadStatsFromCloud();
        const cloudHistory = typeof loadHistoryFromCloud === 'function' ? await loadHistoryFromCloud() : null;

        let hasCloudData = false;

        // 如果云端有任务数据，使用云端数据
        if (cloudTasks && cloudTasks.length > 0) {
            // 保留本地的完成状态（今天的打卡记录）
            const localCompletedIds = AppState.tasks
                .filter(t => t.completed)
                .map(t => t.id);

            AppState.tasks = cloudTasks.map(task => ({
                ...task,
                completed: localCompletedIds.includes(task.id) ? true : task.completed
            }));
            hasCloudData = true;
            console.log('从云端加载了任务');
        }

        if (cloudRewards && cloudRewards.length > 0) {
            AppState.rewards = cloudRewards;
            hasCloudData = true;
            console.log('从云端加载了奖励');
        }

        if (cloudStats) {
            // 直接使用云端统计数据，确保多设备同步一致
            AppState.stats = {
                totalPoints: cloudStats.totalPoints ?? AppState.stats.totalPoints ?? 0,
                streakDays: cloudStats.streakDays ?? AppState.stats.streakDays ?? 0,
                maxStreak: Math.max(cloudStats.maxStreak || 0, AppState.stats.maxStreak || 0), // 最长连续可以保留最大值
                totalCheckins: cloudStats.totalCheckins ?? AppState.stats.totalCheckins ?? 0,
                totalEarned: cloudStats.totalEarned ?? AppState.stats.totalEarned ?? 0,
                totalRedeemed: cloudStats.totalRedeemed ?? AppState.stats.totalRedeemed ?? 0,
                lastCheckInDate: cloudStats.lastCheckInDate || AppState.stats.lastCheckInDate
            };
            hasCloudData = true;
            console.log('从云端加载了统计，积分:', AppState.stats.totalPoints);
        }

        if (cloudHistory && cloudHistory.length > 0) {
            AppState.history = cloudHistory;
            hasCloudData = true;
            console.log('从云端加载了历史记录');
        }

        if (hasCloudData) {
            // 仅当实际有云端数据更新时才再次刷新 UI
            // 此时不包含 animate-in 类，所以不会重新播放入场动画
            updateUI();

            // 保存合并后的数据到本地
            localStorage.setItem('kidsCheckinApp', JSON.stringify({
                tasks: AppState.tasks,
                rewards: AppState.rewards,
                history: AppState.history,
                recycleBin: AppState.recycleBin,
                stats: AppState.stats,
                todayLocked: AppState.todayLocked,
                todaySignature: AppState.todaySignature,
                lockDate: AppState.lockDate
            }));
            console.log('云端数据已同步到本地');
        } else if (AppState.tasks.length > 0) {
            // 云端没有数据，但本地有，上传到云端
            await syncToCloud();
            console.log('本地数据已同步到云端');
        }
    } catch (error) {
        console.error('云端同步失败:', error);
    }
}

// 检查是否是新的一天
function checkNewDay() {
    const today = new Date().toDateString();
    const lastDate = AppState.stats.lastCheckInDate;
    const lockDate = AppState.lockDate;

    // 检查锁定状态是否需要重置
    if (lockDate && lockDate !== today) {
        AppState.todayLocked = false;
        AppState.todaySignature = null;
        AppState.lockDate = null;
    }

    if (lastDate && lastDate !== today) {
        // 检查是否是连续的一天
        const lastCheckIn = new Date(lastDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastCheckIn) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            // 连续打卡中断
            AppState.stats.streakDays = 0;
        }

        // 重置所有任务的完成状态
        AppState.tasks.forEach(task => {
            task.completed = false;
        });
        saveData();
    }
}

// 初始化应用
function initializeApp() {
    // 设置问候语
    updateGreeting();

    // 设置日期
    updateDate();

    // 初始化签名画布
    initSignatureCanvas();
}

// 更新问候语
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting;

    if (hour < 6) {
        greeting = '🌙 夜深了，早点睡觉哦！';
    } else if (hour < 9) {
        greeting = '🌅 早上好，小朋友！';
    } else if (hour < 12) {
        greeting = '☀️ 上午好，继续加油！';
    } else if (hour < 14) {
        greeting = '🍱 中午好，吃饭了吗？';
    } else if (hour < 18) {
        greeting = '🌤️ 下午好，加油哦！';
    } else if (hour < 21) {
        greeting = '🌆 晚上好，今天表现棒！';
    } else {
        greeting = '🌙 夜深了，准备睡觉吧！';
    }

    DOM.greeting.textContent = greeting;
}

// 更新日期显示
function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    DOM.currentDate.textContent = now.toLocaleDateString('zh-CN', options);
}

// 绑定事件
function bindEvents() {
    // 导航按钮
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });

    // 添加任务按钮 (需要密码验证)
    document.getElementById('addTaskBtn').addEventListener('click', () => {
        requirePassword(() => showModal('taskModal'));
    });
    document.getElementById('closeTaskModal').addEventListener('click', () => hideModal('taskModal'));
    document.getElementById('cancelTask').addEventListener('click', () => hideModal('taskModal'));
    document.getElementById('saveTask').addEventListener('click', saveNewTask);

    // 添加奖励按钮 (需要密码验证)
    document.getElementById('addRewardBtn').addEventListener('click', () => {
        requirePassword(() => showModal('rewardModal'));
    });
    document.getElementById('closeRewardModal').addEventListener('click', () => hideModal('rewardModal'));
    document.getElementById('cancelReward').addEventListener('click', () => hideModal('rewardModal'));
    document.getElementById('saveReward').addEventListener('click', saveNewReward);

    // 成功弹窗
    document.getElementById('closeSuccessModal').addEventListener('click', () => hideModal('successModal'));

    // 积分选择器
    document.querySelectorAll('#taskModal .points-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#taskModal .points-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            DOM.taskPoints.value = btn.dataset.points;
        });
    });

    document.querySelectorAll('#rewardModal .points-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#rewardModal .points-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            DOM.rewardPoints.value = btn.dataset.points;
        });
    });

    // 点击弹窗外部关闭
    [DOM.taskModal, DOM.rewardModal, DOM.successModal, DOM.passwordModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    // 签名相关事件
    document.getElementById('clearSignature').addEventListener('click', clearSignature);
    document.getElementById('submitWithSignature').addEventListener('click', submitWithSignature);

    // 解锁按钮
    document.getElementById('unlockBtn').addEventListener('click', () => showModal('passwordModal'));
    document.getElementById('closePasswordModal').addEventListener('click', () => {
        hideModal('passwordModal');
        DOM.unlockPassword.value = '';
        DOM.passwordError.textContent = '';
    });
    document.getElementById('cancelPassword').addEventListener('click', () => {
        hideModal('passwordModal');
        DOM.unlockPassword.value = '';
        DOM.passwordError.textContent = '';
    });
    document.getElementById('confirmPassword').addEventListener('click', handlePasswordConfirm);

    // 密码输入框回车确认
    DOM.unlockPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handlePasswordConfirm();
        }
    });
}

// 页面切换
// 页面切换
function switchPage(pageId) {
    // 找到当前活动页面
    const currentActive = document.querySelector('.page.active');
    const targetPage = document.getElementById(pageId);

    if (currentActive === targetPage) return;

    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // 平滑切换逻辑
    if (currentActive) {
        currentActive.style.opacity = '0';
        currentActive.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            currentActive.classList.remove('active');
            // 重置样式以便下次进入
            currentActive.style.opacity = '';
            currentActive.style.transform = '';

            targetPage.classList.add('active');
            // 强制重绘以触发 transition
            void targetPage.offsetWidth;
            targetPage.style.opacity = '1';
            targetPage.style.transform = 'translateX(0)';
        }, 300); // 等待过渡完成
    } else {
        // 首次加载
        targetPage.classList.add('active');
    }

    // 如果切换到商城，更新积分显示
    if (pageId === 'shopPage') {
        DOM.shopPoints.textContent = AppState.stats.totalPoints;
    }
}

// 显示弹窗
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

// 隐藏弹窗
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');

    // 清空表单
    if (modalId === 'taskModal') {
        DOM.taskName.value = '';
        DOM.taskEmoji.selectedIndex = 0;
        document.querySelectorAll('#taskModal .points-option').forEach((btn, index) => {
            btn.classList.toggle('active', index === 2);
        });
        DOM.taskPoints.value = '15';
    } else if (modalId === 'rewardModal') {
        DOM.rewardName.value = '';
        DOM.rewardEmoji.selectedIndex = 0;
        document.querySelectorAll('#rewardModal .points-option').forEach((btn, index) => {
            btn.classList.toggle('active', index === 1);
        });
        DOM.rewardPoints.value = '100';
    }
}

// 保存新任务
function saveNewTask() {
    const name = DOM.taskName.value.trim();
    if (!name) {
        alert('请输入任务名称！');
        return;
    }

    const newTask = {
        id: Date.now(),
        emoji: DOM.taskEmoji.value,
        name: name,
        points: parseInt(DOM.taskPoints.value),
        completed: false
    };

    AppState.tasks.push(newTask);
    saveData();
    renderTasks();
    hideModal('taskModal');
}

// 保存新奖励
function saveNewReward() {
    const name = DOM.rewardName.value.trim();
    if (!name) {
        alert('请输入奖励名称！');
        return;
    }

    const newReward = {
        id: Date.now(),
        emoji: DOM.rewardEmoji.value,
        name: name,
        cost: parseInt(DOM.rewardPoints.value)
    };

    AppState.rewards.push(newReward);
    saveData();
    renderRewards();
    hideModal('rewardModal');
}

// 任务打卡
function toggleTask(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.completed) {
        // 取消完成 - 扣除积分
        task.completed = false;
        AppState.stats.totalPoints -= task.points;
        AppState.stats.totalEarned -= task.points;
        AppState.stats.totalCheckins--;

        // 添加历史记录
        addHistory('undo', '❌ 取消 ' + task.name, -task.points);
    } else {
        // 标记完成
        task.completed = true;

        // 更新积分
        AppState.stats.totalPoints += task.points;
        AppState.stats.totalEarned += task.points;
        AppState.stats.totalCheckins++;

        // 更新连续打卡
        const today = new Date().toDateString();
        if (AppState.stats.lastCheckInDate !== today) {
            AppState.stats.streakDays++;
            AppState.stats.lastCheckInDate = today;

            if (AppState.stats.streakDays > AppState.stats.maxStreak) {
                AppState.stats.maxStreak = AppState.stats.streakDays;
            }
        }

        // 添加历史记录
        addHistory('checkin', task.emoji + ' ' + task.name, task.points);

        // 显示庆祝动画
        showCelebration(task.points);

        // 触发星星飞翔动画
        // 找到任务卡片元素
        setTimeout(() => {
            const taskCard = document.querySelector(`.task-card[data-id="${taskId}"]`);

            if (taskCard && DOM.pointsDisplay) {
                const startRect = taskCard.getBoundingClientRect();
                const endRect = DOM.pointsDisplay.getBoundingClientRect();

                // 从任务卡片中心飞到积分栏中心
                const startX = startRect.left + startRect.width / 2;
                const startY = startRect.top + startRect.height / 2;
                const endX = endRect.left + endRect.width / 2;
                const endY = endRect.top + endRect.height / 2;

                flyStar(startX, startY, endX, endY);

                // 积分栏高亮反馈
                setTimeout(() => {
                    DOM.pointsDisplay.classList.add('highlight');
                    setTimeout(() => DOM.pointsDisplay.classList.remove('highlight'), 500);
                }, 800); // 飞翔时间
            }
        }, 50);
    }
    clampStats();

    // 保存数据
    saveData();

    // 更新 UI
    updateUI();
}

// 删除任务 (移到回收箱) - 需要密码验证
function deleteTask(taskId) {
    requirePassword(() => {
        showConfirm(
            '🗑️',
            '删除任务',
            '任务将移到回收箱，可随时还原',
            () => {
                const task = AppState.tasks.find(t => t.id === taskId);
                if (task) {
                    // 添加到回收箱
                    AppState.recycleBin.push({
                        ...task,
                        deletedAt: new Date().toISOString()
                    });
                    // 从任务列表移除
                    AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
                    saveData();
                    renderTasks();
                    renderRecycleBin();
                    updateProgress();
                }
            }
        );
    });
}

// 渲染回收箱
function renderRecycleBin() {
    if (!DOM.recycleList) return;

    if (AppState.recycleBin.length === 0) {
        DOM.recycleList.innerHTML = '';
        DOM.recycleEmpty.style.display = 'block';
        return;
    }

    DOM.recycleEmpty.style.display = 'none';
    DOM.recycleList.innerHTML = AppState.recycleBin.map(task => `
        <div class="recycle-item">
            <div class="recycle-item-icon">${task.emoji}</div>
            <div class="recycle-item-info">
                <div class="recycle-item-name">${escapeHTML(task.name)}</div>
                <div class="recycle-item-points">+${task.points} ⭐</div>
            </div>
            <div class="recycle-item-actions">
                <button class="btn-restore" onclick="restoreTask(${task.id})">还原</button>
                <button class="btn-delete-permanent" onclick="deletePermanently(${task.id})">彻底删除</button>
            </div>
        </div>
    `).join('');
}

// 还原任务
function restoreTask(taskId) {
    const taskIndex = AppState.recycleBin.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = AppState.recycleBin[taskIndex];
    // 移除删除时间戳
    delete task.deletedAt;
    // 重置完成状态
    task.completed = false;

    // 找到正确的插入位置，保持原来的顺序
    // 默认任务 (id 1-13) 按照原始顺序插入
    // 用户创建的任务按照 id 顺序插入
    let insertIndex = AppState.tasks.length; // 默认添加到末尾

    for (let i = 0; i < AppState.tasks.length; i++) {
        if (AppState.tasks[i].id > task.id) {
            insertIndex = i;
            break;
        }
    }

    // 在正确位置插入任务
    AppState.tasks.splice(insertIndex, 0, task);
    // 从回收箱移除
    AppState.recycleBin.splice(taskIndex, 1);

    saveData();
    renderTasks();
    renderRecycleBin();
    updateProgress();
}

// 彻底删除任务
function deletePermanently(taskId) {
    showConfirm(
        '⚠️',
        '彻底删除',
        '此操作不可恢复，确定要彻底删除吗？',
        () => {
            AppState.recycleBin = AppState.recycleBin.filter(t => t.id !== taskId);
            saveData();
            renderRecycleBin();
        }
    );
}

// 兑换奖励
function redeemReward(rewardId) {
    const reward = AppState.rewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (AppState.stats.totalPoints < reward.cost) {
        showConfirm('💪', '积分不足', '继续加油打卡吧！', null);
        return;
    }

    showConfirm(
        '🎁',
        '确认兑换',
        `确定要用 ${reward.cost} 积分兑换"${reward.name}"吗？`,
        () => {
            // 扣除积分
            AppState.stats.totalPoints -= reward.cost;
            AppState.stats.totalRedeemed++;
            clampStats();

            // 添加历史记录
            addHistory('redeem', reward.emoji + ' ' + reward.name, -reward.cost);

            // 保存数据
            saveData();

            // 显示绚丽成功卡片
            DOM.rewardEmojiLarge.textContent = reward.emoji;
            DOM.rewardNameLarge.textContent = reward.name;
            DOM.rewardCostLarge.textContent = reward.cost;
            showModal('successModal');

            // 更新 UI
            updateUI();
        }
    );
}

// 删除奖励 - 需要密码验证
function deleteReward(rewardId) {
    requirePassword(() => {
        showConfirm(
            '🗑️',
            '删除奖励',
            '确定要删除这个奖励吗？',
            () => {
                AppState.rewards = AppState.rewards.filter(r => r.id !== rewardId);
                saveData();
                renderRewards();
            }
        );
    });
}

// 添加历史记录
function addHistory(type, text, points) {
    const record = {
        id: Date.now(),
        type: type,
        text: text,
        points: points,
        time: new Date().toISOString()
    };

    AppState.history.unshift(record);

    // 只保留最近100条记录
    if (AppState.history.length > 100) {
        AppState.history = AppState.history.slice(0, 100);
    }
}

// 显示庆祝动画
function showCelebration(points) {
    DOM.earnedPoints.textContent = points;
    DOM.celebration.classList.add('show');

    // 创建彩带
    createConfetti();

    setTimeout(() => {
        DOM.celebration.classList.remove('show');
    }, 1500);
}

// 创建彩带效果
function createConfetti() {
    const confetti = document.querySelector('.confetti');
    confetti.innerHTML = '';

    const colors = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -20px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            animation: confettiFall ${1 + Math.random()}s ease forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        confetti.appendChild(piece);
    }
}

// 添加彩带下落动画
const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        to {
            top: 100%;
            transform: rotate(${Math.random() * 720}deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 创建星星飞翔动画
function flyStar(startX, startY, endX, endY) {
    const star = document.createElement('div');
    star.className = 'flying-star';
    star.innerHTML = '⭐';
    star.style.left = startX + 'px';
    star.style.top = startY + 'px';

    document.body.appendChild(star);

    // 强制重绘
    void star.offsetWidth;

    // 设置结束位置和状态
    star.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.5)`;
    star.style.opacity = '0';

    // 动画结束后移除
    setTimeout(() => {
        document.body.removeChild(star);
    }, 800);
}

// 更新 UI
function updateUI() {
    DOM.totalPoints.textContent = AppState.stats.totalPoints;
    DOM.shopPoints.textContent = AppState.stats.totalPoints;

    // 更新统计
    DOM.totalCheckins.textContent = AppState.stats.totalCheckins;
    DOM.totalEarned.textContent = AppState.stats.totalEarned;
    DOM.totalRedeemed.textContent = AppState.stats.totalRedeemed;
    DOM.maxStreak.textContent = AppState.stats.maxStreak;

    renderTasks();
    renderRewards();
    renderHistory();
    renderRecycleBin();
    updateProgress();
}

// 更新电子时钟
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    if (DOM.digitalClock) {
        DOM.digitalClock.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// 启动时钟
setInterval(updateClock, 1000);
updateClock();


// 渲染任务列表
function renderTasks() {
    if (AppState.tasks.length === 0) {
        DOM.tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-text">还没有任务，点击下方添加吧！</div>
            </div>
        `;
        return;
    }

    DOM.tasksList.innerHTML = AppState.tasks.map(task => `
        <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}" onclick="toggleTask(${task.id})">
            <button class="task-delete" onclick="event.stopPropagation(); deleteTask(${task.id})">✕</button>
            <span class="task-emoji">${task.emoji}</span>
            <div class="task-content">
                <div class="task-name">${escapeHTML(task.name)}</div>
                <div class="task-points">+${task.points} ⭐</div>
            </div>
            <div class="task-check"></div>
        </div>
    `).join('');
}

// 渲染奖励列表
function renderRewards() {
    if (AppState.rewards.length === 0) {
        DOM.shopList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎁</div>
                <div class="empty-text">还没有奖励，点击下方添加吧！</div>
            </div>
        `;
        return;
    }

    DOM.shopList.innerHTML = AppState.rewards.map(reward => `
        <div class="reward-card">
            <button class="reward-delete" onclick="deleteReward(${reward.id})">✕</button>
            <span class="reward-emoji">${reward.emoji}</span>
            <div class="reward-name">${escapeHTML(reward.name)}</div>
            <div class="reward-cost">${reward.cost} ⭐</div>
            <button class="redeem-btn" 
                    onclick="redeemReward(${reward.id})"
                    ${AppState.stats.totalPoints < reward.cost ? 'disabled' : ''}>
                ${AppState.stats.totalPoints < reward.cost ? '积分不足' : '立即兑换'}
            </button>
        </div>
    `).join('');
}

// 渲染历史记录
function renderHistory() {
    if (AppState.history.length === 0) {
        DOM.historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">暂无记录</div>
            </div>
        `;
        return;
    }

    DOM.historyList.innerHTML = AppState.history.slice(0, 20).map(record => {
        const date = new Date(record.time);
        const timeStr = date.toLocaleDateString('zh-CN') + ' ' +
            date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="history-item">
                <span class="history-icon">${record.type === 'checkin' ? '✅' : '🎁'}</span>
                <div class="history-content">
                    <div class="history-text">${escapeHTML(record.text)}</div>
                    <div class="history-time">${timeStr}</div>
                </div>
                <span class="history-points ${record.points >= 0 ? 'positive' : 'negative'}">
                    ${record.points >= 0 ? '+' : ''}${record.points} ⭐
                </span>
            </div>
        `;
    }).join('');
}

// 更新进度条
function updateProgress() {
    const total = AppState.tasks.length;
    const completed = AppState.tasks.filter(t => t.completed).length;

    DOM.progressText.textContent = `${completed}/${total}`;
    DOM.progressFill.style.width = total > 0 ? `${(completed / total) * 100}%` : '0%';

    // 检查是否所有任务都完成了，显示签名区域
    updateLockStatus();
}

/* ===================================
   签名画布功能 (Apple Pencil 支持)
   =================================== */

// 签名画布状态
let signatureCtx = null;
let isDrawing = false;
let hasSignature = false;
let lastX = 0;
let lastY = 0;

// 初始化签名画布
function initSignatureCanvas() {
    const canvas = DOM.signatureCanvas;
    if (!canvas) return;

    signatureCtx = canvas.getContext('2d');

    // 设置画布尺寸
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 设置画笔样式
    signatureCtx.strokeStyle = '#1e293b';
    signatureCtx.lineWidth = 3;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';

    // 鼠标事件
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // 触摸事件 (Apple Pencil 支持) - 移除 passive:false 的警告
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // Apple Pencil 压力感应支持
    canvas.addEventListener('pointerdown', handlePointerStart);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);

    // 防止 iOS 上的滚动干扰
    canvas.style.touchAction = 'none';
    canvas.style.msTouchAction = 'none';
}

// 调整画布尺寸
function resizeCanvas() {
    const canvas = DOM.signatureCanvas;
    if (!canvas) return;

    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // 如果容器宽度为0，使用默认值或稍后重试
    let containerWidth = rect.width;
    if (containerWidth === 0) {
        containerWidth = wrapper.offsetWidth || canvas.offsetWidth || 300;
    }

    if (containerWidth === 0) {
        // 如果还是0，稍后重试
        setTimeout(resizeCanvas, 100);
        return;
    }

    // 设置画布实际尺寸（考虑像素比）
    canvas.width = containerWidth * dpr;
    canvas.height = 200 * dpr;

    // 设置画布 CSS 尺寸
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = '200px';

    signatureCtx = canvas.getContext('2d');
    signatureCtx.scale(dpr, dpr);
    signatureCtx.strokeStyle = '#1e293b';
    signatureCtx.lineWidth = 3;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';
}

// 开始绘制
function startDrawing(e) {
    isDrawing = true;
    const pos = getPosition(e);
    lastX = pos.x;
    lastY = pos.y;

    DOM.signatureCanvas.classList.add('signing', 'active');
    DOM.signaturePlaceholder.classList.add('hidden');
}

// 绘制
function draw(e) {
    if (!isDrawing) return;

    const pos = getPosition(e);

    signatureCtx.beginPath();
    signatureCtx.moveTo(lastX, lastY);
    signatureCtx.lineTo(pos.x, pos.y);
    signatureCtx.stroke();

    lastX = pos.x;
    lastY = pos.y;
    hasSignature = true;
}

// 停止绘制
function stopDrawing() {
    isDrawing = false;
    DOM.signatureCanvas.classList.remove('active');
}

// 获取位置
function getPosition(e) {
    const canvas = DOM.signatureCanvas;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined) {
        clientX = e.clientX;
        clientY = e.clientY;
    } else {
        return { x: lastX, y: lastY };
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return { x, y };
}

// 触摸开始
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing(touch);
}

// 触摸移动
function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    draw(touch);
}

// Pointer 事件 (Apple Pencil 压力感应)
function handlePointerStart(e) {
    if (e.pointerType === 'pen' || e.pointerType === 'touch' || e.pointerType === 'mouse') {
        // 根据压力调整线宽
        if (e.pressure > 0) {
            signatureCtx.lineWidth = 2 + e.pressure * 4;
        }
        startDrawing(e);
    }
}

function handlePointerMove(e) {
    if (!isDrawing) return;
    if (e.pointerType === 'pen' || e.pointerType === 'touch' || e.pointerType === 'mouse') {
        // 根据压力调整线宽
        if (e.pressure > 0) {
            signatureCtx.lineWidth = 2 + e.pressure * 4;
        }
        draw(e);
    }
}

// 清除签名
function clearSignature() {
    const canvas = DOM.signatureCanvas;
    if (!canvas || !signatureCtx) return;

    const rect = canvas.getBoundingClientRect();
    signatureCtx.clearRect(0, 0, rect.width, rect.height);
    hasSignature = false;
    canvas.classList.remove('signing');
    if (DOM.signaturePlaceholder) {
        DOM.signaturePlaceholder.classList.remove('hidden');
    }
}

// 提交并锁定
function submitWithSignature() {
    if (!hasSignature) {
        alert('请先签名再提交！');
        return;
    }

    // 检查是否有已完成的任务
    const completedCount = AppState.tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('还没有完成任何任务哦！');
        return;
    }

    // 保存签名图片
    const signatureData = DOM.signatureCanvas.toDataURL('image/png');

    // 更新状态
    AppState.todayLocked = true;
    AppState.todaySignature = signatureData;
    AppState.lockDate = new Date().toDateString();

    saveData();
    updateLockStatus();

    // 显示成功提示
    DOM.successMessage.textContent = '今日打卡已提交并锁定！明天继续加油哦！🎉';
    showModal('successModal');
}

// 更新锁定状态
function updateLockStatus() {
    const total = AppState.tasks.length;
    const completed = AppState.tasks.filter(t => t.completed).length;
    const allCompleted = total > 0 && completed === total;

    if (AppState.todayLocked) {
        // 已锁定状态
        DOM.signatureSection.classList.remove('show');
        DOM.lockedNotice.classList.add('show');
        DOM.tasksList.classList.add('locked');
        DOM.addTaskBtn.classList.add('hidden');

        // 显示保存的签名
        if (AppState.todaySignature) {
            DOM.lockedSignature.innerHTML = `<img src="${AppState.todaySignature}" alt="家长签名">`;
        }
    } else {
        // 未锁定状态
        DOM.lockedNotice.classList.remove('show');
        DOM.tasksList.classList.remove('locked');
        DOM.addTaskBtn.classList.remove('hidden');

        // 如果有已完成的任务，显示签名区域
        if (completed > 0) {
            const wasHidden = !DOM.signatureSection.classList.contains('show');
            DOM.signatureSection.classList.add('show');
            // 如果签名区域刚刚显示，重新调整画布尺寸
            if (wasHidden) {
                setTimeout(resizeCanvas, 50);
            }
        } else {
            DOM.signatureSection.classList.remove('show');
        }
    }
}

// 待执行的密码保护操作
let pendingAction = null;

// 要求密码验证后执行操作
function requirePassword(action) {
    pendingAction = action;
    showModal('passwordModal');
}

// 统一处理密码确认
function handlePasswordConfirm() {
    const password = DOM.unlockPassword.value;
    const correctPassword = '0000';

    if (password === correctPassword) {
        hideModal('passwordModal');
        DOM.unlockPassword.value = '';
        DOM.passwordError.textContent = '';

        // 如果有待执行的操作，执行它
        if (pendingAction) {
            const action = pendingAction;
            pendingAction = null;
            action();
        } else {
            // 原来的解锁功能
            AppState.todayLocked = false;
            AppState.todaySignature = null;
            AppState.lockDate = null;
            saveData();
            clearSignature();
            updateLockStatus();
            alert('已解锁！可以继续打卡了 💪');
        }
    } else {
        // 密码错误
        DOM.passwordError.textContent = '密码错误，请重试';
        DOM.unlockPassword.value = '';
        DOM.unlockPassword.focus();
    }
}

// 验证密码 (保留用于向后兼容)
function verifyPassword() {
    handlePasswordConfirm();
}

/* ===================================
   自定义确认弹窗
   =================================== */

// 确认回调函数
let confirmCallback = null;

// 显示确认弹窗
function showConfirm(icon, title, message, callback) {
    DOM.confirmIcon.textContent = icon;
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;
    confirmCallback = callback;

    // 如果没有回调函数，隐藏确定按钮只显示取消
    if (callback === null) {
        DOM.confirmOk.style.display = 'none';
        DOM.confirmCancel.textContent = '知道了';
    } else {
        DOM.confirmOk.style.display = 'block';
        DOM.confirmCancel.textContent = '取消';
    }

    showModal('confirmModal');
}

// 确认弹窗确定按钮事件
document.addEventListener('DOMContentLoaded', () => {
    // 确认按钮
    document.getElementById('confirmOk').addEventListener('click', () => {
        hideModal('confirmModal');
        if (confirmCallback) {
            confirmCallback();
            confirmCallback = null;
        }
    });

    // 取消按钮
    document.getElementById('confirmCancel').addEventListener('click', () => {
        hideModal('confirmModal');
        confirmCallback = null;
    });

    // 点击弹窗外部关闭
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmModal') {
            hideModal('confirmModal');
            confirmCallback = null;
        }
    });
});
