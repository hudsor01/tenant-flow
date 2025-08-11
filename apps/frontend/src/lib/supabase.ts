/**
 * Supabase client configuration
 * Handles authentication and database connections using SSR-optimized client
 */
import { type AuthChangeEvent, type Session } from '@supabase/supabase-js'
import { createClient, supabase, auth, getSession, getUser } from './supabase/client'

// Re-export everything for backward compatibility
export { createClient, supabase, auth, getSession, getUser }

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

// Auth state helpers
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}