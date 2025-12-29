-- 小星星打卡程序 - Supabase 数据库架构
-- 在 Supabase SQL Editor 中运行此脚本

-- 家庭表
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_code VARCHAR(10) UNIQUE NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    password VARCHAR(10) DEFAULT '0000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 每日打卡记录
CREATE TABLE IF NOT EXISTS daily_checkins (
    id SERIAL PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(family_id, task_id, check_date)
);

-- 奖励表
CREATE TABLE IF NOT EXISTS rewards (
    id SERIAL PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL,
    cost INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 家庭统计表
CREATE TABLE IF NOT EXISTS family_stats (
    family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    last_checkin_date DATE,
    today_locked BOOLEAN DEFAULT FALSE,
    today_signature TEXT,
    lock_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 历史记录表
CREATE TABLE IF NOT EXISTS history (
    id SERIAL PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    points INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_family ON tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_checkins_family_date ON daily_checkins(family_id, check_date);
CREATE INDEX IF NOT EXISTS idx_history_family ON history(family_id);

-- 启用 RLS (Row Level Security)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- RLS 策略 - 允许匿名访问（简化版，用于家庭码登录）
CREATE POLICY "Allow all for families" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for daily_checkins" ON daily_checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for rewards" ON rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for family_stats" ON family_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for history" ON history FOR ALL USING (true) WITH CHECK (true);
