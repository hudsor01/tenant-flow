import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/clients'
import { toast } from 'sonner'

type ProcessingState = 'loading' | 'success' | 'error'

interface ProcessingStatus {
  state: ProcessingState
  message: string
  details?: string
}

/**
 * Simplified Supabase authentication processor
 * Handles Supabase auth callbacks and lets Supabase manage sessions
 */
export default function SupabaseAuthProcessor() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ProcessingStatus>({
    state: 'loading',
    message: 'Processing authentication...',
  })

  useEffect(() => {
    let mounted = true
    
    const processAuthentication = async () => {
      const startTime = performance.now()
      console.log('[Auth] Starting authentication process')
      
      try {
        if (!supabase) {
          throw new Error('Authentication service not available')
        }

        // Check for auth code in URL first (OAuth callback)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        
        if (code) {
          // We have an auth code, exchange it for session
          setStatus({
            state: 'loading',
            message: 'Completing sign in...',
            details: 'Exchanging authentication code',
          })
          
          console.log('[Auth] Exchanging code for session...')
          const exchangeStart = performance.now()
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          console.log(`[Auth] Code exchange took ${(performance.now() - exchangeStart).toFixed(0)}ms`)
          
          if (error) throw error
          
          if (data.session && mounted) {
            console.log(`[Auth] Total auth time: ${(performance.now() - startTime).toFixed(0)}ms`)
            setStatus({
              state: 'success',
              message: 'Authentication successful!',
              details: 'Welcome back!',
            })
            
            toast.success('Successfully signed in!')
            navigate({ to: '/dashboard', replace: true })
            return
          }
        }

        // Check for existing session
        console.log('[Auth] Checking for existing session...')
        const sessionStart = performance.now()
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log(`[Auth] Session check took ${(performance.now() - sessionStart).toFixed(0)}ms`)

        if (error) {
          throw error
        }

        if (!mounted) return

        if (session?.user) {
          console.log(`[Auth] Total auth time: ${(performance.now() - startTime).toFixed(0)}ms`)
          // Success! User is authenticated
          setStatus({
            state: 'success',
            message: 'Authentication successful!',
            details: 'Welcome back!',
          })
          
          toast.success('Successfully signed in!')
          navigate({ to: '/dashboard', replace: true })
        } else {
          // No session - check if this is a sign up confirmation
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const type = hashParams.get('type')
          
          if (type === 'signup') {
            setStatus({
              state: 'success',
              message: 'Email confirmed!',
              details: 'Please sign in to continue',
            })
            
            setTimeout(() => {
              navigate({ to: '/auth/login', replace: true })
            }, 2000)
          } else {
            // No session and not a signup - redirect to login
            setStatus({
              state: 'error',
              message: 'Authentication required',
              details: 'Please sign in to continue',
            })

            setTimeout(() => {
              navigate({ to: '/auth/login', replace: true })
            }, 2000)
          }
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
          navigate({ to: '/auth/login', replace: true })
        }, 2000)
      }
    }

    // Start processing immediately
    processAuthentication()
    
    // Add a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (mounted && status.state === 'loading') {
        console.log('[Auth] Authentication timeout - redirecting to login')
        setStatus({
          state: 'error',
          message: 'Authentication timeout',
          details: 'Taking too long, please try again',
        })
        toast.error('Authentication timeout')
        navigate({ to: '/auth/login', replace: true })
      }
    }, 10000) // 10 second timeout
    
    // Cleanup
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [navigate])

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