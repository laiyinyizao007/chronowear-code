/**
 * Simple Debug Page - No authentication required
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SimpleDebug() {
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const addOutput = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setOutput(prev => `${prev}[${timestamp}] ${message}\n`);
  };

  const checkAuth = async () => {
    setLoading(true);
    addOutput("🔍 Checking authentication status...");
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addOutput(`❌ Session error: ${error.message}`);
      } else if (session) {
        addOutput(`✅ User authenticated: ${session.user.email}`);
        addOutput(`📱 User ID: ${session.user.id}`);
      } else {
        addOutput("❌ No active session");
      }
    } catch (err) {
      addOutput(`💥 Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testDatabase = async () => {
    setLoading(true);
    addOutput("🗄️ Testing database connection...");
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
        
      if (error) {
        addOutput(`❌ Database error: ${error.message}`);
      } else {
        addOutput("✅ Database connection successful");
      }
    } catch (err) {
      addOutput(`💥 Database test error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testUserActivity = async () => {
    setLoading(true);
    addOutput("📊 Testing user activity function...");
    
    try {
      const { data, error } = await supabase.rpc('update_user_login_activity');
      
      if (error) {
        addOutput(`❌ Function error: ${error.message}`);
      } else {
        addOutput(`✅ Function result: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      addOutput(`💥 Function test error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = () => {
    addOutput("🧹 Clearing all storage...");
    localStorage.clear();
    sessionStorage.clear();
    addOutput("✅ Storage cleared");
  };

  const clearOutput = () => {
    setOutput("");
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔍 Simple Debug Page</h1>
      <p className="text-muted-foreground">This page doesn't require authentication.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Debug Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={checkAuth} disabled={loading}>
              Check Auth
            </Button>
            <Button onClick={testDatabase} disabled={loading}>
              Test Database
            </Button>
            <Button onClick={testUserActivity} disabled={loading}>
              Test User Activity
            </Button>
            <Button onClick={clearStorage} variant="destructive">
              Clear Storage
            </Button>
            <Button onClick={clearOutput} variant="outline">
              Clear Output
            </Button>
          </div>
          
          <div className="flex gap-4">
            <Button asChild>
              <a href="/auth">Go to Auth Page</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/">Go to Main App</a>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded min-h-[200px] max-h-[400px] overflow-auto">
            {output || "Output will appear here..."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}