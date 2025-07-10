import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

/**
 * Auth callback component that handles:
 * 1. Supabase email confirmation tokens
 * 2. OAuth callbacks (when implemented)
 * 3. Password reset tokens
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, getToken, refresh } = useAuth()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse the URL hash to get Supabase tokens
        const hashParams = new URLSearchParams(location.hash.substring(1))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        const error = hashParams.get('error')
        const error_description = hashParams.get('error_description')

        // Handle errors from Supabase
        if (error) {
          logger.error('Auth callback error', new Error(error_description || error || 'Unknown error'))
          toast.error(error_description || 'Authentication failed')
          navigate('/auth/login?error=' + encodeURIComponent(error))
          return
        }

        // Handle Supabase email confirmation
        if (access_token && refresh_token) {
          logger.info('Processing Supabase auth callback', undefined, { type })
          
          try {
            // Exchange Supabase tokens with our backend
            const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://tenantflow.app/api/v1'
            const response = await fetch(`${baseUrl}/auth/callback`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                access_token,
                refresh_token,
                type
              })
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const responseData = await response.json()

            if (responseData.access_token) {
              // Store our backend JWT tokens
              localStorage.setItem('access_token', responseData.access_token)
              if (responseData.refresh_token) {
                localStorage.setItem('refresh_token', responseData.refresh_token)
              }

              // Refresh auth context
              await refresh()

              // Show success message based on type
              if (type === 'signup') {
                toast.success('Email verified successfully! Welcome to TenantFlow.')
              } else if (type === 'recovery') {
                navigate('/auth/update-password')
                return
              }

              // Redirect based on user role
              const userData = responseData.user
              if (userData?.role === 'TENANT') {
                navigate('/tenant/dashboard')
              } else {
                navigate('/dashboard')
              }
              return
            }
          } catch (error) {
            logger.error('Failed to exchange tokens with backend', error as Error)
            toast.error('Authentication failed. Please try logging in again.')
            navigate('/auth/login')
            return
          }
        }

        // If we already have authenticated user (from regular login)
        const accessToken = getToken()
        if (accessToken && user) {
          logger.info('Auth callback - user already authenticated', undefined, { userId: user.id })
          
          // Check user role to determine redirect
          // TODO: Add role detection logic when user profile is available
          navigate('/dashboard')
        } else {
          logger.warn('No auth tokens found in callback')
          navigate('/auth/login?message=authentication_required')
        }
      } catch (error) {
        logger.error('Auth callback handling failed', error as Error)
        navigate('/auth/login?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [navigate, location, getToken, user, refresh])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}