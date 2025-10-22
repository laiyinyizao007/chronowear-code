/**
 * 检查 profiles 表的当前结构
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWhlYXBycnRnZWdhamlkd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzMwNTYsImV4cCI6MjA3NTA0OTA1Nn0.R6mTpPC6EPQWhCrJ3Z9uUXIP74lgzxqVgtawlf-fp1M';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 检查 profiles 表结构...\n');

async function checkProfilesStructure() {
  try {
    // 获取表结构
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ 查询失败:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const fields = Object.keys(data[0]);
      console.log('📋 profiles 表当前字段:');
      fields.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field}`);
      });
      
      console.log('\n🎯 需要的活动跟踪字段:');
      const requiredFields = ['first_login_at', 'last_login_at', 'login_count'];
      requiredFields.forEach((field, index) => {
        const exists = fields.includes(field);
        console.log(`   ${index + 1}. ${field} ${exists ? '✅ 存在' : '❌ 缺失'}`);
      });
      
    } else {
      console.log('📭 profiles 表为空，无法检查结构');
      
      // 尝试插入一个测试记录来触发结构检查
      console.log('\n🧪 尝试检查表定义...');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000000', // 无效ID，会失败但能显示字段
          email: 'test@example.com'
        });
      
      if (insertError) {
        console.log('📝 从错误信息中可以看到表结构信息:', insertError.message);
      }
    }
    
  } catch (error) {
    console.error('💥 检查失败:', error.message);
  }
}

checkProfilesStructure();