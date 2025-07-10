import React, { useEffect, useState } from 'react'
import type { User } from '@/types/entities'
import { apiClient, ApiClientError, TokenManager } from '@/lib/api'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import { AuthContext, type AuthContextType } from './auth-context'

/**
 * Auth Provider using NestJS backend API
 * Manages JWT tokens and user profiles through backend API
 * No direct external service dependencies
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  /**
   * Fetch user profile from backend API
   */
  const fetchUserProfile = async (): Promise<User | null> => {
    try {
      const token = TokenManager.getAccessToken()
      if (!token) {
        throw new Error('No access token available')
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://tenantflow.app/api/v1'
      const response = await fetch(`${baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Failed to fetch user profile', error as Error)
      throw error
    }
  }

  /**
   * Initialize auth state from stored tokens
   */
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const token = TokenManager.getAccessToken()
        
        if (mounted) {
          if (token) {
            setAccessToken(token)
            try {
              const userProfile = await fetchUserProfile()
              setUser(userProfile)
              setError(null)
            } catch {
              // Token might be expired, clear it
              TokenManager.clearTokens()
              setAccessToken(null)
              setUser(null)
            }
          }
          setIsLoading(false)
        }
      } catch (error) {
        logger.error('Auth initialization failed', error as Error)
        if (mounted) {
          setError('Failed to initialize authentication')
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.auth.register({
        email,
        password,
        name,
        confirmPassword: password
      })

      if (response.access_token) {
        // Registration successful with immediate login
        setAccessToken(response.access_token)
        
        try {
          const userProfile = await fetchUserProfile()
          setUser(userProfile)
          toast.success('Account created successfully!')
        } catch (profileError) {
          logger.error('Failed to fetch user profile after registration', profileError as Error)
          // Registration succeeded but profile fetch failed - still continue
          toast.success('Account created successfully! Please refresh to see your profile.')
        }
      } else {
        // Registration successful but email confirmation required
        toast.success('Please check your email to confirm your account')
      }
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        logger.error('Sign up failed', error)
        setError(error.message)
        toast.error(error.message)
      } else {
        const authError = error as Error
        logger.error('Sign up failed', authError)
        setError(authError.message || 'Sign up failed')
        toast.error(authError.message || 'Sign up failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.auth.login({
        email,
        password
      })

      if (response.access_token) {
        setAccessToken(response.access_token)
        
        try {
          const userProfile = await fetchUserProfile()
          setUser(userProfile)
          toast.success('Welcome back!')
        } catch (profileError) {
          logger.error('Failed to fetch user profile after login', profileError as Error)
          // Login succeeded but profile fetch failed - still continue
          toast.success('Welcome back! Please refresh to see your profile.')
        }
      }
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        logger.error('Sign in failed', error)
        setError(error.message)
        toast.error(error.message)
      } else {
        const authError = error as Error
        logger.error('Sign in failed', authError)
        setError(authError.message || 'Sign in failed')
        toast.error(authError.message || 'Sign in failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign in with Google OAuth
   * Redirects to Google OAuth endpoint in NestJS backend
   */
  const signInWithGoogle = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Redirect to Google OAuth endpoint
      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://api.tenantflow.app/api/v1'
      const googleOAuthUrl = `${baseUrl}/auth/google`
      
      // Redirect to the backend Google OAuth endpoint
      window.location.href = googleOAuthUrl
    } catch (error: unknown) {
      const authError = error as Error
      logger.error('Google sign in failed', authError)
      setError(authError.message || 'Google sign in failed')
      toast.error(authError.message || 'Google sign in failed')
      setIsLoading(false)
    }
  }

  /**
   * Sign out
   */
  const signOut = async () => {
    setIsLoading(true)

    try {
      // Clear tokens and state immediately
      TokenManager.clearTokens()
      setAccessToken(null)
      setUser(null)
      setError(null)
      
      toast.success('Signed out successfully')
    } catch (error: unknown) {
      const authError = error as Error
      logger.error('Sign out failed', authError)
      setError(authError.message || 'Sign out failed')
      toast.error(authError.message || 'Sign out failed')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (updates: Partial<User>) => {
    if (!user || !accessToken) return

    setIsLoading(true)

    try {
      const response = await apiClient.users.updateProfile(updates)
      setUser(response)
      toast.success('Profile updated')
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        logger.error('Profile update failed', error)
        setError(error.message)
        toast.error(error.message)
      } else {
        const authError = error as Error
        logger.error('Profile update failed', authError)
        setError(authError.message || 'Profile update failed')
        toast.error(authError.message || 'Profile update failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Refresh session/tokens
   */
  const refreshSession = async () => {
    try {
      const refreshToken = TokenManager.getRefreshToken()
      if (!refreshToken) {
        logger.warn('No refresh token available')
        return
      }

      const response = await apiClient.auth.refresh(refreshToken)
      if (response.access_token) {
        setAccessToken(response.access_token)
        
        // Optionally refresh user profile
        try {
          const userProfile = await fetchUserProfile()
          setUser(userProfile)
        } catch (error) {
          logger.warn('Failed to refresh user profile during session refresh', error as Error)
        }
      }
    } catch (error: unknown) {
      logger.error('Session refresh failed', error as Error)
      // If refresh fails, clear tokens and redirect to login
      TokenManager.clearTokens()
      setAccessToken(null)
      setUser(null)
    }
  }

  const value: AuthContextType = {
    accessToken,
    token: accessToken, // Alias for WebSocket compatibility
    user,
    isLoading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

