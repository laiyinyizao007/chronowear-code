-- 完整的 ChronoWear AI 数据库 Schema (安全版本)
-- 在 Supabase Dashboard > SQL Editor 中执行

-- ==============================================
-- 1. PROFILES 表 (用户资料)
-- ==============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    geo_location TEXT,
    style_preference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 身体数据
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    bust_cm INTEGER,
    waist_cm INTEGER,
    hip_cm INTEGER,
    clothing_size VARCHAR(10),
    bra_cup VARCHAR(5),
    shoe_size VARCHAR(10),
    
    -- 个人信息
    eye_color TEXT,
    hair_color TEXT,
    gender VARCHAR(20),
    date_of_birth DATE,
    
    -- 用户活动跟踪
    first_login_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0
);

-- ==============================================
-- 2. USER_SETTINGS 表 (用户设置)
-- ==============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    full_body_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 3. TRENDS 表 (时尚趋势)
-- ==============================================
CREATE TABLE IF NOT EXISTS trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    season VARCHAR(20),
    year INTEGER,
    popularity_score INTEGER DEFAULT 0,
    image_url TEXT,
    tags TEXT[], -- PostgreSQL array type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 4. SAVED_OUTFITS 表 (保存的搭配)
-- ==============================================
CREATE TABLE IF NOT EXISTS saved_outfits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    items JSONB, -- 存储搭配物品列表
    occasion VARCHAR(100),
    season VARCHAR(20),
    style_tags TEXT[],
    image_url TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    wear_count INTEGER DEFAULT 0,
    last_worn_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 5. TODAYS_PICKS 表 (今日推荐)
-- ==============================================
CREATE TABLE IF NOT EXISTS todays_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    outfit_data JSONB, -- 推荐的搭配数据
    weather_info JSONB, -- 天气信息
    occasion VARCHAR(100),
    ai_reasoning TEXT, -- AI 推荐理由
    user_feedback INTEGER, -- 用户反馈评分 1-5
    was_worn BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 确保每个用户每天只有一个推荐
    UNIQUE(user_id, date)
);

-- ==============================================
-- 6. AI_PLANS 表 (AI 计划)
-- ==============================================
CREATE TABLE IF NOT EXISTS ai_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    items JSONB, -- 计划的物品
    title TEXT NOT NULL,
    summary TEXT,
    hairstyle TEXT,
    image_url TEXT,
    plan_type VARCHAR(50) DEFAULT 'daily', -- daily, weekly, event
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 7. WARDROBE_ITEMS 表 (衣橱物品) - 新增
-- ==============================================
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- tops, bottoms, shoes, accessories, etc.
    subcategory VARCHAR(50),
    brand TEXT,
    color VARCHAR(50),
    size VARCHAR(20),
    material TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    image_url TEXT,
    tags TEXT[],
    wear_count INTEGER DEFAULT 0,
    last_worn_date DATE,
    is_favorite BOOLEAN DEFAULT FALSE,
    condition VARCHAR(20) DEFAULT 'good', -- new, good, fair, poor
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 8. OUTFIT_LOGS 表 (穿搭日志) - 新增
-- ==============================================
CREATE TABLE IF NOT EXISTS outfit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    outfit_items JSONB NOT NULL, -- 当天穿的物品
    occasion VARCHAR(100),
    weather JSONB,
    mood VARCHAR(50),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 触发器和函数
-- ==============================================

-- 自动更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- 删除现有触发器并重新创建
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_trends_updated_at ON trends;
DROP TRIGGER IF EXISTS update_saved_outfits_updated_at ON saved_outfits;
DROP TRIGGER IF EXISTS update_todays_picks_updated_at ON todays_picks;
DROP TRIGGER IF EXISTS update_ai_plans_updated_at ON ai_plans;
DROP TRIGGER IF EXISTS update_wardrobe_items_updated_at ON wardrobe_items;
DROP TRIGGER IF EXISTS update_outfit_logs_updated_at ON outfit_logs;

-- 为所有表添加更新触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trends_updated_at BEFORE UPDATE ON trends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_outfits_updated_at BEFORE UPDATE ON saved_outfits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_todays_picks_updated_at BEFORE UPDATE ON todays_picks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_plans_updated_at BEFORE UPDATE ON ai_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wardrobe_items_updated_at BEFORE UPDATE ON wardrobe_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outfit_logs_updated_at BEFORE UPDATE ON outfit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 用户登录活动跟踪函数
-- ==============================================
CREATE OR REPLACE FUNCTION update_user_login_activity()
RETURNS TABLE(success BOOLEAN, message TEXT, user_data JSON)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    user_record profiles%ROWTYPE;
BEGIN
    -- 获取当前认证用户ID
    current_user_id := auth.uid();
    
    -- 检查用户是否已认证
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No user provided', NULL::JSON;
        RETURN;
    END IF;
    
    -- 更新或插入用户活动
    INSERT INTO profiles (
        id, 
        email, 
        created_at, 
        updated_at, 
        first_login_at, 
        last_login_at, 
        login_count
    ) VALUES (
        current_user_id,
        auth.email(),
        NOW(),
        NOW(),
        NOW(),
        NOW(),
        1
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login_at = NOW(),
        login_count = COALESCE(profiles.login_count, 0) + 1,
        updated_at = NOW()
    RETURNING * INTO user_record;
    
    -- 返回成功结果
    RETURN QUERY SELECT 
        TRUE, 
        'User login activity updated successfully', 
        row_to_json(user_record)::JSON;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            'Error updating user activity: ' || SQLERRM, 
            NULL::JSON;
END;
$$;

-- ==============================================
-- 新用户处理触发器
-- ==============================================
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (
        id, 
        email, 
        full_name,
        avatar_url,
        created_at, 
        updated_at,
        first_login_at, 
        last_login_at, 
        login_count
    ) VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW(),
        NOW(),
        NOW(),
        1
    )
    ON CONFLICT (id) DO UPDATE SET
        last_login_at = NOW(),
        login_count = COALESCE(profiles.login_count, 0) + 1,
        updated_at = NOW(),
        email = COALESCE(profiles.email, NEW.email),
        full_name = COALESCE(profiles.full_name, NEW.raw_user_meta_data->>'full_name'),
        avatar_url = COALESCE(profiles.avatar_url, NEW.raw_user_meta_data->>'avatar_url');
    
    RETURN NEW;
END;
$$;

-- 删除现有触发器并重新创建
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================
-- 行级安全策略 (RLS) - 安全删除并重建
-- ==============================================

-- 启用所有表的 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE todays_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_logs ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
DROP POLICY IF EXISTS "All users can view trends" ON trends;
DROP POLICY IF EXISTS "Admin can manage trends" ON trends;
DROP POLICY IF EXISTS "Users can manage own outfits" ON saved_outfits;
DROP POLICY IF EXISTS "Users can manage own picks" ON todays_picks;
DROP POLICY IF EXISTS "Users can manage own plans" ON ai_plans;
DROP POLICY IF EXISTS "Users can manage own wardrobe" ON wardrobe_items;
DROP POLICY IF EXISTS "Users can manage own logs" ON outfit_logs;

-- PROFILES 表策略
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- USER_SETTINGS 表策略
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- TRENDS 表策略 (所有用户可读)
CREATE POLICY "All users can view trends" ON trends FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage trends" ON trends FOR ALL USING (auth.email() = 'laiyinyizao007@gmail.com');

-- SAVED_OUTFITS 表策略
CREATE POLICY "Users can manage own outfits" ON saved_outfits FOR ALL USING (auth.uid() = user_id);

-- TODAYS_PICKS 表策略
CREATE POLICY "Users can manage own picks" ON todays_picks FOR ALL USING (auth.uid() = user_id);

-- AI_PLANS 表策略
CREATE POLICY "Users can manage own plans" ON ai_plans FOR ALL USING (auth.uid() = user_id);

-- WARDROBE_ITEMS 表策略
CREATE POLICY "Users can manage own wardrobe" ON wardrobe_items FOR ALL USING (auth.uid() = user_id);

-- OUTFIT_LOGS 表策略
CREATE POLICY "Users can manage own logs" ON outfit_logs FOR ALL USING (auth.uid() = user_id);

-- ==============================================
-- 索引优化
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_outfits_user_id ON saved_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_outfits_created_at ON saved_outfits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todays_picks_user_date ON todays_picks(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_plans_user_id ON ai_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_plans_date ON ai_plans(date DESC);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id ON wardrobe_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category ON wardrobe_items(category);
CREATE INDEX IF NOT EXISTS idx_outfit_logs_user_date ON outfit_logs(user_id, date DESC);

-- ==============================================
-- 权限设置
-- ==============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_login_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- ==============================================
-- 完成消息
-- ==============================================
SELECT 'ChronoWear AI Database Schema created successfully! 🎉' as result,
       'Tables created: profiles, user_settings, trends, saved_outfits, todays_picks, ai_plans, wardrobe_items, outfit_logs' as tables_info,
       'All existing policies and triggers safely handled' as note;