import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'pending' | 'pass' | 'fail';
  message?: string;
  data?: unknown;
}

export default function DatabaseTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Database Connection', status: 'pending' },
    { name: 'User Activity Table', status: 'pending' },
    { name: 'RPC Functions', status: 'pending' },
    { name: 'Authentication Status', status: 'pending' },
    { name: 'Data Read Access', status: 'pending' },
    { name: 'Storage Access', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const updateTest = (index: number, status: 'pass' | 'fail', message?: string, data?: unknown) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, data } : test
    ));
  };

  const testDatabaseConnection = async (index: number) => {
    log('Testing database connection...');
    try {
      const { data, error } = await supabase.from('user_activity').select('count', { count: 'exact' });
      if (error) throw error;
      updateTest(index, 'pass', 'Connection successful');
      log('✅ Database connection successful');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest(index, 'fail', errorMsg);
      log(`❌ Database connection failed: ${errorMsg}`);
    }
  };

  const testUserActivityTable = async (index: number) => {
    log('Testing user_activity table...');
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      
      updateTest(index, 'pass', `Found ${data.length} records`, data);
      log(`✅ user_activity table accessible, ${data.length} records found`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest(index, 'fail', errorMsg);
      log(`❌ user_activity table error: ${errorMsg}`);
    }
  };

  const testRPCFunctions = async (index: number) => {
    log('Testing RPC functions...');
    try {
      const { data, error } = await supabase.rpc('update_user_login_activity');
      
      if (error) {
        if (error.message.includes('JWT') || error.message.includes('auth')) {
          updateTest(index, 'pass', 'Function exists (requires auth)');
          log('✅ RPC function exists (authentication required)');
        } else {
          throw error;
        }
      } else {
        updateTest(index, 'pass', 'Function executed successfully', data);
        log('✅ RPC function executed successfully');
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest(index, 'fail', errorMsg);
      log(`❌ RPC function error: ${errorMsg}`);
    }
  };

  const testAuthentication = async (index: number) => {
    log('Testing authentication status...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        updateTest(index, 'pass', `Authenticated as ${user.email}`, user);
        log(`✅ Authenticated user: ${user.email}`);
      } else {
        updateTest(index, 'pass', 'No user session (normal)');
        log('ℹ️ No user session (this is normal)');
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest(index, 'fail', errorMsg);
      log(`❌ Authentication test failed: ${errorMsg}`);
    }
  };

  const testDataReadAccess = async (index: number) => {
    log('Testing data read access...');
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('user_id, login_count, last_login_at')
        .order('last_login_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      
      updateTest(index, 'pass', `Read ${data.length} records`, data);
      log(`✅ Data read access successful, ${data.length} records`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest(index, 'fail', errorMsg);
      log(`❌ Data read access failed: ${errorMsg}`);
    }
  };

  const testStorageAccess = async (index: number) => {
    log('Testing storage access...');
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) throw error;
      
      updateTest(index, 'pass', `${data.length} buckets available`, data);
      log(`✅ Storage access successful, ${data.length} buckets`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      updateTest(index, 'fail', errorMsg);
      log(`❌ Storage access failed: ${errorMsg}`);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setLogs([]);
    
    // Reset all tests to pending
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })));
    
    const testFunctions = [
      testDatabaseConnection,
      testUserActivityTable,
      testRPCFunctions,
      testAuthentication,
      testDataReadAccess,
      testStorageAccess
    ];

    for (let i = 0; i < testFunctions.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
      await testFunctions[i](i);
    }
    
    setIsRunning(false);
    log('🎯 All tests completed');
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-500">PASS</Badge>;
      case 'fail':
        return <Badge className="bg-red-500">FAIL</Badge>;
      default:
        return <Badge className="bg-gray-500">PENDING</Badge>;
    }
  };

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const failedTests = tests.filter(t => t.status === 'fail').length;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Supabase 数据库测试</h1>
        <p className="text-gray-600">
          全面测试 Supabase 数据库的连接和功能
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="w-full mb-4"
            >
              {isRunning ? '运行中...' : '开始测试'}
            </Button>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <div className="text-sm text-gray-600">通过</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{failedTests}</div>
                <div className="text-sm text-gray-600">失败</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{tests.length - passedTests - failedTests}</div>
                <div className="text-sm text-gray-600">待测</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>测试结果</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {tests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">{test.name}</span>
                    {getStatusBadge(test.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Test Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>测试详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.map((test, index) => (
                test.status !== 'pending' && (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{test.name}</span>
                      {getStatusBadge(test.status)}
                    </div>
                    {test.message && (
                      <p className="text-sm text-gray-600 mb-2">{test.message}</p>
                    )}
                    {test.data && (
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">
                        {JSON.stringify(test.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>测试日志</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono p-1 hover:bg-gray-50 rounded">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}