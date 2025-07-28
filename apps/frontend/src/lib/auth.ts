import { supabase } from './clients'

/**
 * Get the current auth token from Supabase session
 */
export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null
  
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Get the current user ID from Supabase session
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null
  
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || null
}