/**
 * User Activity Management Module
 * 
 * Provides utilities for tracking user login activity and managing user profiles.
 * All activity data is stored in the profiles table with automatic timestamps.
 * 
 * Features:
 * - Login activity tracking (first/last login, login count)
 * - User profile data retrieval
 * - Non-blocking activity updates
 * - Automatic timeout handling
 * 
 * @module utils/userActivity
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * User profile data structure from database
 * Includes basic profile info and activity tracking fields
 */
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

/**
 * Result from login activity update operation
 * Returned by the database RPC function
 */
interface LoginActivityResult {
  success: boolean;
  message: string;
  user_data?: ProfileRow;
}

/**
 * Generic activity operation result
 * Used for all activity-related database operations
 */
interface ActivityResult {
  success: boolean;
  data?: ProfileRow | LoginActivityResult;
  error?: string;
}

/**
 * Updates user login activity in the profiles table
 * 
 * Calls the database RPC function 'update_user_login_activity' which:
 * - Sets first_login_at if it's the user's first login
 * - Updates last_login_at to current timestamp
 * - Increments login_count by 1
 * 
 * @returns Promise resolving to activity update result
 * @throws Never throws - always returns result object with success flag
 */
export async function updateUserLoginActivity(): Promise<ActivityResult> {
  try {
    console.log('📊 Updating user login activity in profiles...');
    
    // Verify user authentication status
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
    
    // Execute database function to record login activity
    const { data: result, error: funcError } = await supabase.rpc('update_user_login_activity');

    if (funcError) {
      console.error('❌ Failed to update user activity:', funcError);
      return {
        success: false,
        error: funcError.message
      };
    }

    console.log('✅ User activity updated successfully:', result);
    
    // Safely cast result to expected type
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
 * Retrieves current user's profile data from the profiles table
 * 
 * Fetches basic profile information for the authenticated user.
 * Returns null if user is not authenticated or query fails.
 * 
 * @returns Promise resolving to user profile data or null
 */
export async function getUserActivity(): Promise<ProfileRow | null> {
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    // Query user profile from database
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
 * Tracks user login activity asynchronously (non-blocking)
 * 
 * This function should be called after successful authentication.
 * It runs in the background with the following features:
 * - Non-blocking: Won't delay UI rendering
 * - Auto-timeout: Fails gracefully after 5 seconds
 * - Error resilient: Logs errors but doesn't throw
 * 
 * Implementation details:
 * - Uses setTimeout to defer execution by 100ms
 * - Implements Promise.race for 5-second timeout
 * - Never throws errors to prevent UI disruption
 * 
 * @returns Promise that resolves immediately (background execution)
 */
export async function trackUserLogin(): Promise<void> {
  // Defer execution to avoid blocking UI
  setTimeout(async () => {
    try {
      console.log('🔄 Tracking user login...');
      
      // Create timeout promise (5 second limit)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Login tracking timeout')), 5000);
      });
      
      // Race between tracking and timeout
      const trackingPromise = updateUserLoginActivity();
      const result = await Promise.race([trackingPromise, timeoutPromise]) as ActivityResult;
      
      // Log result (success or failure)
      if (result.success) {
        console.log('📈 Login tracked successfully:', result.data);
      } else {
        console.warn('⚠️ Login tracking failed:', result.error);
      }
    } catch (error) {
      // Catch and log errors without throwing
      console.error('❌ Login tracking error (non-blocking):', error);
    }
  }, 100); // 100ms delay ensures UI loads first
}