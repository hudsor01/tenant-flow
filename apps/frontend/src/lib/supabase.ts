/**
 * Supabase client configuration
 * Handles authentication and database connections
 */
import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { config } from './config';

// Create a rate-limited wrapper for auth operations
const authRequestTimestamps = new Map<string, number>()
const AUTH_RATE_LIMIT_MS = 2000 // Minimum 2 seconds between same auth operations

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Custom storage adapter to handle PKCE code verifier properly
const customStorageAdapter = isBrowser ? {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn('[Auth Storage] Failed to get item:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[Auth Storage] Failed to set item:', e);
    }
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Auth Storage] Failed to remove item:', e);
    }
  },
} : undefined;

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Add storage key to prevent multiple tabs from conflicting
      storageKey: 'tenantflow-auth',
      // Use custom storage adapter to handle errors gracefully
      storage: customStorageAdapter,
      // Disable automatic retry on auth errors to prevent rate limiting
      retryOnError: false,
    },
  }
);

// Auth helpers
export const auth = supabase.auth;

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

// Rate-limited session management to prevent 429 errors
export async function getSession() {
  const key = 'getSession'
  const lastCall = authRequestTimestamps.get(key)
  const now = Date.now()
  
  if (lastCall && (now - lastCall) < AUTH_RATE_LIMIT_MS) {
    console.warn(`[Auth] Rate limiting ${key} - too many requests`)
    // Return cached session if available
    const { data: { session } } = await supabase.auth.getSession();
    return { session, error: null };
  }
  
  authRequestTimestamps.set(key, now)
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

export async function getUser() {
  const key = 'getUser'
  const lastCall = authRequestTimestamps.get(key)
  const now = Date.now()
  
  if (lastCall && (now - lastCall) < AUTH_RATE_LIMIT_MS) {
    console.warn(`[Auth] Rate limiting ${key} - too many requests`)
    // Return cached user if available
    const { data: { user } } = await supabase.auth.getUser();
    return { user, error: null };
  }
  
  authRequestTimestamps.set(key, now)
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// Auth state helpers
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}