/**
 * 简单数据库测试 - 直接测试 Supabase 连接和数据
 */

import { createClient } from '@supabase/supabase-js';

// 从 .env 读取配置
const supabaseUrl = 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWhlYXBycnRnZWdhamlkd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzMwNTYsImV4cCI6MjA3NTA0OTA1Nn0.R6mTpPC6EPQWhCrJ3Z9uUXIP74lgzxqVgtawlf-fp1M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 开始数据库连接测试...\n');
  
  try {
    // 1. 测试基本连接
    console.log('1️⃣ 测试数据库连接...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' });
    
    if (connectionError) {
      console.error('❌ 连接失败:', connectionError.message);
      console.log('📋 可能的原因:');
      console.log('   - Supabase 项目不存在或配置错误');
      console.log('   - profiles 表不存在');
      console.log('   - RLS 政策阻止访问');
      return;
    }
    
    console.log('✅ 数据库连接成功');
    console.log(`📊 profiles 表记录数量: ${connectionTest.count || 0}`);
    
    // 2. 查看现有数据
    console.log('\n2️⃣ 查看现有用户活动数据...');
    const { data: records, error: recordsError } = await supabase
      .from('profiles')
      .select('id, email, first_login_at, last_login_at, login_count')
      .not('first_login_at', 'is', null)
      .order('last_login_at', { ascending: false })
      .limit(10);
    
    if (recordsError) {
      console.error('❌ 数据读取失败:', recordsError.message);
    } else {
      console.log(`📋 找到 ${records.length} 条用户活动记录:`);
      
      if (records.length === 0) {
        console.log('   📭 没有用户活动记录');
        console.log('   💡 这可能是因为:');
        console.log('     - 还没有用户登录过');
        console.log('     - 用户活动跟踪被禁用了');
        console.log('     - 数据库函数有问题');
      } else {
        records.forEach((record, index) => {
          console.log(`   ${index + 1}. 用户ID: ${record.id.slice(0, 12)}...`);
          console.log(`      邮箱: ${record.email || '未知'}`);
          console.log(`      首次登录: ${record.first_login_at || '未知'}`);
          console.log(`      最后登录: ${record.last_login_at || '未知'}`);
          console.log(`      登录次数: ${record.login_count || 0}`);
          console.log('');
        });
      }
    }
    
    // 3. 测试 RPC 函数
    console.log('3️⃣ 测试 update_user_login_activity 函数...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('update_user_login_activity');
    
    if (rpcError) {
      console.error('❌ RPC 函数错误:', rpcError.message);
      if (rpcError.message.includes('JWT')) {
        console.log('ℹ️ 这是正常的 - 函数需要用户认证');
      } else if (rpcError.message.includes('does not exist')) {
        console.log('📋 需要运行 database-setup.sql 脚本');
      }
    } else {
      console.log('✅ RPC 函数可用');
      console.log('📊 函数返回:', rpcData);
    }
    
    // 4. 检查表结构
    console.log('\n4️⃣ 检查 profiles 表结构...');
    const { data: tableStructure, error: structureError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.error('❌ 表结构检查失败:', structureError.message);
    } else {
      console.log('✅ 表结构正确');
      if (tableStructure.length > 0) {
        const columns = Object.keys(tableStructure[0]);
        console.log(`📋 表字段: ${columns.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('💥 测试过程中出现错误:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 数据库状态总结:');
  console.log('='.repeat(50));
  console.log('1. 如果看到"没有用户活动记录"，这是正常的');
  console.log('2. 需要用户实际登录才会有数据更新');
  console.log('3. 用户活动跟踪目前被禁用了（为了排查问题）');
  console.log('4. 要重新启用用户活动跟踪，需要取消注释相关代码');
  console.log('\n💡 下一步: 访问 http://localhost:3001/auth 进行登录测试');
}

testDatabase().catch(console.error);