import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TokenManager } from '@/lib/api'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'

/**
 * OAuth Success Page - Handles redirect from Google OAuth backend
 * Extracts tokens from URL parameters and stores them
 */
export default function OAuthSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing authentication...')

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Extract tokens and user info from URL parameters
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const expiresIn = searchParams.get('expires_in')
        const userId = searchParams.get('user_id')
        const userEmail = searchParams.get('user_email')
        const userName = searchParams.get('user_name')
        const userRole = searchParams.get('user_role')

        if (!accessToken || !refreshToken) {
          throw new Error('Missing authentication tokens')
        }

        // Store tokens
        TokenManager.setTokens(accessToken, refreshToken)

        // Show success message
        setStatus('success')
        setMessage(`Welcome ${userName || userEmail}!`)
        
        logger.info('Google OAuth authentication successful', undefined, {
          userId,
          userEmail,
          userRole
        })

        toast.success('Successfully signed in with Google!')

        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 2000)

      } catch (error) {
        logger.error('OAuth callback processing failed', error as Error)
        setStatus('error')
        setMessage('Authentication failed. Please try again.')
        toast.error('Authentication failed')

        // Redirect to login after short delay
        setTimeout(() => {
          navigate('/auth/login', { replace: true })
        }, 3000)
      }
    }

    processOAuthCallback()
  }, [searchParams, navigate])

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
    }
  }

  return (
    <AuthLayout 
      title="Authentication Complete" 
      subtitle="Processing your Google authentication..."
      image={{
        src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80',
        alt: 'Modern property management dashboard'
      }}
      heroContent={{
        title: 'Welcome to TenantFlow',
        description: 'Your authentication is being processed. You\'ll be redirected to your dashboard shortly.'
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-6 py-12">
        {/* Status Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
          {getIcon()}
        </div>

        {/* Status Message */}
        <div className="text-center">
          <h2 className={`text-lg font-semibold ${getStatusColor()}`}>
            {status === 'processing' && 'Processing Authentication...'}
            {status === 'success' && 'Authentication Successful!'}
            {status === 'error' && 'Authentication Failed'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>
        </div>

        {/* Additional Info */}
        {status === 'success' && (
          <p className="text-xs text-gray-500">
            Redirecting to your dashboard...
          </p>
        )}
        
        {status === 'error' && (
          <p className="text-xs text-gray-500">
            Redirecting to login page...
          </p>
        )}
      </div>
    </AuthLayout>
  )
}