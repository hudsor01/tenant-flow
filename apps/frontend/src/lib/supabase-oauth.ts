import { trpc, supabase } from '@/lib/trpcClient'
import type { AuthError } from '@supabase/supabase-js'

export interface SupabaseOAuthResult {
  success: boolean
  error?: string
  redirectUrl?: string
}

/**
 * Initiate Google OAuth flow with Supabase
 * Redirects to Google OAuth and returns to /auth/oauth/callback
 */
export async function signInWithGoogle(): Promise<SupabaseOAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Supabase OAuth error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    // If we have a URL, redirect to it
    if (data?.url) {
      window.location.href = data.url
      return {
        success: true,
        redirectUrl: data.url,
      }
    }

    return {
      success: false,
      error: 'No redirect URL received from Supabase',
    }
  } catch (error) {
    console.error('Unexpected error during OAuth:', error)
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
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
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
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Error getting session:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Unexpected error getting session:', error)
    return null
  }
}

/**
 * Get current Supabase user
 */
export async function getUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('Error getting user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Unexpected error getting user:', error)
    return null
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback)
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