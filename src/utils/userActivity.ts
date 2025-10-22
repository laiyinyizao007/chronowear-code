/**
 * User Activity Management Utilities
 * Handles user login tracking and activity updates using profiles table
 */

import { supabase } from '@/integrations/supabase/client';

// Types for user profile/activity data
interface ProfileRow {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  first_login_at?: string;
  last_login_at?: string;
  login_count?: number;
  created_at: string;
  updated_at: string;
}

interface LoginActivityResult {
  success: boolean;
  message: string;
  user_data?: ProfileRow;
}

interface ActivityResult {
  success: boolean;
  data?: ProfileRow | LoginActivityResult;
  error?: string;
}

/**
 * Updates user login activity in the profiles table
 * Calls the Supabase function to track login events
 * @returns Promise with activity update result
 */
export async function updateUserLoginActivity(): Promise<ActivityResult> {
  try {
    console.log('📊 Updating user login activity in profiles...');
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError);
      return {
        success: false,
        error: authError.message
      };
    }
    
    if (!user) {
      return {
        success: false,
        error: 'No authenticated user found'
      };
    }
    
    console.log('👤 Tracking login for user:', user.email);
    
    // Call the database function to update login activity
    const { data: result, error: funcError } = await supabase.rpc('update_user_login_activity');

    if (funcError) {
      console.error('❌ Failed to update user activity:', funcError);
      return {
        success: false,
        error: funcError.message
      };
    }

    console.log('✅ User activity updated successfully:', result);
    
    // Type assertion for the result (convert to unknown first for safety)
    const typedResult = result as unknown as LoginActivityResult;
    
    return {
      success: true,
      data: typedResult
    };
  } catch (error) {
    console.error('❌ Error updating user activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets current user profile/activity data from profiles table
 * @returns Promise with user profile data or null
 */
export async function getUserActivity(): Promise<ProfileRow | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error.message);
      return null;
    }

    return data as ProfileRow;
  } catch (error) {
    console.error('Error in getUserActivity:', error);
    return null;
  }
}

/**
 * Auto-updates user activity when called (non-blocking)
 * Should be called after successful authentication
 */
export async function trackUserLogin(): Promise<void> {
  // Use setTimeout to make this non-blocking
  setTimeout(async () => {
    try {
      console.log('🔄 Tracking user login...');
      
      // Add timeout to the operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login tracking timeout')), 5000);
      });
      
      const trackingPromise = updateUserLoginActivity();
      
      const result = await Promise.race([trackingPromise, timeoutPromise]) as ActivityResult;
      
      if (result.success) {
        console.log('📈 Login tracked successfully:', result.data);
      } else {
        console.warn('⚠️ Login tracking failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Login tracking error (non-blocking):', error);
      // Don't throw error to prevent blocking the UI
    }
  }, 100); // Small delay to ensure UI loads first
}