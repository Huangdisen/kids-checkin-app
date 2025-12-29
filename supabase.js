/* ===================================
   Supabase 简化版 - 自动连接固定家庭
   =================================== */

// Supabase 配置
const SUPABASE_URL = 'https://tpcpgwvbujxncnhegwqm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY3Bnd3ZidWp4bmNuaGVnd3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTk3MDIsImV4cCI6MjA4MjU3NTcwMn0.gwzRe5E5JAEw7i0w0IzunKpVd9aIvmtDGG1dtbGux18';

// 固定的家庭码 - 无需登录
const FIXED_FAMILY_CODE = 'starfamily';
const FIXED_FAMILY_NAME = '小星星之家';

let supabaseClient = null;
let currentFamilyId = null;
let supabaseReady = false;

// 初始化 Supabase 并自动连接家庭
async function initSupabaseAuto() {
    try {
        if (!window.supabase || !window.supabase.createClient) {
            console.error('Supabase SDK 未加载');
            return false;
        }

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase 客户端创建成功');

        // 尝试获取或创建固定家庭
        let { data: family, error } = await supabaseClient
            .from('families')
            .select('id')
            .eq('family_code', FIXED_FAMILY_CODE)
            .single();

        if (error || !family) {
            // 家庭不存在，创建新家庭
            console.log('创建新家庭...');
            const { data: newFamily, error: createError } = await supabaseClient
                .from('families')
                .insert([{
                    family_code: FIXED_FAMILY_CODE,
                    family_name: FIXED_FAMILY_NAME,
                    password: '0000'
                }])
                .select('id')
                .single();

            if (createError) {
                console.error('创建家庭失败:', createError);
                return false;
            }

            family = newFamily;

            // 创建家庭统计记录
            await supabaseClient
                .from('family_stats')
                .insert([{ family_id: family.id }]);
        }

        currentFamilyId = family.id;
        supabaseReady = true;
        console.log('Supabase 初始化成功，家庭ID:', currentFamilyId);
        return true;

    } catch (error) {
        console.error('Supabase 初始化失败:', error);
        return false;
    }
}

// ========== 数据同步 API ==========

// 同步任务到云端
async function syncTasksToCloud(tasks) {
    if (!supabaseReady) return;

    try {
        // 删除旧任务
        await supabaseClient
            .from('tasks')
            .delete()
            .eq('family_id', currentFamilyId);

        // 插入新任务
        if (tasks.length > 0) {
            const cloudTasks = tasks.map((task, index) => ({
                family_id: currentFamilyId,
                emoji: task.emoji,
                name: task.name,
                points: task.points,
                sort_order: index,
                is_deleted: false
            }));

            await supabaseClient
                .from('tasks')
                .insert(cloudTasks);
        }
        console.log('任务同步成功');
    } catch (error) {
        console.error('任务同步失败:', error);
    }
}

// 从云端加载任务
async function loadTasksFromCloud() {
    if (!supabaseReady) return null;

    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('family_id', currentFamilyId)
            .eq('is_deleted', false)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        // 转换为本地格式
        return data.map(task => ({
            id: task.id,
            emoji: task.emoji,
            name: task.name,
            points: task.points,
            completed: false
        }));
    } catch (error) {
        console.error('加载任务失败:', error);
        return null;
    }
}

// 同步奖励到云端
async function syncRewardsToCloud(rewards) {
    if (!supabaseReady) return;

    try {
        await supabaseClient
            .from('rewards')
            .delete()
            .eq('family_id', currentFamilyId);

        if (rewards.length > 0) {
            const cloudRewards = rewards.map(reward => ({
                family_id: currentFamilyId,
                emoji: reward.emoji,
                name: reward.name,
                cost: reward.cost
            }));

            await supabaseClient
                .from('rewards')
                .insert(cloudRewards);
        }
        console.log('奖励同步成功');
    } catch (error) {
        console.error('奖励同步失败:', error);
    }
}

// 从云端加载奖励
async function loadRewardsFromCloud() {
    if (!supabaseReady) return null;

    try {
        const { data, error } = await supabaseClient
            .from('rewards')
            .select('*')
            .eq('family_id', currentFamilyId)
            .order('cost', { ascending: true });

        if (error) throw error;

        return data.map(reward => ({
            id: reward.id,
            emoji: reward.emoji,
            name: reward.name,
            cost: reward.cost
        }));
    } catch (error) {
        console.error('加载奖励失败:', error);
        return null;
    }
}

// 同步统计到云端
async function syncStatsToCloud(stats) {
    if (!supabaseReady) return;

    try {
        await supabaseClient
            .from('family_stats')
            .update({
                total_points: stats.totalPoints,
                streak_days: stats.streakDays,
                max_streak: stats.maxStreak,
                total_checkins: stats.totalCheckins,
                total_earned: stats.totalEarned,
                total_redeemed: stats.totalRedeemed,
                last_checkin_date: stats.lastCheckInDate,
                updated_at: new Date().toISOString()
            })
            .eq('family_id', currentFamilyId);

        console.log('统计同步成功');
    } catch (error) {
        console.error('统计同步失败:', error);
    }
}

// 从云端加载统计
async function loadStatsFromCloud() {
    if (!supabaseReady) return null;

    try {
        const { data, error } = await supabaseClient
            .from('family_stats')
            .select('*')
            .eq('family_id', currentFamilyId)
            .single();

        if (error) throw error;

        return {
            totalPoints: data.total_points || 0,
            streakDays: data.streak_days || 0,
            maxStreak: data.max_streak || 0,
            totalCheckins: data.total_checkins || 0,
            totalEarned: data.total_earned || 0,
            totalRedeemed: data.total_redeemed || 0,
            lastCheckInDate: data.last_checkin_date
        };
    } catch (error) {
        console.error('加载统计失败:', error);
        return null;
    }
}

// 检查 Supabase 是否就绪
function isSupabaseReady() {
    return supabaseReady;
}

// 暴露到全局作用域
window.initSupabaseAuto = initSupabaseAuto;
window.syncTasksToCloud = syncTasksToCloud;
window.loadTasksFromCloud = loadTasksFromCloud;
window.syncRewardsToCloud = syncRewardsToCloud;
window.loadRewardsFromCloud = loadRewardsFromCloud;
window.syncStatsToCloud = syncStatsToCloud;
window.loadStatsFromCloud = loadStatsFromCloud;
window.isSupabaseReady = isSupabaseReady;
