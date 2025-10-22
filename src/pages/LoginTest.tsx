import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { trackUserLogin } from '@/utils/userActivity';
import { User } from '@supabase/supabase-js';

interface ActivityRecord {
  id: string;
  user_id: string;
  first_login_at: string;
  last_login_at: string;
  login_count: number;
  created_at: string;
  updated_at: string;
}

export default function LoginTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activityData, setActivityData] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(message);
  };

  const checkAuthStatus = useCallback(async () => {
    log('🔍 检查认证状态...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        log(`❌ 认证错误: ${error.message}`);
      } else if (user) {
        setUser(user);
        log(`✅ 已登录用户: ${user.email}`);
        log(`👤 用户ID: ${user.id}`);
        await loadUserActivity(user.id);
      } else {
        log('❌ 未登录');
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      log(`❌ 检查认证状态失败: ${errorMsg}`);
    }
  }, []);

  useEffect(() => {
    const initCheck = async () => {
      log('🔍 检查认证状态...');
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          log(`❌ 认证错误: ${error.message}`);
        } else if (user) {
          setUser(user);
          log(`✅ 已登录用户: ${user.email}`);
          log(`👤 用户ID: ${user.id}`);
          await loadUserActivity(user.id);
        } else {
          log('❌ 未登录');
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        log(`❌ 检查认证状态失败: ${errorMsg}`);
      }
    };
    initCheck();
  }, []);



  const loadUserActivity = useCallback(async (userId: string) => {
    log('📋 加载用户活动记录...');
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        log(`❌ 加载活动记录失败: ${error.message}`);
      } else {
        setActivityData(data || []);
        log(`📊 找到 ${data?.length || 0} 条活动记录`);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      log(`❌ 加载活动记录出错: ${errorMsg}`);
    }
  }, []);

  const testRPCFunction = async () => {
    if (!user) {
      log('❌ 没有登录用户，无法测试RPC函数');
      return;
    }

    setIsLoading(true);
    log('🔧 测试 RPC 函数...');
    
    try {
      const { data, error } = await supabase.rpc('update_user_login_activity', {
        user_uuid: user.id
      });
      
      if (error) {
        log(`❌ RPC函数调用失败: ${error.message}`);
      } else {
        log(`✅ RPC函数调用成功!`);
        log(`📊 返回结果: ${JSON.stringify(data)}`);
        // 重新加载活动记录
        await loadUserActivity(user.id);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      log(`❌ RPC函数调用出错: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTrackUserLogin = async () => {
    if (!user) {
      log('❌ 没有登录用户，无法测试活动跟踪');
      return;
    }

    setIsLoading(true);
    log('📈 测试 trackUserLogin 函数...');
    
    try {
      await trackUserLogin();
      log('✅ trackUserLogin 函数调用完成');
      // 等待一下再重新加载数据
      setTimeout(async () => {
        await loadUserActivity(user.id);
      }, 2000);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      log(`❌ trackUserLogin 函数调用失败: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">用户登录活动跟踪测试</h1>
        <p className="text-gray-600">
          测试用户活动跟踪功能是否正常工作
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 用户状态 */}
        <Card>
          <CardHeader>
            <CardTitle>用户状态</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">已登录</Badge>
                </div>
                <p className="text-sm"><strong>邮箱:</strong> {user.email}</p>
                <p className="text-sm"><strong>用户ID:</strong> {user.id.slice(0, 8)}...</p>
                <p className="text-sm"><strong>登录时间:</strong> {user.last_sign_in_at}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge className="bg-red-500">未登录</Badge>
                <p className="text-sm">请先登录后再测试活动跟踪功能</p>
                <Button 
                  onClick={() => window.location.href = '/auth'}
                  className="w-full"
                >
                  前往登录
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 测试控制 */}
        <Card>
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                onClick={checkAuthStatus} 
                className="w-full"
                disabled={isLoading}
              >
                刷新认证状态
              </Button>
              <Button 
                onClick={testRPCFunction} 
                className="w-full"
                disabled={!user || isLoading}
              >
                测试 RPC 函数
              </Button>
              <Button 
                onClick={testTrackUserLogin} 
                className="w-full"
                disabled={!user || isLoading}
              >
                测试活动跟踪
              </Button>
              <Button 
                onClick={clearLogs} 
                variant="outline"
                className="w-full"
              >
                清空日志
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 活动记录 */}
        <Card>
          <CardHeader>
            <CardTitle>用户活动记录</CardTitle>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <div className="space-y-3">
                {activityData.map((record, index) => (
                  <div key={index} className="p-3 border rounded">
                    <p className="text-sm"><strong>首次登录:</strong> {record.first_login_at}</p>
                    <p className="text-sm"><strong>最后登录:</strong> {record.last_login_at}</p>
                    <p className="text-sm"><strong>登录次数:</strong> {record.login_count}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">暂无活动记录</p>
            )}
          </CardContent>
        </Card>

        {/* 日志 */}
        <Card>
          <CardHeader>
            <CardTitle>测试日志</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
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