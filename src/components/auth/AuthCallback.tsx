import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { logger } from '../../lib/logger'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const checkSession = useAuthStore(state => state.checkSession)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        logger.info('Auth callback started', {
          hash: window.location.hash,
          search: window.location.search,
          href: window.location.href
        })
        
        // Get the URL parameters for code and next route
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const next = urlParams.get('next') ?? '/dashboard'
        const errorParam = urlParams.get('error')
        
        // Check for errors in the URL first
        if (errorParam) {
          const errorDescription = urlParams.get('error_description')
          logger.error('OAuth error in URL', new Error(errorDescription || errorParam))
          setError(errorDescription || errorParam || 'Authentication failed')
          return
        }
        
        // Handle authorization code exchange (recommended flow)
        if (code) {
          logger.info('Found authorization code, exchanging for session')
          
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

          if (sessionError) {
            logger.error('Failed to exchange code for session', sessionError)
            setError(sessionError.message)
            return
          }

          if (data.session) {
            logger.info('Session created successfully', { userId: data.session.user.id })
            
            // Wait a moment for the session to be fully established
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Now check the session which will load the profile
            await checkSession()
            
            // Navigate to the next route
            navigate(next)
            return
          }
        }
        
        // Fallback: Check for implicit flow tokens in hash (legacy)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken) {
          logger.info('Found tokens in hash, setting session (legacy flow)')
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (sessionError) {
            logger.error('Failed to set session', sessionError)
            setError(sessionError.message)
            return
          }

          if (data.session) {
            logger.info('Session set successfully', { userId: data.session.user.id })
            await checkSession()
            navigate('/dashboard')
            return
          }
        }
        
        // No valid auth data found
        logger.error('No valid authentication data found in URL')
        setError('No authentication data received')
        
      } catch (err) {
        logger.error('Auth callback error', err as Error)
        setError('An unexpected error occurred during authentication')
      }
    }

    handleCallback()
  }, [navigate, checkSession])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate('/auth/login')}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Back to Login
              </button>
              <button
                onClick={() => {
                  // Try to sign up instead
                  navigate('/auth/signup')
                }}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Sign Up Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Completing authentication...</p>
        <p className="mt-2 text-xs text-gray-400">Setting up your session...</p>
      </div>
    </div>
  )
}