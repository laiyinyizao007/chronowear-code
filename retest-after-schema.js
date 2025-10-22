/**
 * 数据库schema创建后的重新测试
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWhlYXBycnRnZWdhamlkd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzMwNTYsImV4cCI6MjA3NTA0OTA1Nn0.R6mTpPC6EPQWhCrJ3Z9uUXIP74lgzxqVgtawlf-fp1M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function retestSchema() {
    console.log('🔄 重新测试数据库schema...\n');
    
    const tables = [
        'profiles', 'user_settings', 'trends', 'saved_outfits', 
        'todays_picks', 'ai_plans', 'wardrobe_items', 'outfit_logs'
    ];
    
    let allSuccess = true;
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('count', { count: 'exact' });
            
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
                allSuccess = false;
            } else {
                console.log(`✅ ${table}: OK (${data.count || 0} 记录)`);
            }
        } catch (error) {
            console.log(`❌ ${table}: ${error.message}`);
            allSuccess = false;
        }
    }
    
    if (allSuccess) {
        console.log('\n🎉 所有表创建成功！');
        console.log('🚀 现在可以测试用户登录和活动跟踪了');
        console.log('💡 访问: http://localhost:3001/auth');
    } else {
        console.log('\n⚠️ 还有表未创建，请检查SQL脚本执行');
    }
}

retestSchema();