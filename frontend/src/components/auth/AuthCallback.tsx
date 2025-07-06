import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase-client'
import { logger } from '@/lib/logger'

/**
 * Auth callback component following Supabase 2025 best practices
 * Handles OAuth callback and code exchange automatically
 * @see https://supabase.com/docs/guides/auth/social-login/auth-google
 */
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for auth code in URL
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          logger.error('Auth callback error', error)
          navigate('/auth/login?error=callback_failed')
          return
        }

        if (data.session) {
          logger.info('Auth callback successful', { userId: data.session.user.id })
          
          // Check user role to determine redirect
          const { data: userProfile } = await supabase
            .from('User')
            .select('role')
            .eq('id', data.session.user.id)
            .single()

          if (userProfile?.role === 'TENANT') {
            navigate('/tenant/dashboard')
          } else {
            navigate('/dashboard')
          }
        } else {
          logger.warn('No session found in auth callback')
          navigate('/auth/login')
        }
      } catch (error) {
        logger.error('Auth callback handling failed', error as Error)
        navigate('/auth/login?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}