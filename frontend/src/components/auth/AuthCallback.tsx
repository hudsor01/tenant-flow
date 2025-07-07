import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

/**
 * Auth callback component for JWT-based authentication
 * Handles OAuth callback and token exchange through NestJS backend
 * TODO: Update when Google OAuth is implemented in NestJS backend
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // TODO: Handle OAuth callback from NestJS backend when implemented
        // For now, since Google OAuth is not yet implemented in the backend,
        // we'll redirect based on current auth state
        
        if (accessToken && user) {
          logger.info('Auth callback successful', { userId: user.id })
          
          // Check user role to determine redirect
          if (user.role === 'TENANT') {
            navigate('/tenant/dashboard')
          } else {
            navigate('/dashboard')
          }
        } else {
          logger.warn('No authenticated user found in auth callback')
          navigate('/auth/login?message=authentication_required')
        }
      } catch (error) {
        logger.error('Auth callback handling failed', error as Error)
        navigate('/auth/login?error=callback_failed')
      }
    }

    // Add a small delay to allow auth state to initialize
    const timer = setTimeout(handleAuthCallback, 1000)
    return () => clearTimeout(timer)
  }, [navigate, accessToken, user])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}