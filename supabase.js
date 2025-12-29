/* ===================================
   Supabase 客户端配置和 API
   =================================== */

// Supabase 配置
const SUPABASE_URL = 'https://tpcpgwvbujxncnhegwqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY3Bnd3ZidWp4bmNuaGVnd3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTk3MDIsImV4cCI6MjA4MjU3NTcwMn0.gwzRe5E5JAEw7i0w0IzunKpVd9aIvmtDGG1dtbGux18';

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 当前家庭信息
let currentFamily = null;

// ========== 家庭认证 API ==========

// 创建新家庭
async function createFamily(familyCode, familyName, password = '0000') {
    try {
        // 创建家庭记录
        const { data: family, error: familyError } = await supabase
            .from('families')
            .insert([{ family_code: familyCode, family_name: familyName, password: password }])
            .select()
            .single();

        if (familyError) throw familyError;

        // 创建家庭统计记录
        const { error: statsError } = await supabase
            .from('family_stats')
            .insert([{ family_id: family.id }]);

        if (statsError) throw statsError;

        // 插入默认任务
        const defaultTasks = [
            { family_id: family.id, emoji: '🌅', name: '早上准时起床', points: 1, sort_order: 1 },
            { family_id: family.id, emoji: '📖', name: '早读', points: 2, sort_order: 2 },
            { family_id: family.id, emoji: '🍳', name: '吃完早餐', points: 1, sort_order: 3 },
            { family_id: family.id, emoji: '🚪', name: '准时出门', points: 1, sort_order: 4 },
            { family_id: family.id, emoji: '✏️', name: '每晚做完作业', points: 2, sort_order: 5 },
            { family_id: family.id, emoji: '📚', name: '复习3科', points: 3, sort_order: 6 },
            { family_id: family.id, emoji: '📕', name: '阅读课外书', points: 2, sort_order: 7 },
            { family_id: family.id, emoji: '🧹', name: '搞好自己房间卫生', points: 2, sort_order: 8 },
            { family_id: family.id, emoji: '😴', name: '准时睡觉', points: 1, sort_order: 9 },
            { family_id: family.id, emoji: '🧹', name: '【加分】扫地', points: 2, sort_order: 10 },
            { family_id: family.id, emoji: '👕', name: '【加分】收衣服', points: 2, sort_order: 11 },
            { family_id: family.id, emoji: '👔', name: '【加分】收拾衣服', points: 2, sort_order: 12 },
            { family_id: family.id, emoji: '👶', name: '【加分】主动帮妹妹或照顾妹妹', points: 3, sort_order: 13 }
        ];

        const { error: tasksError } = await supabase
            .from('tasks')
            .insert(defaultTasks);

        if (tasksError) throw tasksError;

        // 插入默认奖励
        const defaultRewards = [
            { family_id: family.id, emoji: '📺', name: '看30分钟电视', cost: 50 },
            { family_id: family.id, emoji: '🎬', name: '选择自己喜欢的电影', cost: 80 },
            { family_id: family.id, emoji: '🎁', name: '购买20元内礼物', cost: 100 }
        ];

        const { error: rewardsError } = await supabase
            .from('rewards')
            .insert(defaultRewards);

        if (rewardsError) throw rewardsError;

        return { success: true, family };
    } catch (error) {
        console.error('创建家庭失败:', error);
        return { success: false, error: error.message };
    }
}

// 通过家庭码登录
async function loginFamily(familyCode) {
    try {
        const { data: family, error } = await supabase
            .from('families')
            .select('*')
            .eq('family_code', familyCode)
            .single();

        if (error) throw error;

        currentFamily = family;
        localStorage.setItem('familyCode', familyCode);
        return { success: true, family };
    } catch (error) {
        console.error('登录失败:', error);
        return { success: false, error: '家庭码不存在' };
    }
}

// 检查本地存储的登录状态
async function checkStoredLogin() {
    const storedCode = localStorage.getItem('familyCode');
    if (storedCode) {
        const result = await loginFamily(storedCode);
        return result.success;
    }
    return false;
}

// 登出
function logoutFamily() {
    currentFamily = null;
    localStorage.removeItem('familyCode');
}

// ========== 任务 API ==========

// 获取所有任务
async function fetchTasks() {
    if (!currentFamily) return [];

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', currentFamily.id)
        .eq('is_deleted', false)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('获取任务失败:', error);
        return [];
    }
    return data;
}

// 获取回收箱任务
async function fetchDeletedTasks() {
    if (!currentFamily) return [];

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', currentFamily.id)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

    if (error) {
        console.error('获取回收箱任务失败:', error);
        return [];
    }
    return data;
}

// 添加任务
async function addTask(emoji, name, points) {
    if (!currentFamily) return null;

    const { data: maxOrder } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('family_id', currentFamily.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

    const newOrder = (maxOrder?.sort_order || 0) + 1;

    const { data, error } = await supabase
        .from('tasks')
        .insert([{
            family_id: currentFamily.id,
            emoji,
            name,
            points,
            sort_order: newOrder
        }])
        .select()
        .single();

    if (error) {
        console.error('添加任务失败:', error);
        return null;
    }
    return data;
}

// 删除任务（移到回收箱）
async function deleteTask(taskId) {
    const { error } = await supabase
        .from('tasks')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', taskId);

    if (error) {
        console.error('删除任务失败:', error);
        return false;
    }
    return true;
}

// 还原任务
async function restoreTask(taskId) {
    const { error } = await supabase
        .from('tasks')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', taskId);

    if (error) {
        console.error('还原任务失败:', error);
        return false;
    }
    return true;
}

// 彻底删除任务
async function permanentlyDeleteTask(taskId) {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('彻底删除任务失败:', error);
        return false;
    }
    return true;
}

// ========== 打卡 API ==========

// 获取今日打卡状态
async function fetchTodayCheckins() {
    if (!currentFamily) return [];

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('family_id', currentFamily.id)
        .eq('check_date', today);

    if (error) {
        console.error('获取今日打卡失败:', error);
        return [];
    }
    return data;
}

// 打卡/取消打卡
async function toggleCheckin(taskId, completed) {
    if (!currentFamily) return false;

    const today = new Date().toISOString().split('T')[0];

    if (completed) {
        // 打卡
        const { error } = await supabase
            .from('daily_checkins')
            .upsert([{
                family_id: currentFamily.id,
                task_id: taskId,
                check_date: today,
                completed: true,
                completed_at: new Date().toISOString()
            }], { onConflict: 'family_id,task_id,check_date' });

        if (error) {
            console.error('打卡失败:', error);
            return false;
        }
    } else {
        // 取消打卡
        const { error } = await supabase
            .from('daily_checkins')
            .delete()
            .eq('family_id', currentFamily.id)
            .eq('task_id', taskId)
            .eq('check_date', today);

        if (error) {
            console.error('取消打卡失败:', error);
            return false;
        }
    }
    return true;
}

// ========== 奖励 API ==========

// 获取所有奖励
async function fetchRewards() {
    if (!currentFamily) return [];

    const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('family_id', currentFamily.id)
        .order('cost', { ascending: true });

    if (error) {
        console.error('获取奖励失败:', error);
        return [];
    }
    return data;
}

// 添加奖励
async function addReward(emoji, name, cost) {
    if (!currentFamily) return null;

    const { data, error } = await supabase
        .from('rewards')
        .insert([{
            family_id: currentFamily.id,
            emoji,
            name,
            cost
        }])
        .select()
        .single();

    if (error) {
        console.error('添加奖励失败:', error);
        return null;
    }
    return data;
}

// 删除奖励
async function deleteReward(rewardId) {
    const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

    if (error) {
        console.error('删除奖励失败:', error);
        return false;
    }
    return true;
}

// ========== 统计 API ==========

// 获取家庭统计
async function fetchStats() {
    if (!currentFamily) return null;

    const { data, error } = await supabase
        .from('family_stats')
        .select('*')
        .eq('family_id', currentFamily.id)
        .single();

    if (error) {
        console.error('获取统计失败:', error);
        return null;
    }
    return data;
}

// 更新统计
async function updateStats(updates) {
    if (!currentFamily) return false;

    const { error } = await supabase
        .from('family_stats')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('family_id', currentFamily.id);

    if (error) {
        console.error('更新统计失败:', error);
        return false;
    }
    return true;
}

// ========== 历史记录 API ==========

// 获取历史记录
async function fetchHistory(limit = 20) {
    if (!currentFamily) return [];

    const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('family_id', currentFamily.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('获取历史记录失败:', error);
        return [];
    }
    return data;
}

// 添加历史记录
async function addHistoryRecord(type, text, points) {
    if (!currentFamily) return null;

    const { data, error } = await supabase
        .from('history')
        .insert([{
            family_id: currentFamily.id,
            type,
            text,
            points
        }])
        .select()
        .single();

    if (error) {
        console.error('添加历史记录失败:', error);
        return null;
    }
    return data;
}

// 验证家庭密码
async function verifyFamilyPassword(password) {
    if (!currentFamily) return false;
    return currentFamily.password === password;
}
