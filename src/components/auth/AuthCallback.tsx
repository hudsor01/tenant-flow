import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { logger } from '../../lib/logger'

// Security function to validate redirect URLs and prevent open redirect attacks
function validateRedirectUrl(url: string): string {
  // Default safe route
  const defaultRoute = '/dashboard'
  
  // Allow only relative URLs that start with /
  if (!url.startsWith('/')) {
    logger.warn('Invalid redirect URL (not relative)', { url })
    return defaultRoute
  }
  
  // Block URLs that might be used for malicious redirects
  if (url.startsWith('//') || url.includes('..') || url.includes('\\')) {
    logger.warn('Potentially malicious redirect URL blocked', { url })
    return defaultRoute
  }
  
  // Allowed route patterns
  const allowedPaths = [
    '/dashboard',
    '/properties',
    '/tenants', 
    '/payments',
    '/maintenance',
    '/settings',
    '/profile',
    '/subscription',
    '/tenant',
    '/auth'
  ]
  
  // Check if the URL starts with any allowed path
  const isAllowed = allowedPaths.some(path => url.startsWith(path))
  
  if (!isAllowed) {
    logger.warn('Redirect URL not in allowlist', { url, allowedPaths })
    return defaultRoute
  }
  
  return url
}

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
        const setupParam = urlParams.get('setup')
        const nextParam = urlParams.get('next') ?? (setupParam ? '/dashboard?setup=success' : '/dashboard')
        const next = validateRedirectUrl(nextParam) // Validate redirect URL for security
        const errorParam = urlParams.get('error')
        
        logger.info('Auth callback processing', { 
          requestedNext: nextParam, 
          validatedNext: next,
          hasCode: !!code 
        })
        
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
            
            // If this is a setup flow, link any pending subscriptions
            if (setupParam) {
              logger.info('Setup flow detected, linking subscriptions')
              try {
                const { error: linkError } = await supabase
                  .from('Subscription')
                  .update({ userId: data.session.user.id })
                  .eq('userEmail', data.session.user.email)
                  .is('userId', null);

                if (linkError) {
                  logger.error('Error linking subscription during setup', linkError);
                } else {
                  logger.info('Successfully linked subscription during setup');
                }
              } catch (linkErr) {
                logger.error('Subscription linking failed during setup', linkErr as Error);
              }
            }
            
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
            navigate(next) // Use validated next URL instead of hardcoded /dashboard
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