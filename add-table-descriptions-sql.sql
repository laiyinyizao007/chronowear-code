-- ChronoWear AI 数据库表描述设置
-- 使用 SQL COMMENT ON 语句为所有表添加中文描述
-- 这些描述将在 Supabase Dashboard 中自动显示

-- profiles 表 - 用户资料和活动跟踪
COMMENT ON TABLE public.profiles IS 
'用户资料表 - 存储用户基本信息、身体数据、个人偏好和登录活动跟踪。包含用户认证信息、体型数据、风格偏好以及登录行为分析。';

-- user_settings 表 - 用户个性化设置
COMMENT ON TABLE public.user_settings IS 
'用户设置表 - 存储用户个性化配置和偏好设置。包含全身照片、通知偏好、隐私设置等个人定制化选项。';

-- trends 表 - 时尚趋势管理
COMMENT ON TABLE public.trends IS 
'时尚趋势表 - 管理当前流行趋势和季节性时尚信息。存储流行元素、颜色、款式的流行度评分和适用场景。';

-- saved_outfits 表 - 用户保存的搭配
COMMENT ON TABLE public.saved_outfits IS 
'保存搭配表 - 用户收藏和创建的完整穿搭方案。记录搭配组合、适用场合、穿着频率和用户评价。';

-- todays_picks 表 - AI 每日推荐
COMMENT ON TABLE public.todays_picks IS 
'今日推荐表 - AI每日个性化搭配推荐。基于天气、场合、个人偏好生成的智能穿搭建议和用户反馈。';

-- ai_plans 表 - AI 生成的计划
COMMENT ON TABLE public.ai_plans IS 
'AI计划表 - AI生成的中长期穿搭计划和风格方案。包含主题搭配、特殊场合计划和个人形象提升建议。';

-- wardrobe_items 表 - 衣橱物品清单
COMMENT ON TABLE public.wardrobe_items IS 
'衣橱物品表 - 用户拥有的所有服装和配饰的详细清单。记录品牌、材质、购买信息、使用频率和状态。';

-- outfit_logs 表 - 穿搭记录日志
COMMENT ON TABLE public.outfit_logs IS 
'穿搭日志表 - 用户日常穿搭记录和心情日记。追踪实际穿着情况、满意度评分和搭配心得分享。';