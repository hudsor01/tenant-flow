import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/api'
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
    const processAuthentication = async () => {
      try {
        if (!supabase) {
          throw new Error('Authentication service not available')
        }

        // Let Supabase handle the callback automatically
        setStatus({
          state: 'loading',
          message: 'Verifying authentication...',
          details: 'Please wait while we process your login',
        })

        // Check if we have a valid session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (session?.user) {
          // Success! User is authenticated
          setStatus({
            state: 'success',
            message: 'Authentication successful!',
            details: 'Redirecting to dashboard...',
          })
          
          toast.success('Successfully signed in!')

          // Redirect to dashboard
          setTimeout(() => {
            navigate({ to: '/dashboard' })
          }, 1500)
        } else {
          // No session - redirect to login
          setStatus({
            state: 'error',
            message: 'Authentication required',
            details: 'Please sign in to continue',
          })

          setTimeout(() => {
            navigate({ to: '/auth/login' })
          }, 3000)
        }
      } catch (error) {
        console.error('Auth processing error:', error)
        
        setStatus({
          state: 'error',
          message: 'Authentication failed',
          details: error instanceof Error ? error.message : 'Please try signing in again',
        })
        
        toast.error('Authentication failed')

        setTimeout(() => {
          navigate({ to: '/auth/login' })
        }, 3000)
      }
    }

    processAuthentication()
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