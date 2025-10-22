-- 更新 profiles 表以包含用户活动跟踪字段
-- 在 Supabase Dashboard > SQL Editor 中执行

-- 1. 为 profiles 表添加用户活动跟踪字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- 2. 为现有用户初始化登录数据
UPDATE profiles 
SET 
  first_login_at = created_at,
  last_login_at = updated_at,
  login_count = 1
WHERE first_login_at IS NULL;

-- 3. 创建或替换用户登录活动更新函数
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
        login_count = profiles.login_count + 1,
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

-- 4. 创建触发器函数来自动处理新用户
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
        login_count = profiles.login_count + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- 5. 创建触发器（如果不存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. 设置行级安全策略 (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 允许用户更新自己的profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 允许认证用户插入自己的profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. 创建索引以提高性能
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_login_count ON profiles(login_count);

-- 8. 授予必要权限
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_login_activity() TO authenticated;

-- 完成
SELECT 'Database schema updated successfully!' as result;