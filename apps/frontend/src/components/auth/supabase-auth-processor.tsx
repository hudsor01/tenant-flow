'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from '@/lib/framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { toastMessages } from '@/lib/toast-messages'
import { debugSupabaseAuth } from '@/lib/debug-auth'
import type { Session, AuthError } from '@supabase/supabase-js'

type ProcessingState = 'loading' | 'success' | 'error'

interface ProcessingStatus {
  state: ProcessingState
  message: string
  details?: string
}

// Global processing flags to prevent multiple concurrent auth operations
let isProcessing = false
let successfulAuthCache: { timestamp: number; path: string } | null = null
const AUTH_CACHE_TTL = 5000 // 5 seconds

/**
 * Simplified Supabase authentication processor
 * Handles Supabase auth callbacks and lets Supabase manage sessions
 */
export function SupabaseAuthProcessor() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ProcessingStatus>({
    state: 'loading',
    message: 'Processing authentication...',
  })

  useEffect(() => {
    let mounted = true
    
    const processAuthentication = async () => {
      // Check if we're already processing or recently succeeded
      const now = Date.now()
      const currentPath = window.location.href
      
      if (isProcessing) {
        debugSupabaseAuth.log('Auth processing already in progress, skipping')
        return
      }
      
      if (successfulAuthCache && 
          (now - successfulAuthCache.timestamp) < AUTH_CACHE_TTL &&
          successfulAuthCache.path === currentPath) {
        debugSupabaseAuth.log('Recent successful auth cached, skipping reprocessing')
        // Redirect immediately to dashboard
        setTimeout(() => {
          void router.push('/dashboard')
        }, 100)
        return
      }
      
      isProcessing = true
      debugSupabaseAuth.log('Starting authentication processing')
      
      try {
        if (!supabase) {
          throw new Error('Authentication service not available')
        }

        // Check URL hash first for email confirmation tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')  
        const type = hashParams.get('type')
        const error = hashParams.get('error')
        const errorCode = hashParams.get('error_code')
        const errorDescription = hashParams.get('error_description')
        
        debugSupabaseAuth.log('Hash params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          error,
          errorCode
        })
        
        // Check if there's an error in the hash
        if (error || errorCode) {
          
          // Even if there's an error, check if we have a valid session
          // This can happen when the email link expires but the user is already logged in
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            
            // Invalidate auth queries to ensure fresh user data
            await queryClient.invalidateQueries({ queryKey: ['auth'] })
            
            setStatus({
              state: 'success',
              message: 'Already authenticated!',
              details: 'Redirecting to dashboard...',
            })
            
            toast.success('Welcome back! You are already signed in.')
            
            // Clear the error hash from URL
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            
            setTimeout(() => {
              void router.push('/dashboard')
            }, 500)
            return
          }
          
          // If we have an OTP expired error, show specific message
          if (errorCode === 'otp_expired') {
            setStatus({
              state: 'error',
              message: 'Email link expired',
              details: 'Please request a new confirmation email',
            })
            
            toast.error('Email confirmation link has expired. Please sign up again.')
            
            setTimeout(() => {
              void router.push('/auth/login')
            }, 3000)
            return
          }
          
          // Other errors
          throw new Error(errorDescription || error || 'Authentication failed')
        }
        
        if (accessToken && refreshToken) {
          // Email confirmation tokens found
          setStatus({
            state: 'loading',
            message: type === 'signup' ? 'Confirming your email...' : 'Completing sign in...',
            details: 'Setting up your session',
          })
          
          const sessionStart = performance.now()
          
          try {
            // Add a timeout to setSession to prevent hanging
            const setSessionPromise = supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session setup timeout')), 15000)
            )
            
            const { data, error } = await Promise.race([
              setSessionPromise,
              timeoutPromise
            ]) as { data: { session: Session | null } | null; error: AuthError | null }
            
            const setSessionTime = performance.now() - sessionStart
            
            if (setSessionTime > 8000) {
              console.warn('[Auth] Session setup is taking unusually long!', setSessionTime)
            }
            
            if (error) {
              console.error('[Auth] SetSession error:', error)
              throw error
            }
            
            if (data?.session && mounted) {
              // Verify the session was actually stored
              const { data: { session: verifiedSession } } = await supabase.auth.getSession()
              console.log('[Auth] Verified session stored:', !!verifiedSession)
              
              // Invalidate auth queries to ensure fresh user data
              await queryClient.invalidateQueries({ queryKey: ['auth'] })
              
              setStatus({
                state: 'success',
                message: type === 'signup' ? 'Email confirmed!' : 'Authentication successful!',
                details: 'Welcome to TenantFlow!',
              })
              
              toast.success(type === 'signup' ? toastMessages.auth.emailConfirmed : toastMessages.auth.signInSuccess)
              
              // Clear the hash from URL to prevent reprocessing
              window.history.replaceState(null, '', window.location.pathname + window.location.search)
              
              // Cache successful auth  
              successfulAuthCache = { timestamp: Date.now(), path: window.location.href }
              
              // Navigate to dashboard
              setTimeout(() => {
                void router.push('/dashboard')
              }, 500)
              return
            } else {
              console.warn('[Auth] No session returned from setSession')
            }
          } catch (err) {
            console.error('[Auth] Error setting session from tokens:', err)
            
            // If setSession fails but we have valid tokens, try to proceed anyway
            // The tokens in the URL are valid, Supabase client should pick them up
            if (accessToken && refreshToken && type === 'signup') {
              setStatus({
                state: 'success',
                message: 'Email confirmed!',
                details: 'Redirecting to dashboard...',
              })
              
              toast.success('Email confirmed! Welcome to TenantFlow!')
              
              // Clear the hash to prevent reprocessing
              window.history.replaceState(null, '', window.location.pathname + window.location.search)
              
              setTimeout(() => {
                void router.push('/dashboard')
              }, 1000)
              return
            }
            
            throw err
          }
        }
        
        // Check for OAuth code in URL params (OAuth callback)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        
        if (code) {
          // We have an auth code, exchange it for session
          setStatus({
            state: 'loading',
            message: 'Completing sign in...',
            details: 'Exchanging authentication code',
          })
          
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            
            if (error) throw error
            
            if (data.session && mounted) {
              // Invalidate auth queries to ensure fresh user data
              await queryClient.invalidateQueries({ queryKey: ['auth'] })
              
              setStatus({
                state: 'success',
                message: 'Authentication successful!',
                details: 'Welcome back!',
              })
              
              toast.success(toastMessages.auth.signInSuccess)
              void router.push('/dashboard')
              return
            }
          } catch (err) {
            // Handle PKCE cross-browser error gracefully
            if (err instanceof Error && err.message.includes('code verifier')) {
              console.error('[Auth] PKCE error - user likely clicked email link in different browser')
              setStatus({
                state: 'error',
                message: 'Authentication error',
                details: 'Please sign in again or use the same browser you signed up with',
              })
              toast.error('Please use the same browser you signed up with')
              setTimeout(() => void router.push('/auth/login'), 3000)
              return
            }
            throw err
          }
        }

        // Check if this might be an email confirmation without tokens
        // When Supabase has "Confirm email" enabled in auth settings, it redirects
        // to the callback URL after email confirmation but WITHOUT auth tokens
        const searchParams = new URLSearchParams(window.location.search)
        const isEmailConfirmation = searchParams.has('type') && searchParams.get('type') === 'signup'
        
        debugSupabaseAuth.log('Search params:', {
          isEmailConfirmation,
          allParams: Object.fromEntries(searchParams.entries())
        })
        
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!mounted) return

        if (session?.user) {
          // Invalidate auth queries to ensure fresh user data
          await queryClient.invalidateQueries({ queryKey: ['auth'] })
          
          // Success! User is authenticated
          setStatus({
            state: 'success',
            message: 'Authentication successful!',
            details: 'Welcome back!',
          })
          
          toast.success(toastMessages.auth.signInSuccess)
          void router.push('/dashboard')
        } else if (isEmailConfirmation) {
          // This is an email confirmation that succeeded
          setStatus({
            state: 'success',
            message: 'Email confirmed successfully!',
            details: 'Redirecting to sign in...',
          })
          
          toast.success('Email confirmed! Welcome to TenantFlow!')
          
          // Clear any cache to ensure fresh session check
          await queryClient.invalidateQueries({ queryKey: ['auth'] })
          
          // For Double Opt-In mode, redirect quickly to login with helpful message
          setTimeout(() => {
            debugSupabaseAuth.log('Double opt-in email confirmation, redirecting to login')
            toast.success('Email confirmed! Please sign in to continue.')
            void router.push('/auth/login?emailConfirmed=true')
          }, 1500)
        } else {
          // No session found - redirect to login
          setStatus({
            state: 'error',
            message: 'Authentication required',
            details: 'Please sign in to continue',
          })

          setTimeout(() => {
            void router.push('/auth/login')
          }, 2000)
        }
      } catch (error) {
        if (!mounted) return
        
        console.error('Auth processing error:', error)
        
        setStatus({
          state: 'error',
          message: 'Authentication error',
          details: error instanceof Error ? error.message : 'Please try signing in again',
        })
        
        toast.error('Authentication failed')

        setTimeout(() => {
          void router.push('/auth/login')
        }, 2000)
      } finally {
        // Always clear the processing flag
        isProcessing = false
      }
    }

    // Start processing immediately
    void processAuthentication()
    
    // Add a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (mounted && status.state === 'loading') {
        setStatus({
          state: 'error',
          message: 'Authentication timeout',
          details: 'Taking too long, please try again',
        })
        toast.error('Authentication timeout')
        void router.push('/auth/login')
      }
    }, 20000) // 20 second timeout - balance between reliability and UX
    
    // Cleanup
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [queryClient, router, status.state])

  const getIcon = () => {
    switch (status.state) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />
      default:
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />
    }
  }

  const getColorClasses = () => {
    switch (status.state) {
      case 'loading':
        return 'border-primary/20 bg-primary/5'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`w-full max-w-md rounded-2xl border-2 p-8 text-center shadow-xl backdrop-blur-sm ${getColorClasses()}`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-6 flex justify-center"
        >
          {getIcon()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {status.message}
          </h1>

          {status.details && (
            <p className="text-muted-foreground">
              {status.details}
            </p>
          )}

          {status.state === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4"
            >
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          )}

          {status.state === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4"
            >
              <button
                onClick={() => void router.push('/auth/login')}
                className="text-primary hover:text-primary/80 font-semibold underline transition-colors"
              >
                Return to login
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}