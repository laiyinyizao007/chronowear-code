-- 为 ChronoWear AI 数据库的所有表添加描述信息
-- 在 Supabase Dashboard > SQL Editor 中执行

-- ==============================================
-- 表描述 (TABLE COMMENTS)
-- ==============================================

-- 1. PROFILES 表描述
COMMENT ON TABLE profiles IS '用户资料表 - 存储用户基本信息、身体数据、个人偏好和登录活动跟踪';

-- PROFILES 字段描述
COMMENT ON COLUMN profiles.id IS '用户唯一标识符，关联 auth.users';
COMMENT ON COLUMN profiles.email IS '用户邮箱地址';
COMMENT ON COLUMN profiles.full_name IS '用户全名';
COMMENT ON COLUMN profiles.avatar_url IS '用户头像URL';
COMMENT ON COLUMN profiles.geo_location IS '地理位置信息';
COMMENT ON COLUMN profiles.style_preference IS '个人风格偏好';
COMMENT ON COLUMN profiles.height_cm IS '身高（厘米）';
COMMENT ON COLUMN profiles.weight_kg IS '体重（公斤）';
COMMENT ON COLUMN profiles.bust_cm IS '胸围（厘米）';
COMMENT ON COLUMN profiles.waist_cm IS '腰围（厘米）';
COMMENT ON COLUMN profiles.hip_cm IS '臀围（厘米）';
COMMENT ON COLUMN profiles.clothing_size IS '服装尺码';
COMMENT ON COLUMN profiles.bra_cup IS '文胸罩杯尺寸';
COMMENT ON COLUMN profiles.shoe_size IS '鞋码';
COMMENT ON COLUMN profiles.eye_color IS '眼睛颜色';
COMMENT ON COLUMN profiles.hair_color IS '头发颜色';
COMMENT ON COLUMN profiles.gender IS '性别';
COMMENT ON COLUMN profiles.date_of_birth IS '出生日期';
COMMENT ON COLUMN profiles.first_login_at IS '首次登录时间';
COMMENT ON COLUMN profiles.last_login_at IS '最后登录时间';
COMMENT ON COLUMN profiles.login_count IS '总登录次数';
COMMENT ON COLUMN profiles.created_at IS '记录创建时间';
COMMENT ON COLUMN profiles.updated_at IS '记录最后更新时间';

-- 2. USER_SETTINGS 表描述
COMMENT ON TABLE user_settings IS '用户设置表 - 存储用户个性化设置和偏好配置';

COMMENT ON COLUMN user_settings.id IS '设置记录唯一标识符';
COMMENT ON COLUMN user_settings.user_id IS '关联的用户ID';
COMMENT ON COLUMN user_settings.full_body_photo_url IS '全身照片URL，用于AI分析和推荐';
COMMENT ON COLUMN user_settings.created_at IS '设置创建时间';
COMMENT ON COLUMN user_settings.updated_at IS '设置最后更新时间';

-- 3. TRENDS 表描述
COMMENT ON TABLE trends IS '时尚趋势表 - 存储当前流行趋势、季节性时尚信息和流行度评分';

COMMENT ON COLUMN trends.id IS '趋势记录唯一标识符';
COMMENT ON COLUMN trends.title IS '趋势标题';
COMMENT ON COLUMN trends.description IS '趋势详细描述';
COMMENT ON COLUMN trends.category IS '趋势分类（如：上装、下装、配饰等）';
COMMENT ON COLUMN trends.season IS '适用季节';
COMMENT ON COLUMN trends.year IS '趋势年份';
COMMENT ON COLUMN trends.popularity_score IS '流行度评分（0-100）';
COMMENT ON COLUMN trends.image_url IS '趋势示例图片URL';
COMMENT ON COLUMN trends.tags IS '趋势标签数组';
COMMENT ON COLUMN trends.created_at IS '趋势记录创建时间';
COMMENT ON COLUMN trends.updated_at IS '趋势记录更新时间';

-- 4. SAVED_OUTFITS 表描述
COMMENT ON TABLE saved_outfits IS '保存搭配表 - 存储用户保存的完整搭配方案和穿搭记录';

COMMENT ON COLUMN saved_outfits.id IS '搭配记录唯一标识符';
COMMENT ON COLUMN saved_outfits.user_id IS '搭配所属用户ID';
COMMENT ON COLUMN saved_outfits.name IS '搭配名称';
COMMENT ON COLUMN saved_outfits.description IS '搭配描述';
COMMENT ON COLUMN saved_outfits.items IS '搭配物品列表（JSON格式）';
COMMENT ON COLUMN saved_outfits.occasion IS '适用场合';
COMMENT ON COLUMN saved_outfits.season IS '适用季节';
COMMENT ON COLUMN saved_outfits.style_tags IS '风格标签数组';
COMMENT ON COLUMN saved_outfits.image_url IS '搭配效果图URL';
COMMENT ON COLUMN saved_outfits.is_favorite IS '是否为收藏搭配';
COMMENT ON COLUMN saved_outfits.wear_count IS '穿着次数统计';
COMMENT ON COLUMN saved_outfits.last_worn_date IS '最后穿着日期';
COMMENT ON COLUMN saved_outfits.created_at IS '搭配创建时间';
COMMENT ON COLUMN saved_outfits.updated_at IS '搭配更新时间';

-- 5. TODAYS_PICKS 表描述
COMMENT ON TABLE todays_picks IS '今日推荐表 - 存储AI每日为用户生成的个性化搭配推荐';

COMMENT ON COLUMN todays_picks.id IS '推荐记录唯一标识符';
COMMENT ON COLUMN todays_picks.user_id IS '推荐目标用户ID';
COMMENT ON COLUMN todays_picks.date IS '推荐日期';
COMMENT ON COLUMN todays_picks.outfit_data IS '推荐搭配数据（JSON格式）';
COMMENT ON COLUMN todays_picks.weather_info IS '天气信息（JSON格式）';
COMMENT ON COLUMN todays_picks.occasion IS '推荐场合';
COMMENT ON COLUMN todays_picks.ai_reasoning IS 'AI推荐理由和分析';
COMMENT ON COLUMN todays_picks.user_feedback IS '用户反馈评分（1-5分）';
COMMENT ON COLUMN todays_picks.was_worn IS '用户是否采用了该推荐';
COMMENT ON COLUMN todays_picks.created_at IS '推荐创建时间';
COMMENT ON COLUMN todays_picks.updated_at IS '推荐更新时间';

-- 6. AI_PLANS 表描述
COMMENT ON TABLE ai_plans IS 'AI计划表 - 存储AI生成的穿搭计划和风格方案';

COMMENT ON COLUMN ai_plans.id IS '计划记录唯一标识符';
COMMENT ON COLUMN ai_plans.user_id IS '计划所属用户ID';
COMMENT ON COLUMN ai_plans.date IS '计划日期';
COMMENT ON COLUMN ai_plans.items IS '计划涉及的物品（JSON格式）';
COMMENT ON COLUMN ai_plans.title IS '计划标题';
COMMENT ON COLUMN ai_plans.summary IS '计划摘要';
COMMENT ON COLUMN ai_plans.hairstyle IS '推荐发型';
COMMENT ON COLUMN ai_plans.image_url IS '计划效果图URL';
COMMENT ON COLUMN ai_plans.plan_type IS '计划类型（daily-日常, weekly-周计划, event-活动）';
COMMENT ON COLUMN ai_plans.status IS '计划状态（pending-待执行, active-进行中, completed-已完成, cancelled-已取消）';
COMMENT ON COLUMN ai_plans.created_at IS '计划创建时间';
COMMENT ON COLUMN ai_plans.updated_at IS '计划更新时间';

-- 7. WARDROBE_ITEMS 表描述
COMMENT ON TABLE wardrobe_items IS '衣橱物品表 - 存储用户拥有的所有服装、配饰等物品详细信息';

COMMENT ON COLUMN wardrobe_items.id IS '物品唯一标识符';
COMMENT ON COLUMN wardrobe_items.user_id IS '物品所属用户ID';
COMMENT ON COLUMN wardrobe_items.name IS '物品名称';
COMMENT ON COLUMN wardrobe_items.category IS '物品主分类（上装、下装、鞋类、配饰等）';
COMMENT ON COLUMN wardrobe_items.subcategory IS '物品子分类';
COMMENT ON COLUMN wardrobe_items.brand IS '品牌';
COMMENT ON COLUMN wardrobe_items.color IS '颜色';
COMMENT ON COLUMN wardrobe_items.size IS '尺码';
COMMENT ON COLUMN wardrobe_items.material IS '材质';
COMMENT ON COLUMN wardrobe_items.purchase_date IS '购买日期';
COMMENT ON COLUMN wardrobe_items.purchase_price IS '购买价格';
COMMENT ON COLUMN wardrobe_items.image_url IS '物品图片URL';
COMMENT ON COLUMN wardrobe_items.tags IS '物品标签数组';
COMMENT ON COLUMN wardrobe_items.wear_count IS '穿着次数统计';
COMMENT ON COLUMN wardrobe_items.last_worn_date IS '最后穿着日期';
COMMENT ON COLUMN wardrobe_items.is_favorite IS '是否为收藏物品';
COMMENT ON COLUMN wardrobe_items.condition IS '物品状态（new-全新, good-良好, fair-一般, poor-较差）';
COMMENT ON COLUMN wardrobe_items.notes IS '备注信息';
COMMENT ON COLUMN wardrobe_items.created_at IS '物品录入时间';
COMMENT ON COLUMN wardrobe_items.updated_at IS '物品信息更新时间';

-- 8. OUTFIT_LOGS 表描述
COMMENT ON TABLE outfit_logs IS '穿搭日志表 - 记录用户每日实际穿搭情况和心情评价';

COMMENT ON COLUMN outfit_logs.id IS '穿搭日志唯一标识符';
COMMENT ON COLUMN outfit_logs.user_id IS '穿搭记录所属用户ID';
COMMENT ON COLUMN outfit_logs.date IS '穿搭日期';
COMMENT ON COLUMN outfit_logs.outfit_items IS '当日穿搭物品列表（JSON格式）';
COMMENT ON COLUMN outfit_logs.occasion IS '穿搭场合';
COMMENT ON COLUMN outfit_logs.weather IS '当日天气信息（JSON格式）';
COMMENT ON COLUMN outfit_logs.mood IS '穿搭时的心情';
COMMENT ON COLUMN outfit_logs.rating IS '对当日穿搭的满意度评分（1-5分）';
COMMENT ON COLUMN outfit_logs.photo_url IS '穿搭照片URL';
COMMENT ON COLUMN outfit_logs.notes IS '穿搭心得和备注';
COMMENT ON COLUMN outfit_logs.created_at IS '日志创建时间';
COMMENT ON COLUMN outfit_logs.updated_at IS '日志更新时间';

-- ==============================================
-- 函数描述
-- ==============================================

-- 用户活动跟踪函数描述
COMMENT ON FUNCTION update_user_login_activity() IS '更新用户登录活动跟踪 - 记录用户首次登录、最后登录时间和登录次数';

-- 新用户处理函数描述
COMMENT ON FUNCTION handle_new_user() IS '新用户注册处理触发器函数 - 自动创建用户档案并初始化活动跟踪';

-- 更新时间戳函数描述
COMMENT ON FUNCTION update_updated_at_column() IS '自动更新时间戳函数 - 当记录被修改时自动更新updated_at字段';

-- ==============================================
-- 完成消息
-- ==============================================
SELECT 'Table and column descriptions added successfully! 📝' as result,
       'All 8 tables now have detailed comments explaining their purpose and usage' as info;