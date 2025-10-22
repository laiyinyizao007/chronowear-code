/**
 * Test script to verify user activity tracking in profiles table
 * Run this script after setting up the database and logging in
 */

import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'your-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserActivity() {
  console.log('🧪 Testing User Activity Tracking in Profiles Table...\n');
  
  try {
    // 1. Check if profiles table exists with activity fields
    console.log('1️⃣ Checking profiles table with user activity fields...');
    const { data: tableData, error: tableError } = await supabase
      .from('profiles')
      .select('id, email, first_login_at, last_login_at, login_count')
      .limit(1);
    
    if (tableError) {
      console.error('❌ profiles table not found or missing activity fields:', tableError.message);
      console.log('\n📋 Please run the complete-database-schema.sql script in Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/udiheaprrtgegajidwqd/sql');
      return;
    }
    
    console.log('✅ profiles table with activity tracking exists');
    
    // 2. Check if update_user_login_activity function exists
    console.log('\n2️⃣ Testing update_user_login_activity function...');
    const { data: funcData, error: funcError } = await supabase.rpc('update_user_login_activity');
    
    if (funcError) {
      console.error('❌ Function not found:', funcError.message);
      console.log('\n📋 Please run the complete-database-schema.sql script in Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/udiheaprrtgegajidwqd/sql');
      return;
    }
    
    console.log('✅ update_user_login_activity function exists');
    console.log('📊 Function result:', funcData);
    
    // 3. Check current user activity records in profiles
    console.log('\n3️⃣ Checking user activity records in profiles...');
    const { data: activityData, error: activityError } = await supabase
      .from('profiles')
      .select('id, email, first_login_at, last_login_at, login_count')
      .not('first_login_at', 'is', null);
    
    if (activityError) {
      console.error('❌ Error reading user activity from profiles:', activityError.message);
    } else {
      console.log(`✅ Found ${activityData.length} profiles with activity records:`);
      activityData.forEach(record => {
        console.log(`   👤 User: ${record.id.slice(0, 8)}... (${record.email || 'No email'})`);
        console.log(`   🏁 First Login: ${record.first_login_at}`);
        console.log(`   🔄 Last Login: ${record.last_login_at}`);
        console.log(`   📈 Login Count: ${record.login_count}`);
        console.log('');
      });
    }
    
    console.log('🎉 User Activity Test Complete!\n');
    console.log('💡 To see activity updates:');
    console.log('   1. Visit http://localhost:3001');
    console.log('   2. Sign in with Google or email');
    console.log('   3. Check the browser console for activity tracking logs');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testUserActivity();