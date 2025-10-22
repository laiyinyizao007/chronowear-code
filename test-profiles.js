/**
 * 测试 profiles 表连接和数据
 */

import { createClient } from '@supabase/supabase-js';

// 从 .env 读取配置
const supabaseUrl = 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWhlYXBycnRnZWdhamlkd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzMwNTYsImV4cCI6MjA3NTA0OTA1Nn0.R6mTpPC6EPQWhCrJ3Z9uUXIP74lgzxqVgtawlf-fp1M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProfiles() {
  console.log('🔍 测试 profiles 表...\n');
  
  try {
    // 1. 测试基本连接
    console.log('1️⃣ 测试 profiles 表连接...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' });
    
    if (connectionError) {
      console.error('❌ 连接失败:', connectionError.message);
      return;
    }
    
    console.log('✅ profiles 表连接成功');
    console.log(`📊 profiles 表记录数量: ${connectionTest.count || 0}`);
    
    // 2. 查看现有数据
    console.log('\n2️⃣ 查看现有用户数据...');
    const { data: records, error: recordsError } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (recordsError) {
      console.error('❌ 数据读取失败:', recordsError.message);
    } else {
      console.log(`📋 找到 ${records.length} 条用户记录:`);
      
      records.forEach((record, index) => {
        console.log(`   ${index + 1}. 用户ID: ${record.id}`);
        console.log(`      邮箱: ${record.email || '未知'}`);
        console.log(`      姓名: ${record.full_name || '未设置'}`);
        console.log(`      创建时间: ${record.created_at}`);
        console.log(`      更新时间: ${record.updated_at}`);
        
        // 检查是否有用户活动字段
        if (record.first_login_at !== undefined) {
          console.log(`      首次登录: ${record.first_login_at || '未知'}`);
        }
        if (record.last_login_at !== undefined) {
          console.log(`      最后登录: ${record.last_login_at || '未知'}`);
        }
        if (record.login_count !== undefined) {
          console.log(`      登录次数: ${record.login_count || 0}`);
        }
        console.log('');
      });
    }
    
    // 3. 检查表结构
    console.log('3️⃣ 检查表字段...');
    if (records && records.length > 0) {
      const fields = Object.keys(records[0]);
      console.log(`📋 表字段 (${fields.length}): ${fields.join(', ')}`);
      
      // 检查是否有用户活动跟踪字段
      const activityFields = ['first_login_at', 'last_login_at', 'login_count'];
      const hasActivityFields = activityFields.some(field => fields.includes(field));
      
      if (hasActivityFields) {
        console.log('✅ 包含用户活动跟踪字段');
      } else {
        console.log('⚠️ 缺少用户活动跟踪字段');
        console.log('💡 需要运行 database-update-profiles.sql 脚本');
      }
    }
    
    // 4. 测试 RPC 函数
    console.log('\n4️⃣ 测试 update_user_login_activity 函数...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('update_user_login_activity');
    
    if (rpcError) {
      console.error('❌ RPC 函数错误:', rpcError.message);
      if (rpcError.message.includes('JWT')) {
        console.log('ℹ️ 这是正常的 - 函数需要用户认证');
      } else if (rpcError.message.includes('does not exist')) {
        console.log('📋 需要运行 database-update-profiles.sql 脚本');
      }
    } else {
      console.log('✅ RPC 函数可用');
      console.log('📊 函数返回:', rpcData);
    }
    
  } catch (error) {
    console.error('💥 测试过程中出现错误:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 profiles 表状态总结:');
  console.log('='.repeat(50));
  console.log('1. 如果看到"缺少用户活动跟踪字段"，需要运行数据库更新脚本');
  console.log('2. 运行 database-update-profiles.sql 来添加活动跟踪字段');
  console.log('3. 然后用户登录时就会自动更新活动数据');
  console.log('\n💡 下一步: 在 Supabase Dashboard 中运行 database-update-profiles.sql');
}

testProfiles().catch(console.error);