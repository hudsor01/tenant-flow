import { supabase } from '@/lib/clients'
import { logger } from '@/lib/logger'
import type { AuthError } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

export interface SupabaseOAuthResult {
  success: boolean
  error?: string
  redirectUrl?: string
}

/**
 * Initiate Google OAuth flow with Supabase
 * Redirects to Google OAuth and returns to /auth/callback
 */
export async function signInWithGoogle(): Promise<SupabaseOAuthResult> {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not initialized'
      }
    }

    // Use the same redirect URL pattern as server-side
    const redirectTo = `${window.location.origin}/auth/callback`
    
    // Remove debug logging in production
    // if (process.env.NODE_ENV !== 'production') {
    //   logger.info('[OAuth Client] Initiating Google sign-in with redirect to:', redirectTo)
    // }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      logger.error('[OAuth Client Error] Supabase OAuth error', error)
      return {
        success: false,
        error: error.message,
      }
    }

    // If we have a URL, redirect to it
    if (data?.url) {
      // Remove debug logging in production
      // if (process.env.NODE_ENV !== 'production') {
      //   logger.info('[OAuth Client] Redirecting to Google OAuth URL:', data.url)
      // }
      window.location.href = data.url
      return {
        success: true,
        redirectUrl: data.url,
      }
    }

    logger.error('[OAuth Client Error] No redirect URL received from Supabase')
    return {
      success: false,
      error: 'No redirect URL received from Supabase',
    }
  } catch (error) {
    logger.error('[OAuth Client Error] Unexpected error during OAuth', error as Error)
    return {
      success: false,
      error: 'An unexpected error occurred during sign-in',
    }
  }
}

/**
 * Sign out from Supabase
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not initialized'
      }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    logger.error('Error signing out', error as Error)
    return {
      success: false,
      error: 'An unexpected error occurred during sign-out',
    }
  }
}

/**
 * Get current Supabase session
 */
export async function getSession() {
  try {
    if (!supabase) {
      logger.error('Supabase client not initialized')
      return null
    }

    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      logger.error('Error getting session', error)
      return null
    }

    return session
  } catch (error) {
    logger.error('Unexpected error getting session', error as Error)
    return null
  }
}

/**
 * Get current Supabase user
 */
export async function getUser() {
  try {
    if (!supabase) {
      logger.error('Supabase client not initialized')
      return null
    }

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      logger.error('Error getting user', error)
      return null
    }

    return user
  } catch (error) {
    logger.error('Unexpected error getting user', error as Error)
    return null
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  if (!supabase) {
    logger.error('Supabase client not initialized')
    return { data: { subscription: { unsubscribe: () => {
      logger.debug('Auth state change unsubscribed - no cleanup needed for null client')
    } } } }
  }
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          subscription.unsubscribe()
          logger.debug('Auth state change subscription properly unsubscribed')
        }
      }
    }
  }
}

/**
 * Helper to format auth errors for user display
 */
export function formatAuthError(error: AuthError | Error | string): string {
  if (typeof error === 'string') {
    return error
  }

  if ('message' in error) {
    // Common Supabase error messages to user-friendly text
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password'
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link'
      case 'User already registered':
        return 'An account with this email already exists'
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long'
      default:
        return error.message
    }
  }

  return 'An unexpected error occurred'
}