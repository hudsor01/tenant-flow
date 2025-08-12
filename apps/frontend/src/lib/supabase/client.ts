import { createBrowserClient } from '@supabase/ssr'
import { config } from '../config'

// Use global variable to ensure single instance across all imports
declare global {
  var __supabaseClient: ReturnType<typeof createBrowserClient> | undefined
}

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  // Check for global instance first to prevent multiple instances
  if (typeof window !== 'undefined' && globalThis.__supabaseClient) {
    return globalThis.__supabaseClient
  }
  
  // Create a single instance for client-side
  if (!client) {
    client = createBrowserClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storageKey: 'tf-auth-v2',
          debug: process.env.NODE_ENV === 'development',
        },
      }
    )
    
    // Store in global for reuse
    if (typeof window !== 'undefined') {
      globalThis.__supabaseClient = client
    }
  }
  
  return client
}

// Export a singleton instance for backward compatibility
export const supabase = createClient()

// Export auth helpers
export const auth = supabase.auth

// Auth types
export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

// Session management helpers with rate limiting
const authRequestTimestamps = new Map<string, number>()
const AUTH_RATE_LIMIT_MS = 2000

export async function getSession() {
  const key = 'getSession'
  const lastCall = authRequestTimestamps.get(key)
  const now = Date.now()
  
  if (lastCall && (now - lastCall) < AUTH_RATE_LIMIT_MS) {
    console.warn(`[Auth] Rate limiting ${key} - too many requests`)
    const { data: { session } } = await supabase.auth.getSession()
    return { session, error: null }
  }
  
  authRequestTimestamps.set(key, now)
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export async function getUser() {
  const key = 'getUser'
  const lastCall = authRequestTimestamps.get(key)
  const now = Date.now()
  
  if (lastCall && (now - lastCall) < AUTH_RATE_LIMIT_MS) {
    console.warn(`[Auth] Rate limiting ${key} - too many requests`)
    const { data: { user } } = await supabase.auth.getUser()
    return { user, error: null }
  }
  
  authRequestTimestamps.set(key, now)
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}