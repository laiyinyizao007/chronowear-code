/**
 * Authentication debugging utilities
 * Helps identify and fix auth-related loading issues
 */

import { supabase } from '@/integrations/supabase/client';

export async function debugAuthState(): Promise<void> {
  console.log('🔍 === Authentication Debug Info ===');
  
  try {
    // Check current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('📊 Session Status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      error: error?.message
    });
    
    // Check local storage
    const localKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    console.log('💾 Auth LocalStorage Keys:', localKeys);
    
    // Check session storage  
    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    console.log('💾 Auth SessionStorage Keys:', sessionKeys);
    
    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    console.log('🗄️ Database Connection:', {
      connected: !dbError,
      error: dbError?.message
    });
    
    console.log('✅ === Debug Complete ===');
    
  } catch (error) {
    console.error('❌ Auth Debug Error:', error);
  }
}

export function clearAllAuthData(): void {
  console.log('🧹 Clearing all auth data...');
  
  // Clear localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      localStorage.removeItem(key);
      console.log('🗑️ Removed localStorage:', key);
    }
  });
  
  // Clear sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      sessionStorage.removeItem(key);
      console.log('🗑️ Removed sessionStorage:', key);
    }
  });
  
  console.log('✅ Auth data cleared');
}