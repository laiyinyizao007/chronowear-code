/**
 * Supabase Client Configuration
 * 
 * This file initializes and exports the Supabase client instance.
 * Configuration includes authentication settings and session persistence.
 * 
 * NOTE: This file is partially auto-generated. The client initialization
 * and auth configuration can be customized, but type imports should not
 * be modified manually.
 * 
 * Usage:
 * ```typescript
 * import { supabase } from "@/integrations/supabase/client";
 * 
 * // Query example
 * const { data, error } = await supabase
 *   .from('table_name')
 *   .select('*');
 * ```
 * 
 * @module integrations/supabase/client
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment variables for Supabase connection
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client instance with type-safe database schema
 * 
 * Configuration:
 * - Uses localStorage for auth token persistence
 * - Enables automatic session persistence across page reloads
 * - Automatically refreshes expired auth tokens
 * 
 * @see {@link https://supabase.com/docs/reference/javascript/initializing}
 */
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storage: localStorage,        // Persist auth tokens in browser localStorage
      persistSession: true,          // Maintain session across browser refreshes
      autoRefreshToken: true,        // Automatically refresh expired tokens
    }
  }
);