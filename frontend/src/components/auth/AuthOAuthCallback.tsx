import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type CallbackState = 'loading' | 'success' | 'error'

interface CallbackStatus {
  state: CallbackState
  message: string
  details?: string
}

/**
 * OAuth callback handler component
 * Processes the OAuth response from Supabase and redirects appropriately
 */
export default function AuthOAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<CallbackStatus>({
    state: 'loading',
    message: 'Processing authentication...',
  })

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Check for error parameters
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus({
            state: 'error',
            message: 'Authentication failed',
            details: errorDescription || error,
          })
          toast.error('Authentication failed')
          
          // Redirect to login after a delay
          setTimeout(() => {
            navigate('/auth/login', { replace: true })
          }, 3000)
          return
        }

        // Process the auth callback
        const { data, error: authError } = await supabase.auth.getSession()

        if (authError) {
          console.error('OAuth callback error:', authError)
          setStatus({
            state: 'error',
            message: 'Failed to authenticate',
            details: authError.message,
          })
          toast.error('Authentication failed')
          
          setTimeout(() => {
            navigate('/auth/login', { replace: true })
          }, 3000)
          return
        }

        if (!data.session) {
          setStatus({
            state: 'error',
            message: 'No session found',
            details: 'Please try signing in again',
          })
          toast.error('Authentication failed')
          
          setTimeout(() => {
            navigate('/auth/login', { replace: true })
          }, 3000)
          return
        }

        // Successfully authenticated
        const user = data.session.user
        setStatus({
          state: 'success',
          message: `Welcome${user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!`,
          details: 'Redirecting to your dashboard...',
        })

        toast.success('Successfully signed in!')

        // Small delay to show success state before redirect
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 1500)

      } catch (error) {
        console.error('Unexpected error in OAuth callback:', error)
        setStatus({
          state: 'error',
          message: 'An unexpected error occurred',
          details: 'Please try signing in again',
        })
        toast.error('Authentication failed')
        
        setTimeout(() => {
          navigate('/auth/login', { replace: true })
        }, 3000)
      }
    }

    handleOAuthCallback()
  }, [navigate, searchParams])

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
                onClick={() => navigate('/auth/login', { replace: true })}
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