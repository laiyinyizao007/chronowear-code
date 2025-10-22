/**
 * 全面数据库测试脚本
 * 测试 Supabase 数据库的所有功能
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔗 Testing database connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' });
    if (error) throw error;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testUserActivityTable() {
  console.log('\n📋 Testing user activity in profiles table...');
  
  try {
    // 1. 检查表结构
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_login_at, last_login_at, login_count')
      .limit(1);
    
    if (error) {
      console.error('❌ profiles table with activity fields error:', error.message);
      return false;
    }
    
    console.log('✅ profiles table with activity tracking accessible');
    
    // 2. 查看现有记录
    const { data: records, error: recordsError } = await supabase
      .from('profiles')
      .select('id, email, first_login_at, last_login_at, login_count')
      .not('first_login_at', 'is', null);
      
      if (recordsError) {
      console.error('❌ Error fetching records:', recordsError.message);
    } else {
      console.log(`📊 Current profiles with activity: ${records.length}`);
      if (records.length > 0) {
        console.log('   Latest records:');
        records.slice(-3).forEach((record, index) => {
          console.log(`   ${index + 1}. User: ${record.id.slice(0, 8)}... | Email: ${record.email || 'N/A'} | Logins: ${record.login_count} | Last: ${record.last_login_at}`);
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ profiles table activity test failed:', error.message);
    return false;
  }
}

async function testRPCFunctions() {
  console.log('\n🔧 Testing RPC functions...');
  
  try {
    // 测试 update_user_login_activity 函数
    console.log('   Testing update_user_login_activity...');
    const { data, error } = await supabase.rpc('update_user_login_activity');
    
    if (error) {
      console.error('❌ RPC function error:', error.message);
      return false;
    }
    
    console.log('✅ update_user_login_activity function works');
    console.log(`   Function result:`, data);
    
    return true;
  } catch (error) {
    console.error('❌ RPC function test failed:', error.message);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing authentication...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('ℹ️ No authenticated user (this is normal for testing)');
    } else if (user) {
      console.log('✅ Authenticated user found:', user.email);
    } else {
      console.log('ℹ️ No user session');
    }
    
    // 测试匿名访问权限
    const { data: publicData, error: publicError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' });
      
    if (publicError) {
      console.error('❌ Public access error:', publicError.message);
      return false;
    }
    
    console.log('✅ Public database access works');
    return true;
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function testDataInsertion() {
  console.log('\n💾 Testing data insertion (without auth)...');
  
  try {
    // 尝试直接调用 RPC 函数来模拟数据插入
    const { data, error } = await supabase.rpc('update_user_login_activity');
    
    if (error) {
      if (error.message.includes('JWT')) {
        console.log('ℹ️ Insert requires authentication (expected)');
        return true;
      } else {
        console.error('❌ Unexpected insertion error:', error.message);
        return false;
      }
    }
    
    console.log('✅ Data insertion test passed');
    console.log('   Result:', data);
    return true;
  } catch (error) {
    console.error('❌ Data insertion test failed:', error.message);
    return false;
  }
}

async function testStorageBucket() {
  console.log('\n📁 Testing storage bucket...');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Storage bucket error:', error.message);
      return false;
    }
    
    console.log('✅ Storage accessible');
    console.log(`   Available buckets: ${buckets.length}`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Storage test failed:', error.message);
    return false;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 开始全面数据库测试...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using anon key: ${supabaseKey.slice(0, 20)}...`);
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'User Activity Table', fn: testUserActivityTable },
    { name: 'RPC Functions', fn: testRPCFunctions },
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Data Insertion', fn: testDataInsertion },
    { name: 'Storage Bucket', fn: testStorageBucket }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果汇总:');
  console.log('=' .repeat(50));
  
  let passedCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.passed) passedCount++;
  });
  
  console.log('=' .repeat(50));
  console.log(`🎯 总计: ${passedCount}/${results.length} 测试通过`);
  
  if (passedCount === results.length) {
    console.log('🎉 所有数据库功能正常！');
  } else {
    console.log('⚠️ 部分功能需要修复');
  }
  
  console.log('\n💡 下一步:');
  if (passedCount >= 4) {
    console.log('   1. 数据库基本功能正常');
    console.log('   2. 可以启动应用程序进行用户测试');
    console.log('   3. 访问 http://localhost:3001 进行登录测试');
  } else {
    console.log('   1. 检查 .env.local 配置');
    console.log('   2. 确认 Supabase 项目设置');
    console.log('   3. 运行 database-setup.sql 脚本');
  }
}

// 运行测试
runComprehensiveTest().catch(error => {
  console.error('💥 测试运行失败:', error.message);
  process.exit(1);
});