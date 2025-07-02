import { supabase } from './supabase'
import { logger } from './logger'

/**
 * Helper to ensure we have a valid session before making authenticated requests
 */
export async function getAuthenticatedClient() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('No active session')
  }
  
  // Return the supabase client - it should already have the session
  return supabase
}

/**
 * Helper to get the current user's ID safely
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || null
}

/**
 * Helper to refresh the session if needed
 */
export async function refreshSession() {
  const { data: { session }, error } = await supabase.auth.refreshSession()
  
  if (error) {
    logger.error('Failed to refresh session', error)
    return null
  }
  
  return session
}

/**
 * Helper to get user profile with proper error handling
 */
export async function getUserProfile(userId: string) {
  try {
    // Ensure we have a valid session first
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      logger.error('No session when trying to get profile')
      return null
    }
    
    // Now fetch the profile
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      logger.error('Failed to fetch user profile', error)
      return null
    }
    
    return data
  } catch (err) {
    logger.error('Error in getUserProfile', err as Error)
    return null
  }
}