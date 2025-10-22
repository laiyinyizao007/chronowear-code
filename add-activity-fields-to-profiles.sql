-- 为现有 profiles 表添加用户活动跟踪字段
-- 在 Supabase Dashboard > SQL Editor 中执行

-- ==============================================
-- 1. 为 profiles 表添加活动跟踪字段
-- ==============================================

-- 添加用户活动跟踪字段（如果不存在）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- ==============================================
-- 2. 确保 update_user_login_activity 函数存在
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
-- 3. 更新新用户处理触发器
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
-- 4. 添加活动跟踪相关的索引
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at DESC);

-- ==============================================
-- 5. 权限设置
-- ==============================================
GRANT EXECUTE ON FUNCTION update_user_login_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- ==============================================
-- 完成消息
-- ==============================================
SELECT 'User activity tracking fields added to profiles table successfully! 🎉' as result,
       'Added fields: first_login_at, last_login_at, login_count' as fields_info;