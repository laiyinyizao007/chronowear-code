/**
 * 测试完整的数据库 schema
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://udiheaprrtgegajidwqd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWhlYXBycnRnZWdhamlkd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzMwNTYsImV4cCI6MjA3NTA0OTA1Nn0.R6mTpPC6EPQWhCrJ3Z9uUXIP74lgzxqVgtawlf-fp1M';

const supabase = createClient(supabaseUrl, supabaseKey);

// 需要测试的表列表
const tables = [
    'profiles',
    'user_settings', 
    'trends',
    'saved_outfits',
    'todays_picks',
    'ai_plans',
    'wardrobe_items',
    'outfit_logs'
];

async function testTableAccess(tableName) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('count', { count: 'exact' });
        
        if (error) {
            return { 
                table: tableName, 
                status: 'ERROR', 
                message: error.message,
                count: 0 
            };
        }
        
        return { 
            table: tableName, 
            status: 'OK', 
            message: 'Accessible',
            count: data.count || 0 
        };
    } catch (error) {
        return { 
            table: tableName, 
            status: 'ERROR', 
            message: error.message,
            count: 0 
        };
    }
}

async function testRPCFunction() {
    try {
        const { data, error } = await supabase.rpc('update_user_login_activity');
        
        if (error) {
            if (error.message.includes('JWT') || error.message.includes('No user')) {
                return { status: 'OK', message: 'Function exists (requires auth)' };
            } else {
                return { status: 'ERROR', message: error.message };
            }
        }
        
        return { status: 'OK', message: 'Function accessible', data };
    } catch (error) {
        return { status: 'ERROR', message: error.message };
    }
}

async function testCompleteSchema() {
    console.log('🔍 测试完整的 ChronoWear AI 数据库 Schema...\n');
    
    const results = [];
    
    // 测试每个表
    for (const table of tables) {
        const result = await testTableAccess(table);
        results.push(result);
    }
    
    // 测试 RPC 函数
    const rpcResult = await testRPCFunction();
    
    // 显示结果
    console.log('📊 数据库表测试结果:');
    console.log('='.repeat(70));
    console.log('| 表名              | 状态   | 记录数 | 信息');
    console.log('='.repeat(70));
    
    let successCount = 0;
    results.forEach(result => {
        const status = result.status === 'OK' ? '✅ OK ' : '❌ ERR';
        const count = result.count.toString().padStart(6);
        const table = result.table.padEnd(16);
        const message = result.message.length > 25 ? 
            result.message.substring(0, 22) + '...' : result.message;
        
        console.log(`| ${table} | ${status} | ${count} | ${message}`);
        
        if (result.status === 'OK') successCount++;
    });
    
    console.log('='.repeat(70));
    
    // RPC 函数结果
    console.log(`\n🔧 RPC 函数测试:`);
    console.log(`   update_user_login_activity: ${rpcResult.status === 'OK' ? '✅' : '❌'} ${rpcResult.message}`);
    
    // 总结
    console.log('\n📋 测试总结:');
    console.log(`   成功: ${successCount}/${tables.length} 表`);
    console.log(`   RPC函数: ${rpcResult.status === 'OK' ? '✅' : '❌'}`);
    
    if (successCount === tables.length && rpcResult.status === 'OK') {
        console.log('\n🎉 所有数据库组件都正常工作！');
        console.log('💡 现在可以开始使用用户活动跟踪功能了');
        console.log('🚀 访问 http://localhost:3001/auth 进行登录测试');
    } else {
        console.log('\n⚠️ 部分组件需要修复:');
        console.log('1. 确保在 Supabase Dashboard 中运行了完整的 schema');
        console.log('2. 检查 RLS 策略设置');
        console.log('3. 验证权限配置');
    }
    
    // 如果有数据，显示一些示例
    const tablesWithData = results.filter(r => r.status === 'OK' && r.count > 0);
    if (tablesWithData.length > 0) {
        console.log(`\n📈 包含数据的表 (${tablesWithData.length}):`);
        tablesWithData.forEach(t => {
            console.log(`   - ${t.table}: ${t.count} 记录`);
        });
    }
}

testCompleteSchema().catch(console.error);