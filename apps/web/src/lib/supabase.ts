import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-for-build';

// Create a singleton instance
let supabaseInstance: SupabaseClient | null = null;

export const supabase = (() => {
  if (typeof window === 'undefined' && supabaseAnonKey === 'placeholder-key-for-build') {
    // During SSG/build, return a mock client that won't be used
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
})();

export type AuthUser = {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
  };
};
