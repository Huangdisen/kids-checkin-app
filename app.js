/* ===================================
   儿童打卡积分系统 - 应用逻辑 (Supabase 版本)
   =================================== */

// 应用状态
const AppState = {
    tasks: [],
    rewards: [],
    history: [],
    recycleBin: [],
    todayCheckins: [], // 今日打卡状态
    stats: {
        totalPoints: 0,
        streakDays: 0,
        maxStreak: 0,
        totalCheckins: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        lastCheckInDate: null
    },
    todayLocked: false,
    todaySignature: null,
    lockDate: null
};

// DOM 元素缓存
const DOM = {};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    cacheDOM();
    bindLoginEvents();

    // 检查是否已登录
    const isLoggedIn = await checkStoredLogin();
    if (isLoggedIn) {
        await enterApp();
    }
});

// 进入主应用
async function enterApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appContainer').style.display = 'block';

    await loadData();
    initializeApp();
    bindEvents();
    updateUI();
}

// 缓存 DOM 元素
function cacheDOM() {
    DOM.totalPoints = document.getElementById('totalPoints');
    DOM.streakDays = document.getElementById('streakDays');
    DOM.greeting = document.getElementById('greeting');
    DOM.currentDate = document.getElementById('currentDate');
    DOM.tasksList = document.getElementById('tasksList');
    DOM.shopList = document.getElementById('shopList');
    DOM.shopPoints = document.getElementById('shopPoints');
    DOM.historyList = document.getElementById('historyList');
    DOM.progressText = document.getElementById('progressText');
    DOM.progressFill = document.getElementById('progressFill');

    DOM.totalCheckins = document.getElementById('totalCheckins');
    DOM.totalEarned = document.getElementById('totalEarned');
    DOM.totalRedeemed = document.getElementById('totalRedeemed');
    DOM.maxStreak = document.getElementById('maxStreak');

    DOM.taskModal = document.getElementById('taskModal');
    DOM.rewardModal = document.getElementById('rewardModal');
    DOM.successModal = document.getElementById('successModal');
    DOM.passwordModal = document.getElementById('passwordModal');
    DOM.celebration = document.getElementById('celebration');

    DOM.taskEmoji = document.getElementById('taskEmoji');
    DOM.taskName = document.getElementById('taskName');
    DOM.taskPoints = document.getElementById('taskPoints');
    DOM.rewardEmoji = document.getElementById('rewardEmoji');
    DOM.rewardName = document.getElementById('rewardName');
    DOM.rewardPoints = document.getElementById('rewardPoints');
    DOM.earnedPoints = document.getElementById('earnedPoints');

    DOM.signatureSection = document.getElementById('signatureSection');
    DOM.signatureCanvas = document.getElementById('signatureCanvas');
    DOM.signaturePlaceholder = document.getElementById('signaturePlaceholder');
    DOM.lockedNotice = document.getElementById('lockedNotice');
    DOM.lockedSignature = document.getElementById('lockedSignature');
    DOM.addTaskBtn = document.getElementById('addTaskBtn');

    DOM.unlockPassword = document.getElementById('unlockPassword');
    DOM.passwordError = document.getElementById('passwordError');

    DOM.confirmModal = document.getElementById('confirmModal');
    DOM.confirmIcon = document.getElementById('confirmIcon');
    DOM.confirmTitle = document.getElementById('confirmTitle');
    DOM.confirmMessage = document.getElementById('confirmMessage');
    DOM.confirmOk = document.getElementById('confirmOk');
    DOM.confirmCancel = document.getElementById('confirmCancel');

    DOM.recycleList = document.getElementById('recycleList');
    DOM.recycleEmpty = document.getElementById('recycleEmpty');

    DOM.rewardEmojiLarge = document.getElementById('rewardEmojiLarge');
    DOM.rewardNameLarge = document.getElementById('rewardNameLarge');
    DOM.rewardCostLarge = document.getElementById('rewardCostLarge');

    // 登录相关
    DOM.loginPage = document.getElementById('loginPage');
    DOM.appContainer = document.getElementById('appContainer');
    DOM.familyCodeInput = document.getElementById('familyCodeInput');
    DOM.loginBtn = document.getElementById('loginBtn');
    DOM.loginError = document.getElementById('loginError');
}

// 绑定登录相关事件
function bindLoginEvents() {
    // 登录按钮
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('familyCodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 创建家庭
    document.getElementById('showCreateFamily').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('createFamilyModal');
    });
    document.getElementById('closeCreateFamily').addEventListener('click', () => hideModal('createFamilyModal'));
    document.getElementById('cancelCreateFamily').addEventListener('click', () => hideModal('createFamilyModal'));
    document.getElementById('confirmCreateFamily').addEventListener('click', handleCreateFamily);
}

// 处理登录
async function handleLogin() {
    const familyCode = document.getElementById('familyCodeInput').value.trim();
    if (!familyCode) {
        document.getElementById('loginError').textContent = '请输入家庭码';
        return;
    }

    document.getElementById('loginBtn').textContent = '登录中...';
    document.getElementById('loginBtn').disabled = true;

    const result = await loginFamily(familyCode);

    if (result.success) {
        await enterApp();
    } else {
        document.getElementById('loginError').textContent = result.error;
    }

    document.getElementById('loginBtn').textContent = '进入';
    document.getElementById('loginBtn').disabled = false;
}

// 处理创建家庭
async function handleCreateFamily() {
    const familyName = document.getElementById('newFamilyName').value.trim();
    const familyCode = document.getElementById('newFamilyCode').value.trim();
    const password = document.getElementById('newFamilyPassword').value.trim() || '0000';

    if (!familyName || !familyCode) {
        alert('请填写家庭名称和家庭码');
        return;
    }

    if (familyCode.length < 4) {
        alert('家庭码至少需要4个字符');
        return;
    }

    document.getElementById('confirmCreateFamily').textContent = '创建中...';
    document.getElementById('confirmCreateFamily').disabled = true;

    const result = await createFamily(familyCode, familyName, password);

    if (result.success) {
        hideModal('createFamilyModal');
        document.getElementById('familyCodeInput').value = familyCode;
        alert('家庭创建成功！请记住您的家庭码: ' + familyCode);
        await handleLogin();
    } else {
        alert('创建失败: ' + result.error);
    }

    document.getElementById('confirmCreateFamily').textContent = '创建家庭';
    document.getElementById('confirmCreateFamily').disabled = false;
}

// 从 Supabase 加载数据
async function loadData() {
    // 加载任务
    AppState.tasks = await fetchTasks();

    // 加载今日打卡状态
    AppState.todayCheckins = await fetchTodayCheckins();

    // 合并打卡状态到任务
    AppState.tasks.forEach(task => {
        const checkin = AppState.todayCheckins.find(c => c.task_id === task.id);
        task.completed = checkin ? checkin.completed : false;
    });

    // 加载回收箱
    AppState.recycleBin = await fetchDeletedTasks();

    // 加载奖励
    AppState.rewards = await fetchRewards();

    // 加载统计
    const stats = await fetchStats();
    if (stats) {
        AppState.stats = {
            totalPoints: stats.total_points || 0,
            streakDays: stats.streak_days || 0,
            maxStreak: stats.max_streak || 0,
            totalCheckins: stats.total_checkins || 0,
            totalEarned: stats.total_earned || 0,
            totalRedeemed: stats.total_redeemed || 0,
            lastCheckInDate: stats.last_checkin_date
        };
        AppState.todayLocked = stats.today_locked || false;
        AppState.todaySignature = stats.today_signature;
        AppState.lockDate = stats.lock_date;
    }

    // 加载历史记录
    AppState.history = await fetchHistory();

    // 检查是否是新的一天
    checkNewDay();
}

// 检查是否是新的一天
function checkNewDay() {
    const today = new Date().toISOString().split('T')[0];
    const lockDate = AppState.lockDate;

    if (lockDate && lockDate !== today) {
        AppState.todayLocked = false;
        AppState.todaySignature = null;
        AppState.lockDate = null;

        // 更新服务器
        updateStats({
            today_locked: false,
            today_signature: null,
            lock_date: null
        });
    }
}

// 初始化应用
function initializeApp() {
    updateGreeting();
    updateDate();
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

    if (DOM.greeting) DOM.greeting.textContent = greeting;
}

// 更新日期显示
function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    if (DOM.currentDate) DOM.currentDate.textContent = now.toLocaleDateString('zh-CN', options);
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
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        }
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

    DOM.unlockPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handlePasswordConfirm();
        }
    });
}

// 页面切换
function switchPage(pageId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === pageId);
    });

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
async function saveNewTask() {
    const name = DOM.taskName.value.trim();
    if (!name) {
        alert('请输入任务名称！');
        return;
    }

    const newTask = await addTask(
        DOM.taskEmoji.value,
        name,
        parseInt(DOM.taskPoints.value)
    );

    if (newTask) {
        newTask.completed = false;
        AppState.tasks.push(newTask);
        renderTasks();
        hideModal('taskModal');
    } else {
        alert('添加任务失败，请重试');
    }
}

// 保存新奖励
async function saveNewReward() {
    const name = DOM.rewardName.value.trim();
    if (!name) {
        alert('请输入奖励名称！');
        return;
    }

    const newReward = await addReward(
        DOM.rewardEmoji.value,
        name,
        parseInt(DOM.rewardPoints.value)
    );

    if (newReward) {
        AppState.rewards.push(newReward);
        renderRewards();
        hideModal('rewardModal');
    } else {
        alert('添加奖励失败，请重试');
    }
}

// 任务打卡
async function toggleTaskById(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;

    // 先更新UI
    task.completed = newCompleted;

    // 更新服务器
    const success = await toggleCheckin(taskId, newCompleted);
    if (!success) {
        task.completed = !newCompleted; // 恢复状态
        alert('操作失败，请重试');
        updateUI();
        return;
    }

    if (newCompleted) {
        // 打卡成功
        AppState.stats.totalPoints += task.points;
        AppState.stats.totalEarned += task.points;
        AppState.stats.totalCheckins++;

        const today = new Date().toISOString().split('T')[0];
        if (AppState.stats.lastCheckInDate !== today) {
            AppState.stats.streakDays++;
            AppState.stats.lastCheckInDate = today;
            if (AppState.stats.streakDays > AppState.stats.maxStreak) {
                AppState.stats.maxStreak = AppState.stats.streakDays;
            }
        }

        await addHistoryRecord('checkin', task.emoji + ' ' + task.name, task.points);
        showCelebration(task.points);
    } else {
        // 取消打卡
        AppState.stats.totalPoints -= task.points;
        AppState.stats.totalEarned -= task.points;
        AppState.stats.totalCheckins--;

        await addHistoryRecord('cancel', '❌ 取消: ' + task.emoji + ' ' + task.name, -task.points);
    }

    // 更新服务器统计
    await updateStats({
        total_points: AppState.stats.totalPoints,
        total_earned: AppState.stats.totalEarned,
        total_checkins: AppState.stats.totalCheckins,
        streak_days: AppState.stats.streakDays,
        max_streak: AppState.stats.maxStreak,
        last_checkin_date: AppState.stats.lastCheckInDate
    });

    updateUI();
}

// 删除任务 (移到回收箱)
function deleteTaskById(taskId) {
    requirePassword(() => {
        showConfirm(
            '🗑️',
            '删除任务',
            '任务将移到回收箱，可随时还原',
            async () => {
                const success = await deleteTask(taskId);
                if (success) {
                    const task = AppState.tasks.find(t => t.id === taskId);
                    if (task) {
                        AppState.recycleBin.unshift({ ...task, deleted_at: new Date().toISOString() });
                        AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
                    }
                    renderTasks();
                    renderRecycleBin();
                    updateProgress();
                }
            }
        );
    });
}

// 还原任务
async function restoreTaskById(taskId) {
    const success = await restoreTask(taskId);
    if (success) {
        const task = AppState.recycleBin.find(t => t.id === taskId);
        if (task) {
            delete task.deleted_at;
            task.completed = false;

            let insertIndex = AppState.tasks.length;
            for (let i = 0; i < AppState.tasks.length; i++) {
                if (AppState.tasks[i].id > task.id) {
                    insertIndex = i;
                    break;
                }
            }
            AppState.tasks.splice(insertIndex, 0, task);
            AppState.recycleBin = AppState.recycleBin.filter(t => t.id !== taskId);
        }
        renderTasks();
        renderRecycleBin();
        updateProgress();
    }
}

// 彻底删除任务
function deletePermanentlyById(taskId) {
    showConfirm(
        '⚠️',
        '彻底删除',
        '此操作不可恢复，确定要彻底删除吗？',
        async () => {
            const success = await permanentlyDeleteTask(taskId);
            if (success) {
                AppState.recycleBin = AppState.recycleBin.filter(t => t.id !== taskId);
                renderRecycleBin();
            }
        }
    );
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
                <div class="recycle-item-name">${task.name}</div>
                <div class="recycle-item-points">+${task.points} ⭐</div>
            </div>
            <div class="recycle-item-actions">
                <button class="btn-restore" onclick="restoreTaskById(${task.id})">还原</button>
                <button class="btn-delete-permanent" onclick="deletePermanentlyById(${task.id})">彻底删除</button>
            </div>
        </div>
    `).join('');
}

// 兑换奖励
async function redeemRewardById(rewardId) {
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
        async () => {
            AppState.stats.totalPoints -= reward.cost;
            AppState.stats.totalRedeemed++;

            await addHistoryRecord('redeem', reward.emoji + ' ' + reward.name, -reward.cost);

            await updateStats({
                total_points: AppState.stats.totalPoints,
                total_redeemed: AppState.stats.totalRedeemed
            });

            DOM.rewardEmojiLarge.textContent = reward.emoji;
            DOM.rewardNameLarge.textContent = reward.name;
            DOM.rewardCostLarge.textContent = reward.cost;
            showModal('successModal');

            updateUI();
        }
    );
}

// 删除奖励
function deleteRewardById(rewardId) {
    requirePassword(() => {
        showConfirm(
            '🗑️',
            '删除奖励',
            '确定要删除这个奖励吗？',
            async () => {
                const success = await deleteReward(rewardId);
                if (success) {
                    AppState.rewards = AppState.rewards.filter(r => r.id !== rewardId);
                    renderRewards();
                }
            }
        );
    });
}

// 显示庆祝动画
function showCelebration(points) {
    if (DOM.earnedPoints) DOM.earnedPoints.textContent = points;
    if (DOM.celebration) {
        DOM.celebration.classList.add('show');
        createConfetti();
        setTimeout(() => {
            DOM.celebration.classList.remove('show');
        }, 1500);
    }
}

// 创建彩带效果
function createConfetti() {
    const confetti = document.querySelector('.confetti');
    if (!confetti) return;
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

// 更新 UI
function updateUI() {
    if (DOM.totalPoints) DOM.totalPoints.textContent = AppState.stats.totalPoints;
    if (DOM.streakDays) DOM.streakDays.textContent = AppState.stats.streakDays;
    if (DOM.shopPoints) DOM.shopPoints.textContent = AppState.stats.totalPoints;

    if (DOM.totalCheckins) DOM.totalCheckins.textContent = AppState.stats.totalCheckins;
    if (DOM.totalEarned) DOM.totalEarned.textContent = AppState.stats.totalEarned;
    if (DOM.totalRedeemed) DOM.totalRedeemed.textContent = AppState.stats.totalRedeemed;
    if (DOM.maxStreak) DOM.maxStreak.textContent = AppState.stats.maxStreak;

    renderTasks();
    renderRewards();
    renderHistory();
    renderRecycleBin();
    updateProgress();
}

// 渲染任务列表
function renderTasks() {
    if (!DOM.tasksList) return;

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
        <div class="task-card ${task.completed ? 'completed' : ''}" onclick="toggleTaskById(${task.id})">
            <button class="task-delete" onclick="event.stopPropagation(); deleteTaskById(${task.id})">✕</button>
            <span class="task-emoji">${task.emoji}</span>
            <div class="task-content">
                <div class="task-name">${task.name}</div>
                <div class="task-points">+${task.points} ⭐</div>
            </div>
            <div class="task-check"></div>
        </div>
    `).join('');
}

// 渲染奖励列表
function renderRewards() {
    if (!DOM.shopList) return;

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
            <button class="reward-delete" onclick="deleteRewardById(${reward.id})">✕</button>
            <span class="reward-emoji">${reward.emoji}</span>
            <div class="reward-name">${reward.name}</div>
            <div class="reward-cost">${reward.cost} ⭐</div>
            <button class="redeem-btn" 
                    onclick="redeemRewardById(${reward.id})"
                    ${AppState.stats.totalPoints < reward.cost ? 'disabled' : ''}>
                ${AppState.stats.totalPoints < reward.cost ? '积分不足' : '立即兑换'}
            </button>
        </div>
    `).join('');
}

// 渲染历史记录
function renderHistory() {
    if (!DOM.historyList) return;

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
        const date = new Date(record.created_at);
        const timeStr = date.toLocaleDateString('zh-CN') + ' ' +
            date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="history-item">
                <span class="history-icon">${record.type === 'checkin' ? '✅' : record.type === 'cancel' ? '❌' : '🎁'}</span>
                <div class="history-content">
                    <div class="history-text">${record.text}</div>
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

    if (DOM.progressText) DOM.progressText.textContent = `${completed}/${total}`;
    if (DOM.progressFill) DOM.progressFill.style.width = total > 0 ? `${(completed / total) * 100}%` : '0%';

    updateLockStatus();
}

/* ===================================
   签名画布功能
   =================================== */

let signatureCtx = null;
let isDrawing = false;
let hasSignature = false;
let lastX = 0;
let lastY = 0;

function initSignatureCanvas() {
    const canvas = DOM.signatureCanvas;
    if (!canvas) return;

    signatureCtx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    signatureCtx.strokeStyle = '#1e293b';
    signatureCtx.lineWidth = 3;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    canvas.addEventListener('pointerdown', handlePointerStart);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
}

function resizeCanvas() {
    const canvas = DOM.signatureCanvas;
    if (!canvas) return;

    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    let containerWidth = rect.width;
    if (containerWidth === 0) {
        containerWidth = wrapper.offsetWidth || canvas.offsetWidth || 300;
    }

    if (containerWidth === 0) {
        setTimeout(resizeCanvas, 100);
        return;
    }

    canvas.width = containerWidth * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = '200px';

    signatureCtx = canvas.getContext('2d');
    signatureCtx.scale(dpr, dpr);
    signatureCtx.strokeStyle = '#1e293b';
    signatureCtx.lineWidth = 3;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getPosition(e);
    lastX = pos.x;
    lastY = pos.y;
    if (DOM.signatureCanvas) DOM.signatureCanvas.classList.add('signing', 'active');
    if (DOM.signaturePlaceholder) DOM.signaturePlaceholder.classList.add('hidden');
}

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

function stopDrawing() {
    isDrawing = false;
    if (DOM.signatureCanvas) DOM.signatureCanvas.classList.remove('active');
}

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
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function handleTouchStart(e) {
    e.preventDefault();
    startDrawing(e.touches[0]);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    draw(e.touches[0]);
}

function handlePointerStart(e) {
    if (e.pointerType === 'pen' || e.pointerType === 'touch' || e.pointerType === 'mouse') {
        if (e.pressure > 0) signatureCtx.lineWidth = 2 + e.pressure * 4;
        startDrawing(e);
    }
}

function handlePointerMove(e) {
    if (!isDrawing) return;
    if (e.pointerType === 'pen' || e.pointerType === 'touch' || e.pointerType === 'mouse') {
        if (e.pressure > 0) signatureCtx.lineWidth = 2 + e.pressure * 4;
        draw(e);
    }
}

function clearSignature() {
    const canvas = DOM.signatureCanvas;
    if (!canvas || !signatureCtx) return;
    const rect = canvas.getBoundingClientRect();
    signatureCtx.clearRect(0, 0, rect.width, rect.height);
    hasSignature = false;
    canvas.classList.remove('signing');
    if (DOM.signaturePlaceholder) DOM.signaturePlaceholder.classList.remove('hidden');
}

async function submitWithSignature() {
    if (!hasSignature) {
        alert('请先签名再提交！');
        return;
    }

    const completedCount = AppState.tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('还没有完成任何任务哦！');
        return;
    }

    const signatureData = DOM.signatureCanvas.toDataURL('image/png');

    AppState.todayLocked = true;
    AppState.todaySignature = signatureData;
    AppState.lockDate = new Date().toISOString().split('T')[0];

    await updateStats({
        today_locked: true,
        today_signature: signatureData,
        lock_date: AppState.lockDate
    });

    updateLockStatus();
    alert('今日打卡已提交并锁定！明天继续加油哦！🎉');
}

function updateLockStatus() {
    const total = AppState.tasks.length;
    const completed = AppState.tasks.filter(t => t.completed).length;

    if (AppState.todayLocked) {
        if (DOM.signatureSection) DOM.signatureSection.classList.remove('show');
        if (DOM.lockedNotice) DOM.lockedNotice.classList.add('show');
        if (DOM.tasksList) DOM.tasksList.classList.add('locked');
        if (DOM.addTaskBtn) DOM.addTaskBtn.classList.add('hidden');

        if (AppState.todaySignature && DOM.lockedSignature) {
            DOM.lockedSignature.innerHTML = `<img src="${AppState.todaySignature}" alt="家长签名">`;
        }
    } else {
        if (DOM.lockedNotice) DOM.lockedNotice.classList.remove('show');
        if (DOM.tasksList) DOM.tasksList.classList.remove('locked');
        if (DOM.addTaskBtn) DOM.addTaskBtn.classList.remove('hidden');

        if (completed > 0) {
            const wasHidden = DOM.signatureSection && !DOM.signatureSection.classList.contains('show');
            if (DOM.signatureSection) DOM.signatureSection.classList.add('show');
            if (wasHidden) setTimeout(resizeCanvas, 50);
        } else {
            if (DOM.signatureSection) DOM.signatureSection.classList.remove('show');
        }
    }
}

/* ===================================
   密码验证
   =================================== */

let pendingAction = null;

function requirePassword(action) {
    pendingAction = action;
    showModal('passwordModal');
}

async function handlePasswordConfirm() {
    const password = DOM.unlockPassword.value;
    const isCorrect = await verifyFamilyPassword(password);

    if (isCorrect) {
        hideModal('passwordModal');
        DOM.unlockPassword.value = '';
        DOM.passwordError.textContent = '';

        if (pendingAction) {
            const action = pendingAction;
            pendingAction = null;
            action();
        } else {
            AppState.todayLocked = false;
            AppState.todaySignature = null;
            AppState.lockDate = null;

            await updateStats({
                today_locked: false,
                today_signature: null,
                lock_date: null
            });

            clearSignature();
            updateLockStatus();
            alert('已解锁！可以继续打卡了 💪');
        }
    } else {
        DOM.passwordError.textContent = '密码错误，请重试';
        DOM.unlockPassword.value = '';
        DOM.unlockPassword.focus();
    }
}

/* ===================================
   自定义确认弹窗
   =================================== */

let confirmCallback = null;

function showConfirm(icon, title, message, callback) {
    DOM.confirmIcon.textContent = icon;
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;
    confirmCallback = callback;

    if (callback) {
        DOM.confirmOk.style.display = 'block';
        DOM.confirmOk.onclick = () => {
            hideModal('confirmModal');
            if (confirmCallback) confirmCallback();
        };
    } else {
        DOM.confirmOk.style.display = 'none';
    }

    DOM.confirmCancel.onclick = () => hideModal('confirmModal');
    showModal('confirmModal');
}

// 彩带动画样式
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
