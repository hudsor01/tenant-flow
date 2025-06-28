import { create } from 'zustand'
import { toast } from 'sonner'
import type { User } from '@/types/auth'
import type { AuthState } from '@/types/auth'
import { supabase } from '@/lib/supabase'
import { logger, AuthError, withErrorHandling } from '@/lib/logger'
import posthog from 'posthog-js'
import * as FacebookPixel from '@/lib/facebook-pixel'

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
  resetSessionCheck: () => void
}

// Circuit breaker for profile lookup failures
interface SessionCheckState {
  lastFailTime: number
  failureCount: number
  isCircuitOpen: boolean
}

const sessionCheckState: SessionCheckState = {
  lastFailTime: 0,
  failureCount: 0,
  isCircuitOpen: false,
}

const MAX_FAILURES = 3
const CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds

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
        
        // Track signup event in PostHog
        posthog?.capture('user_signed_up', {
          method: 'email',
          email: email,
          user_id: data.user.id,
          timestamp: new Date().toISOString(),
        })
        
        // Track signup event in Facebook Pixel
        FacebookPixel.trackCompleteRegistration('email')
        
        // Send to n8n automation workflow
        try {
          await fetch('http://192.168.0.221:5678/webhook-test/tenantflow-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              name: name,
              userId: data.user.id,
              timestamp: new Date().toISOString(),
              method: 'email'
            })
          });
        } catch (error) {
          // Don't block signup if n8n webhook fails
          logger.warn('n8n webhook failed during signup', { error });
        }
        
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
      
      // Track login event and identify user in PostHog
      posthog?.capture('user_logged_in', {
        method: 'email',
        email: email,
        user_id: profile.id,
        timestamp: new Date().toISOString(),
      })
      
      posthog?.identify(profile.id, {
        email: profile.email,
        name: profile.name,
        created_at: profile.created_at,
      })
      
      // Track login event in Facebook Pixel
      FacebookPixel.trackCustomEvent('UserLogin', {
        method: 'email',
        user_id: profile.id,
      })
      
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
      logger.debug('Session check already in progress, skipping')
      return
    }

    // Circuit breaker: Check if we should skip due to repeated failures
    const now = Date.now()
    if (sessionCheckState.isCircuitOpen) {
      if (now - sessionCheckState.lastFailTime < CIRCUIT_BREAKER_TIMEOUT) {
        logger.warn('Circuit breaker is open, skipping session check', {
          failureCount: sessionCheckState.failureCount,
          lastFailTime: sessionCheckState.lastFailTime,
          timeUntilReset: CIRCUIT_BREAKER_TIMEOUT - (now - sessionCheckState.lastFailTime)
        })
        set({ isLoading: false, error: 'Profile lookup temporarily disabled due to repeated failures' })
        return
      } else {
        // Reset circuit breaker
        logger.info('Circuit breaker timeout expired, resetting')
        sessionCheckState.isCircuitOpen = false
        sessionCheckState.failureCount = 0
      }
    }

    try {
      logger.authEvent('session_check_start')
      const { data: { session } } = await supabase.auth.getSession()

      logger.authEvent('session_retrieved', session?.user?.id, {
        hasSession: !!session,
        email: session?.user?.email?.split('@')[0]
      })

      if (session?.user) {
        logger.authEvent('profile_lookup_start', session.user.id)
        logger.dbOperation('select', 'User', { userId: session.user.id })

        let profile = null
        let error = null

        try {
          // Direct query to User table with enhanced error handling for 406 errors
          const { data: directProfile, error: directError } = await supabase
            .from('User')
            .select('*')
            .eq('id', session.user.id)
            .single()

          // Handle 406 "Not Acceptable" errors specifically
          if (directError && directError.code === '406') {
            logger.error('406 Not Acceptable error from User table query', directError)
            // Try to refresh the session and retry once
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError) {
              // Retry the query after session refresh
              const { data: retryProfile, error: retryError } = await supabase
                .from('User')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              profile = retryProfile
              error = retryError
            } else {
              profile = null
              error = directError
            }
          } else {
            profile = directProfile
            error = directError
          }

          if (profile) {
            logger.info('Profile loaded successfully', { userId: session.user.id })
            
            // Identify user in PostHog on session check
            posthog?.identify(profile.id, {
              email: profile.email,
              name: profile.name,
              created_at: profile.created_at,
            })
            
            // Reset circuit breaker on success
            sessionCheckState.failureCount = 0
            sessionCheckState.isCircuitOpen = false
          }
        } catch (err: unknown) {
          error = err
          logger.error('Profile fetch error', err as Error)
        }

        if (!error && profile) {
          logger.authEvent('session_check_success', session.user.id)
          set({
            user: profile,
            isLoading: false,
            error: null
          })
          return profile
        } else {
          // Handle profile not found with circuit breaker
          sessionCheckState.failureCount++
          sessionCheckState.lastFailTime = now

          if (sessionCheckState.failureCount >= MAX_FAILURES) {
            sessionCheckState.isCircuitOpen = true
            logger.error('Circuit breaker activated due to repeated profile lookup failures', new Error(`Circuit breaker activated. Failure count: ${sessionCheckState.failureCount}, Max failures: ${MAX_FAILURES}`))
            
            // Circuit breaker activated - log error but don't show toast on public pages
            // Users will see the error state if they try to access protected features
          } else {
            logger.authEvent('profile_not_found', session.user.id, { 
              error: error instanceof Error ? error.message : 'Unknown error',
              failureCount: sessionCheckState.failureCount
            })
            
            // Suppress toast errors for automatic session checks to avoid spamming users on public pages
            // Profile errors will be logged but not shown as toasts during automatic session validation
          }

          // Don't throw error to prevent infinite loops - just set error state
          set({
            user: null,
            isLoading: false,
            error: sessionCheckState.isCircuitOpen 
              ? 'Profile lookup temporarily disabled' 
              : 'Profile not found'
          })
          return null
        }
      }

      logger.authEvent('no_session')
      set({ user: null, isLoading: false, error: null })
      
    } catch (error) {
      logger.error('Session check failed', error as Error)
      set({
        user: null,
        isLoading: false,
        error: 'Session check failed'
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
  },

  resetSessionCheck: () => {
    logger.info('Manually resetting session check circuit breaker')
    sessionCheckState.failureCount = 0
    sessionCheckState.isCircuitOpen = false
    sessionCheckState.lastFailTime = 0
    
    // Clear any error state
    set({ error: null })
    
    toast.success('Session check reset. You can try again.', { 
      duration: 3000,
      id: 'session-check-reset'
    })
  }
}))
