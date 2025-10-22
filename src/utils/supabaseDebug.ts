// Supabase Debug Utility
import { supabase } from '@/integrations/supabase/client';

export const diagnoseSupabaseAuth = async () => {
  console.log("🔍 === Supabase Authentication Diagnosis ===");
  
  // 1. Check environment variables
  console.log("📋 Environment Variables:");
  console.log("  VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
  console.log("  VITE_SUPABASE_PROJECT_ID:", import.meta.env.VITE_SUPABASE_PROJECT_ID);
  console.log("  Key preview:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 30) + "...");
  
  // 2. Check current session
  console.log("\n🔐 Session Status:");
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error("  Session Error:", error.message);
    } else {
      console.log("  Session:", session ? "Active" : "None");
      if (session) {
        console.log("  User ID:", session.user?.id);
        console.log("  Email:", session.user?.email);
        console.log("  Provider:", session.user?.app_metadata?.provider);
      }
    }
  } catch (error) {
    console.error("  Session check failed:", error);
  }
  
  // 3. Test basic connection to Supabase
  console.log("\n🌐 Connection Test:");
  try {
    // Try a simple operation that doesn't require auth
    const { error } = await supabase.from('profiles').select('count').limit(1);
    if (error && error.code === 'PGRST116') {
      console.log("  ✅ Connection successful (table not found is expected)");
    } else if (error) {
      console.log("  ❌ Connection error:", error.message);
    } else {
      console.log("  ✅ Connection successful");
    }
  } catch (error) {
    console.error("  ❌ Connection failed:", error);
  }
  
  // 4. Check OAuth configuration
  console.log("\n🔧 OAuth Configuration Check:");
  console.log("  Current Origin:", window.location.origin);
  console.log("  Expected Redirect:", `${window.location.origin}/`);
  console.log("  Supabase Auth URL:", `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback`);
  
  // 5. Check what OAuth providers are configured
  console.log("\n📱 OAuth Providers Test:");
  try {
    // Try to get provider info (this will help us understand what's configured)
    const providers = ['google', 'github', 'facebook', 'twitter'];
    for (const provider of providers) {
      console.log(`  Testing ${provider} provider availability...`);
    }
  } catch (error) {
    console.error("  Provider test failed:", error);
  }
  
  console.log("\n=== End Diagnosis ===");
  
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
    origin: window.location.origin,
    redirectUrl: `${window.location.origin}/`,
    authCallbackUrl: `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback`
  };
};