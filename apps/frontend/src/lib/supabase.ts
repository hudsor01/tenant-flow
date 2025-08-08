/**
 * Supabase client configuration
 * Handles authentication and database connections
 */
import { createClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

// Auth helpers
export const auth = supabase.auth;

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
};

// Session management
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// Auth state helpers
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}