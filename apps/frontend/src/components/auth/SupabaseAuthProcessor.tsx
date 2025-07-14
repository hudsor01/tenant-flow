import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpcClient'

type ProcessingState = 'loading' | 'success' | 'error'

interface ProcessingStatus {
  state: ProcessingState
  message: string
  details?: string
}

/**
 * Unified Supabase authentication processor
 * Handles all types of Supabase auth callbacks:
 * 1. OAuth callbacks (Google, GitHub, etc.)
 * 2. Email confirmation tokens
 * 3. Password reset tokens
 * 4. Magic link authentication
 */
export default function SupabaseAuthProcessor() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, getToken, refresh } = useAuth()
  const [status, setStatus] = useState<ProcessingStatus>({
    state: 'loading',
    message: 'Processing authentication...',
  })

  useEffect(() => {
    const processAuthentication = async () => {
      try {
        // First check for URL search params (OAuth flow)
        const searchParams = new URLSearchParams(window.location.search)
        const redirectParam = searchParams.get('redirect')

        // Then check for URL hash params (email confirmation flow)
        const hashParams = new URLSearchParams(location.hash.substring(1))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        const error = hashParams.get('error')
        const error_description = hashParams.get('error_description')

        // Handle errors from Supabase
        if (error) {
          logger.error('Auth callback error', new Error(error_description || error || 'Unknown error'))
          setStatus({
            state: 'error',
            message: 'Authentication failed',
            details: error_description || 'Please try signing in again',
          })
          toast.error(error_description || 'Authentication failed')

          setTimeout(() => {
            navigate({ to: '/auth/login', search: { error: error || '' }, replace: true })
          }, 3000)
          return
        }

        // Get current session to check authentication status
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          logger.error('Session retrieval error', sessionError)
          setStatus({
            state: 'error',
            message: 'Failed to retrieve session',
            details: sessionError.message,
          })
          toast.error('Authentication failed')

          setTimeout(() => {
            navigate({ to: '/auth/login', replace: true })
          }, 3000)
          return
        }

        // Handle email confirmation with tokens
        if (access_token && refresh_token && type) {
          logger.info('Processing email confirmation callback', undefined, { type })

          setStatus({
            state: 'loading',
            message: 'Verifying your email...',
            details: 'Please wait while we confirm your account',
          })

          // Refresh auth context after email confirmation
          await refresh()

          // Show success message based on type
          if (type === 'signup') {
            setStatus({
              state: 'success',
              message: 'Email verified successfully!',
              details: 'Welcome to TenantFlow. Redirecting to get started...',
            })
            toast.success('Email verified successfully! Welcome to TenantFlow.')

            setTimeout(() => {
              navigate({ to: '/get-started' })
            }, 2000)
            return
          } else if (type === 'recovery') {
            setStatus({
              state: 'success',
              message: 'Password reset verified',
              details: 'Redirecting to update your password...',
            })

            setTimeout(() => {
              navigate({ to: '/auth/update-password' })
            }, 1500)
            return
          }
        }

        // Handle OAuth callback with active session
        if (data.session) {
          const user = data.session.user

          setStatus({
            state: 'success',
            message: `Welcome${user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!`,
            details: 'Redirecting to your dashboard...',
          })

          toast.success('Successfully signed in!')

          // Determine redirect destination
          const redirectTo = redirectParam || '/dashboard'

          setTimeout(() => {
            navigate({ to: redirectTo })
          }, 1500)
          return
        }

        // If we already have authenticated user from context
        const accessToken = getToken()
        if (accessToken && user) {
          logger.info('Auth callback - user already authenticated', undefined, { userId: user.id })

          setStatus({
            state: 'success',
            message: 'Already authenticated',
            details: 'Redirecting to dashboard...',
          })

          setTimeout(() => {
            navigate({ to: '/dashboard' })
          }, 1000)
          return
        }

        // No authentication found
        logger.warn('No auth tokens or session found in callback')
        setStatus({
          state: 'error',
          message: 'Authentication required',
          details: 'Please sign in to continue',
        })

        setTimeout(() => {
          navigate({
            to: '/auth/login',
            search: { message: 'authentication_required' },
            replace: true
          })
        }, 3000)

      } catch (error) {
        logger.error('Auth processing failed', error as Error)
        setStatus({
          state: 'error',
          message: 'An unexpected error occurred',
          details: 'Please try signing in again',
        })
        toast.error('Authentication failed')

        setTimeout(() => {
          navigate({
            to: '/auth/login',
            search: { error: 'callback_failed' },
            replace: true
          })
        }, 3000)
      }
    }

    processAuthentication()
  }, [navigate, location, getToken, user, refresh])

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
                onClick={() => navigate({ to: '/auth/login' })}
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