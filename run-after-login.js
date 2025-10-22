/**
 * 登录后运行此脚本来验证数据库更新
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWhlYXBycnRnZWdhamlkd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzMwNTYsImV4cCI6MjA3NTA0OTA1Nn0.R6mTpPC6EPQWhCrJ3Z9uUXIP74lgzxqVgtawlf-fp1M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAfterLogin() {
  console.log('🔍 检查登录后的数据更新...\n');
  
  try {
    // 查看profiles表数据
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('last_login_at', { ascending: false });
    
    if (profilesError) {
      console.error('❌ 无法读取profiles:', profilesError.message);
      return;
    }
    
    console.log(`📊 找到 ${profiles.length} 个用户记录:`);
    
    if (profiles.length === 0) {
      console.log('❌ 还没有用户登录记录');
      console.log('💡 请先访问 http://localhost:3001/auth 进行登录');
    } else {
      profiles.forEach((profile, index) => {
        console.log(`\n${index + 1}. 用户: ${profile.email}`);
        console.log(`   ID: ${profile.id}`);
        console.log(`   姓名: ${profile.full_name || '未设置'}`);
        console.log(`   首次登录: ${profile.first_login_at || '未记录'}`);
        console.log(`   最后登录: ${profile.last_login_at || '未记录'}`);
        console.log(`   登录次数: ${profile.login_count || 0}`);
        console.log(`   创建时间: ${profile.created_at}`);
        console.log(`   更新时间: ${profile.updated_at}`);
      });
      
      console.log('\n✅ 用户活动跟踪数据正常！');
    }
    
  } catch (error) {
    console.error('💥 检查失败:', error.message);
  }
}

checkAfterLogin();