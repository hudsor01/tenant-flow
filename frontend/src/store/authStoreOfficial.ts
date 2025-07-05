import { create } from 'zustand'
import { toast } from 'sonner'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import type { User, UserRole } from '@/types/auth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import posthog from 'posthog-js'

interface AuthStore {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  
  // Actions
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  refreshSession: () => Promise<void>
  handleAuthError: (error: any) => void
}

/**
 * Auth store following official Supabase patterns
 * @see https://supabase.com/docs/guides/auth/quickstarts/react
 * @see https://supabase.com/docs/guides/auth/sessions
 * @see https://supabase.com/docs/guides/auth/managing-user-data
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true })
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }

      if (session) {
        // Fetch user profile from our custom table
        const { data: profile } = await supabase
          .from('User')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          set({
            session,
            user: profile as User,
            isLoading: false,
            error: null
          })
        } else {
          // Create profile if it doesn't exist (for OAuth users)
          const newProfile = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name || 
                  session.user.email!.split('@')[0],
            role: 'OWNER' as UserRole,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          const { data: createdProfile } = await supabase
            .from('User')
            .insert(newProfile)
            .select()
            .single()

          set({
            session,
            user: createdProfile as User,
            isLoading: false,
            error: null
          })
        }
      } else {
        set({ session: null, user: null, isLoading: false })
      }

      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          logger.info('Auth state changed', { event, userId: session?.user?.id })
          
          if (event === 'SIGNED_IN' && session) {
            // Fetch user profile
            const { data: profile } = await supabase
              .from('User')
              .select('*')
              .eq('id', session.user.id)
              .single()

            set({
              session,
              user: profile as User,
              error: null
            })
          } else if (event === 'SIGNED_OUT') {
            set({
              session: null,
              user: null,
              error: null
            })
          } else if (event === 'TOKEN_REFRESHED') {
            set({ session })
          } else if (event === 'USER_UPDATED' && session) {
            // Refetch user profile
            const { data: profile } = await supabase
              .from('User')
              .select('*')
              .eq('id', session.user.id)
              .single()

            set({
              session,
              user: profile as User
            })
          }
        }
      )

      // Store subscription for cleanup if needed
      ;(window as any).__authSubscription = subscription

    } catch (error) {
      logger.error('Auth initialization failed', error as Error)
      set({ error: 'Failed to initialize authentication', isLoading: false })
    }
  },

  signUp: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null })

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
        set({ isLoading: false })
      } else if (data.session) {
        // Create user profile
        const profile = {
          id: data.user!.id,
          email: data.user!.email!,
          name,
          role: 'OWNER' as UserRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        await supabase
          .from('User')
          .insert(profile)

        set({
          session: data.session,
          user: profile as User,
          isLoading: false
        })

        // Track signup
        posthog?.capture('user_signed_up', {
          method: 'email',
          email,
          user_id: data.user!.id
        })
      }
    } catch (error: any) {
      get().handleAuthError(error)
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Fetch user profile
      const { data: profile } = await supabase
        .from('User')
        .select('*')
        .eq('id', data.user.id)
        .single()

      set({
        session: data.session,
        user: profile as User,
        isLoading: false
      })

      // Track login
      posthog?.capture('user_logged_in', {
        method: 'email',
        email,
        user_id: data.user.id
      })

      toast.success('Welcome back!')
    } catch (error: any) {
      get().handleAuthError(error)
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
      
      // The actual sign-in happens in the OAuth flow
      // The auth state listener will handle the session
    } catch (error: any) {
      get().handleAuthError(error)
    }
  },

  signOut: async () => {
    set({ isLoading: true })

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      set({
        session: null,
        user: null,
        isLoading: false
      })

      toast.success('Signed out successfully')
    } catch (error: any) {
      get().handleAuthError(error)
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const { user, session } = get()
    if (!user || !session) return

    set({ isLoading: true })

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

      set({
        user: data as User,
        isLoading: false
      })

      toast.success('Profile updated')
    } catch (error: any) {
      get().handleAuthError(error)
    }
  },

  refreshSession: async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      set({ session: data.session })
    } catch (error: any) {
      logger.error('Session refresh failed', error)
      // Don't show error to user, handle silently
    }
  },

  handleAuthError: (error: any) => {
    logger.error('Auth error', error)
    
    let message = 'Authentication failed'
    
    // Handle specific error codes
    // @see https://supabase.com/docs/guides/auth/debugging/error-codes
    if (error.code === 'email_not_confirmed') {
      message = 'Please confirm your email before signing in'
    } else if (error.code === 'invalid_credentials') {
      message = 'Invalid email or password'
    } else if (error.code === 'over_request_rate_limit') {
      message = 'Too many attempts. Please try again later'
    } else if (error.code === 'user_banned') {
      message = 'Your account has been temporarily banned'
    } else if (error.message) {
      message = error.message
    }

    set({
      error: message,
      isLoading: false
    })

    toast.error(message)
  }
}))