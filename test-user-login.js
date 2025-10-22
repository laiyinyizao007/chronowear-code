/**
 * 测试用户登录和活动跟踪
 * 模拟完整的用户登录流程
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWhlYXBycnRnZWdhamlkd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzMwNTYsImV4cCI6MjA3NTA0OTA1Nn0.R6mTpPC6EPQWhCrJ3Z9uUXIP74lgzxqVgtawlf-fp1M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserLogin() {
  console.log('🧪 测试用户登录和活动跟踪...\n');
  
  try {
    // 1. 检查当前认证状态
    console.log('1️⃣ 检查当前认证状态...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ 认证检查失败:', authError.message);
    } else if (user) {
      console.log('✅ 发现已登录用户:', user.email);
      console.log('👤 用户ID:', user.id);
      
      // 2. 测试用户活动跟踪函数
      console.log('\n2️⃣ 测试用户活动跟踪函数...');
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('update_user_login_activity', { user_uuid: user.id });
      
      if (rpcError) {
        console.error('❌ 活动跟踪失败:', rpcError.message);
        console.log('📋 可能的原因:');
        console.log('   - 数据库函数未正确设置');
        console.log('   - RLS 政策阻止操作');
        console.log('   - 用户权限不足');
      } else {
        console.log('✅ 活动跟踪成功!');
        console.log('📊 返回结果:', rpcResult);
      }
      
      // 3. 检查用户活动记录 (从 profiles 表)
      console.log('\n3️⃣ 检查用户活动记录...');
      const { data: activityData, error: activityError } = await supabase
        .from('profiles')
        .select('id, email, first_login_at, last_login_at, login_count')
        .eq('id', user.id);
      
      if (activityError) {
        console.error('❌ 查询活动记录失败:', activityError.message);
      } else {
        console.log(`📋 找到用户资料记录: ${activityData.length > 0 ? '1条' : '0条'}`);
        if (activityData.length > 0) {
          const record = activityData[0];
          console.log(`   👤 用户 ID: ${record.id.slice(0, 8)}...`);
          console.log(`   📫 邮箱: ${record.email || 'N/A'}`);
          console.log(`   🏁 首次登录: ${record.first_login_at}`);
          console.log(`   🔄 最后登录: ${record.last_login_at}`);
          console.log(`   📈 登录次数: ${record.login_count}`);
          console.log('');
        }
      }
      
      // 4. 再次运行活动跟踪以测试增量更新
      console.log('4️⃣ 测试增量更新...');
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_user_login_activity');
      
      if (updateError) {
        console.error('❌ 增量更新失败:', updateError.message);
      } else {
        console.log('✅ 增量更新成功!');
        console.log('📊 更新结果:', updateResult);
      }
      
      // 5. 再次检查记录
      console.log('\n5️⃣ 验证更新后的记录...');
      const { data: finalData, error: finalError } = await supabase
        .from('profiles')
        .select('id, email, first_login_at, last_login_at, login_count')
        .eq('id', user.id);
      
      if (finalError) {
        console.error('❌ 最终查询失败:', finalError.message);
      } else {
        console.log('📋 更新后的记录:');
        if (finalData.length > 0) {
          const record = finalData[0];
          console.log(`   🆔 用户 ID: ${record.id.slice(0, 8)}...`);
          console.log(`   📧 邮箱: ${record.email || 'N/A'}`);
          console.log(`   🏁 首次登录: ${record.first_login_at}`);
          console.log(`   🔄 最后登录: ${record.last_login_at}`);
          console.log(`   📈 登录次数: ${record.login_count}`);
          console.log('');
        } else {
          console.log('   ⚠️ 未找到用户记录');
        }
      }
      
    } else {
      console.log('ℹ️ 没有找到已登录的用户');
      console.log('💡 请先在浏览器中登录: http://localhost:3001/auth');
      console.log('   然后重新运行此测试');
      
      // 测试匿名用户的RPC调用
      console.log('\n🔧 测试匿名RPC调用...');
      const { data: anonResult, error: anonError } = await supabase
        .rpc('update_user_login_activity');
      
      if (anonError) {
        console.log('✅ 匿名调用正确被拒绝:', anonError.message);
      } else {
        console.log('⚠️ 匿名调用意外成功:', anonResult);
      }
    }
    
  } catch (error) {
    console.error('💥 测试过程中出现错误:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 测试完成');
  console.log('='.repeat(50));
  console.log('💡 如果看到"没有找到已登录的用户"：');
  console.log('   1. 在浏览器中访问 http://localhost:3001/auth');
  console.log('   2. 登录您的Google账户或创建邮箱账户');
  console.log('   3. 登录成功后重新运行此测试');
  console.log('');
  console.log('💡 如果RPC函数失败：');
  console.log('   1. 检查 database-setup.sql 是否已正确执行');
  console.log('   2. 确认 Supabase 项目中的 RLS 政策设置');
  console.log('   3. 验证用户权限配置');
}

testUserLogin().catch(console.error);