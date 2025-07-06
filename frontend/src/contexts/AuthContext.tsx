import React, { useEffect, useState } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User, UserRole } from '@/types/auth'
import { supabase } from '@/lib/supabase-client'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { AuthContext, type AuthContextType } from './auth-context'

/**
 * Auth Provider following Supabase 2025 best practices
 * Uses SessionContextProvider pattern for optimal session management
 * @see https://supabase.com/docs/guides/auth/quickstarts/react
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch or create user profile from our custom User table
   */
  const fetchOrCreateUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      // Try to fetch existing profile
      let { data: profile } = await supabase
        .from('User')
        .select('*')
        .eq('id', supabaseUser.id)
        .single()

      // Create profile if it doesn't exist (for OAuth users)
      if (!profile) {
        logger.info('Creating new user profile', { userId: supabaseUser.id })
        
        const newProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || 
                supabaseUser.user_metadata?.name || 
                supabaseUser.email!.split('@')[0],
          role: 'OWNER' as UserRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('User')
          .insert(newProfile)
          .select()
          .single()

        if (createError) {
          throw createError
        }

        profile = createdProfile
      }

      return profile as User
    } catch (error) {
      logger.error('Failed to fetch/create user profile', error as Error)
      throw error
    }
  }

  /**
   * Initialize auth state and set up listener
   */
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = 
          await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (mounted) {
          if (initialSession?.user) {
            const userProfile = await fetchOrCreateUserProfile(initialSession.user)
            setSession(initialSession)
            setUser(userProfile)
          }
          setIsLoading(false)
        }
      } catch (error) {
        logger.error('Auth initialization failed', error as Error)
        if (mounted) {
          setError('Failed to initialize authentication')
          setIsLoading(false)
        }
      }
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        logger.info('Auth state changed', { event, userId: newSession?.user?.id })

        if (!mounted) return

        try {
          if (event === 'SIGNED_IN' && newSession?.user) {
            const userProfile = await fetchOrCreateUserProfile(newSession.user)
            setSession(newSession)
            setUser(userProfile)
            setError(null)
          } else if (event === 'SIGNED_OUT') {
            setSession(null)
            setUser(null)
            setError(null)
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            setSession(newSession)
          } else if (event === 'USER_UPDATED' && newSession?.user) {
            // Refetch user profile on user updates
            const userProfile = await fetchOrCreateUserProfile(newSession.user)
            setSession(newSession)
            setUser(userProfile)
          }
        } catch (error) {
          logger.error('Auth state change handler failed', error as Error)
          setError('Authentication error occurred')
        }
      }
    )

    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error

      if (data.user && !data.session) {
        // Email confirmation required
        toast.success('Please check your email to confirm your account')
      } else if (data.session) {
        // Immediate sign-in (email confirmation disabled)
        const profile = await fetchOrCreateUserProfile(data.user!)
        setSession(data.session)
        setUser(profile)
        toast.success('Account created successfully!')
      }
    } catch (error: unknown) {
      const authError = error as Error
      logger.error('Sign up failed', authError)
      setError(authError.message || 'Sign up failed')
      toast.error(authError.message || 'Sign up failed')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Profile will be fetched by the auth state change listener
      toast.success('Welcome back!')
    } catch (error: unknown) {
      const authError = error as Error
      logger.error('Sign in failed', authError)
      setError(authError.message || 'Sign in failed')
      toast.error(authError.message || 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
      
      // The OAuth flow will complete in the callback
    } catch (error: unknown) {
      const authError = error as Error
      logger.error('Google sign in failed', authError)
      setError(authError.message || 'Google sign in failed')
      toast.error(authError.message || 'Google sign in failed')
      setIsLoading(false)
    }
  }

  /**
   * Sign out
   */
  const signOut = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // State will be cleared by the auth state change listener
      toast.success('Signed out successfully')
    } catch (error: unknown) {
      const authError = error as Error
      logger.error('Sign out failed', authError)
      setError(authError.message || 'Sign out failed')
      toast.error(authError.message || 'Sign out failed')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (updates: Partial<User>) => {
    if (!user || !session) return

    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('User')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setUser(data as User)
      toast.success('Profile updated')
    } catch (error: unknown) {
      const authError = error as Error
      logger.error('Profile update failed', authError)
      setError(authError.message || 'Profile update failed')
      toast.error(authError.message || 'Profile update failed')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Refresh session
   */
  const refreshSession = async () => {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      // Session will be updated by the auth state change listener
    } catch (error: unknown) {
      logger.error('Session refresh failed', error as Error)
      // Don't show error to user, handle silently
    }
  }

  const value: AuthContextType = {
    session,
    user,
    supabaseUser: session?.user || null,
    isLoading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

