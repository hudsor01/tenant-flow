import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * Auth callback component following official Supabase documentation
 * Handles the OAuth callback and code exchange for authentication
 * @see https://supabase.com/docs/guides/auth/social-login/auth-google
 * @see https://supabase.com/docs/guides/auth/sessions
 */
export default function AuthCallbackOfficial() {
  const navigate = useNavigate()

  useEffect(() => {
    // Handle the OAuth callback
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Successful authentication
        console.log('Auth successful, redirecting to dashboard')
        
        // The session is already established, navigate to dashboard
        navigate('/dashboard')
      } else if (event === 'USER_UPDATED') {
        // Handle user updates if needed
        console.log('User updated')
      }
    })

    // Exchange the code for a session
    // This happens automatically when detectSessionInUrl is true in the client config
    // The Supabase client will handle the code exchange and trigger the auth state change
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