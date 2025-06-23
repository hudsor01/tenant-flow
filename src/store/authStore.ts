import { create } from 'zustand'
import { toast } from 'sonner'
import type { User } from '@/types/auth'
import type { AuthState } from '@/types/auth'
import { supabase } from '@/lib/supabase'
import { logger, AuthError, withErrorHandling } from '@/lib/logger'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user: User | null) => set({
    user,
    error: null
  }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  signUp: async (email: string, password: string, name: string) => {
    const result = await withErrorHandling(async () => {
      set({ isLoading: true, error: null })

      logger.authEvent('sign_up_attempt', undefined, { email: email.split('@')[0] })
      toast.info('Creating account...')

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (error) {
        const authError = new AuthError(`Sign up failed: ${error.message}`, error.message, error)
        logger.authEvent('sign_up_failed', undefined, { email: email.split('@')[0], error: error.message })
        toast.error(authError.message)
        throw authError
      }

      if (data.user) {
        logger.authEvent('sign_up_success', data.user.id, { email: email.split('@')[0] })
        toast.success('Account created successfully! Please check your email to verify your account.')

        // The auth trigger will create the user profile
        // We don't need to do anything else here
        set({
          isLoading: false,
          error: null
        })

        return data.user
      }
    }, { operation: 'email_sign_up', component: 'authStore' })

    if (!result) {
      const errorMessage = 'Sign up failed'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw new AuthError(errorMessage)
    }
  },

  signIn: async (email: string, password: string) => {
    const result = await withErrorHandling(async () => {
      set({ isLoading: true, error: null })

      logger.authEvent('sign_in_attempt', undefined, { email: email.split('@')[0] })
      toast.info('Signing in...')

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        const authError = new AuthError(`Sign in failed: ${error.message}`, error.message, error)
        logger.authEvent('sign_in_failed', undefined, { email: email.split('@')[0], error: error.message })
        toast.error(authError.message)
        throw authError
      }

      logger.authEvent('sign_in_success', data.user.id, { email: email.split('@')[0] })
      toast.info('Loading profile...')

      // Wait for trigger to create user profile, then fetch
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { data: profile, error: profileError } = await supabase
        .from('User')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError) {
        const authError = new AuthError(`Profile error: ${profileError.message}`, profileError.code, profileError)
        logger.authEvent('profile_load_failed', data.user.id, { error: profileError.message })
        toast.error(authError.message)
        throw authError
      }

      logger.authEvent('profile_loaded', data.user.id)
      toast.success('Successfully signed in!')

      set({
        user: profile,
        isLoading: false
      })

      return profile
    }, { operation: 'email_sign_in', component: 'authStore' })

    if (!result) {
      const errorMessage = 'Sign in failed'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw new AuthError(errorMessage)
    }
  },

  signInWithGoogle: async () => {
    const result = await withErrorHandling(async () => {
      set({ isLoading: true, error: null })

      logger.authEvent('google_sign_in_attempt')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) {
        const authError = new AuthError(`Google sign in failed: ${error.message}`, error.message, error)
        logger.authEvent('google_sign_in_failed', undefined, { error: error.message })
        throw authError
      }

      logger.authEvent('google_oauth_initiated')
      return true
    }, { operation: 'google_sign_in', component: 'authStore' })

    if (!result) {
      const errorMessage = 'Google sign in failed'
      set({
        error: errorMessage,
        isLoading: false
      })
      throw new AuthError(errorMessage)
    }
  },

  signOut: async () => {
    const result = await withErrorHandling(async () => {
      set({ isLoading: true })

      const currentUser = get().user
      logger.authEvent('sign_out_attempt', currentUser?.id)
      toast.info('Signing out...')

      const { error } = await supabase.auth.signOut()
      if (error) {
        const authError = new AuthError(`Sign out failed: ${error.message}`, error.message, error)
        logger.authEvent('sign_out_failed', currentUser?.id, { error: error.message })
        toast.error(authError.message)
        throw authError
      }

      logger.authEvent('sign_out_success', currentUser?.id)
      toast.success('Successfully signed out!')

      set({
        user: null,
        isLoading: false,
        error: null
      })

      return true
    }, { operation: 'sign_out', component: 'authStore' })

    if (!result) {
      const errorMessage = 'Sign out failed'
      set({
        error: errorMessage,
        isLoading: false
      })
    }
  },

  checkSession: async () => {
    // Prevent multiple concurrent session checks
    const currentState = get()
    if (currentState.isLoading) {
      return
    }

    // Throttle session checks - only allow one every 5 seconds
    const now = Date.now()
    const state = get() as AuthStore & { lastSessionCheck?: number }
    const lastCheck = state.lastSessionCheck || 0
    if (now - lastCheck < 5000) {
      console.log('Session check throttled')
      return
    }
    
    // Update last check time
    (state as AuthStore & { lastSessionCheck: number }).lastSessionCheck = now

    const result = await withErrorHandling(async () => {
      set({ isLoading: true })

      logger.authEvent('session_check_start')
      const { data: { session } } = await supabase.auth.getSession()

      // Session debugging removed for production

      logger.authEvent('session_retrieved', session?.user?.id, {
        hasSession: !!session,
        email: session?.user?.email?.split('@')[0]
      })

      if (session?.user) {
        logger.authEvent('profile_lookup_start', session.user.id)

        // Try using the RLS-bypassing function first
        logger.dbOperation('select', 'User', { userId: session.user.id })

        let profile = null
        let error = null

        try {
          // Profile lookup for authenticated user

          // Direct query to User table (RLS is disabled)
          const { data: directProfile, error: directError } = await supabase
            .from('User')
            .select('*')
            .eq('id', session.user.id)
            .single()

          profile = directProfile
          error = directError

          if (profile) {
            logger.info('Profile loaded successfully', { userId: session.user.id })
          }
        } catch (err: unknown) {
          error = err
          logger.error('Profile fetch error', err as Error)
        }

        if (!error && profile) {
          logger.authEvent('session_check_success', session.user.id)
          // Remove the toast spam - only log success
          console.log('Profile loaded successfully for user:', session.user.id)
          set({
            user: profile,
            isLoading: false,
            error: null
          })
          return profile
        } else {
          logger.authEvent('profile_not_found', session.user.id, { error: error instanceof Error ? error.message : 'Unknown error' })
          console.error('Profile not found for user:', session.user.id, error)
          // Don't show toast error during session checks - it's too spammy
          // Just set the error state silently
          set({
            user: null,
            isLoading: false,
            error: 'Profile not found'
          })
          return null // Return null instead of throwing
        }
      }

      logger.authEvent('no_session')
      set({ user: null, isLoading: false })
      return null
    }, { operation: 'session_check', component: 'authStore' })

    if (result === null && result !== undefined) {
      // Session check failed
      set({
        error: 'Session check failed',
        isLoading: false
      })
    }
  },

  updateProfile: async (updates: Partial<User>) => {
    const result = await withErrorHandling(async () => {
      const currentUser = get().user
      if (!currentUser) {
        throw new AuthError('No user logged in')
      }

      logger.authEvent('profile_update_attempt', currentUser.id)

      // Update user profile in database
      const { data, error } = await supabase
        .from('User')
        .update({
          name: updates.name,
          phone: updates.phone,
          bio: updates.bio,
          avatarUrl: updates.avatarUrl,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', currentUser.id)
        .select('*')
        .single()

      if (error) {
        const authError = new AuthError(`Profile update failed: ${error.message}`, error.code, error)
        logger.authEvent('profile_update_failed', currentUser.id, { error: error.message })
        toast.error(authError.message)
        throw authError
      }

      logger.authEvent('profile_update_success', currentUser.id)

      // Update local state
      set({
        user: data,
        error: null
      })

      return data
    }, { operation: 'profile_update', component: 'authStore' })

    if (!result) {
      throw new AuthError('Profile update failed')
    }
  }
}))
