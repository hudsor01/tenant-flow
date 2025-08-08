import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/clients'
import { signInWithGoogle } from '@/lib/clients/supabase-oauth'
import type { AuthError } from '@repo/shared'

interface SignupData {
  name: string
  email: string
  password: string
  confirmPassword: string
  agreedToTerms: boolean
}

interface UseSignupOptions {
  redirectTo?: string
  onSuccess?: () => void
}

export function useSignup({ redirectTo = '/dashboard', onSuccess }: UseSignupOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const signupWithEmail = async (data: SignupData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Validation
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (!data.agreedToTerms) {
        throw new Error('Please agree to the terms and conditions')
      }

      if (!supabase) {
        throw new Error('Authentication service is not available')
      }

      const { error, data: authData } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup&redirect=${redirectTo}`,
          data: {
            name: data.name,
            full_name: data.name
          }
        }
      })
      
      if (error) throw error
      
      if (authData.user) {
        setSuccess(true)
        onSuccess?.()
      }
    } catch (error) {
      const authError = error as AuthError
      setError(authError.message || 'An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

  const signupWithGoogle = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signInWithGoogle()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to sign up with Google')
      }
      // If successful, Supabase will redirect to the callback URL
    } catch (error) {
      const authError = error as AuthError
      setError(authError.message || 'An error occurred')
      setIsLoading(false)
    }
  }

  const clearError = () => setError(null)
  
  const resetToSignIn = () => {
    router.push('/auth/login')
  }

  return {
    isLoading,
    error,
    success,
    signupWithEmail,
    signupWithGoogle,
    clearError,
    resetToSignIn
  }
}