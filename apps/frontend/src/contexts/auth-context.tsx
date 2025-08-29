'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase/client'
import { get, post } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import type { User, LoginCredentials, SignupCredentials } from '@repo/shared/types/auth'
import { type TypedAuthError } from '@repo/shared/types/auth-errors'

interface AuthContextType {
  // State
  user: User | null
  loading: boolean
  error: TypedAuthError | null
  isAuthenticated: boolean
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: TypedAuthError }>
  signup: (credentials: SignupCredentials) => Promise<{ success: boolean; message?: string; error?: TypedAuthError }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: TypedAuthError }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<TypedAuthError | null>(null)

  // Initialize auth state - direct Supabase integration
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)
        const session = await get<{user: User}>('/api/auth/session')

        if (mounted) {
          setUser(session?.user || null)
        }
      } catch (error) {
        logger.error(
          'Auth initialization failed:',
          error instanceof Error ? error : new Error(String(error)),
          { component: 'AuthContext' }
        )
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Direct Supabase auth listener - no Jotai layer
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setError(null)
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            const authSession = await get<{user: User}>('/api/auth/session')
            setUser(authSession?.user || null)
          } catch (backendError) {
            logger.warn('Backend sync failed:', {
              component: 'AuthContext',
              data: backendError
            })
            // Fallback to Supabase session data
            if (session.user && session.user.email) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name,
                avatarUrl: session.user.user_metadata?.avatar_url,
                role: session.user.user_metadata?.role || 'TENANT',
                createdAt: new Date(session.user.created_at || Date.now()),
                updatedAt: new Date(session.user.updated_at || Date.now()),
                supabaseId: session.user.id,
                phone: null,
                bio: null,
                stripeCustomerId: null,
                organizationId: null
              })
            }
          }
        }
      } catch (error) {
        logger.error(
          'Auth state change error:',
          error instanceof Error ? error : new Error(String(error)),
          { component: 'AuthContext' }
        )
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Login action
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const session = await post<{user: User}>('/api/auth/login', credentials)
      setUser(session.user)

      toast.success('Welcome back!')
      return { success: true }
    } catch (error: unknown) {
      const authError: TypedAuthError = {
        name: 'AuthError',
        message: error instanceof Error ? error.message : 'Login failed',
        code: 'INVALID_CREDENTIALS'
      }
      setError(authError)
      toast.error(authError.message)
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [])

  // Signup action
  const signup = useCallback(async (credentials: SignupCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const _result = await post<{message: string}>('/api/auth/signup', credentials)
      toast.success(_result.message)
      return { success: true, message: _result.message }
    } catch (error: unknown) {
      const authError: TypedAuthError = {
        name: 'AuthError',
        message: error instanceof Error ? error.message : 'Signup failed',
        code: 'UNKNOWN_ERROR'
      }
      setError(authError)
      toast.error(authError.message)
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [])

  // Logout action
  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await post<Record<string, never>>('/api/auth/logout', {})
      setUser(null)
      setError(null)
      toast.success('Logged out successfully')
    } catch (error: unknown) {
      logger.error(
        'Logout error:',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'AuthContext' }
      )
      // Clear local state even if logout fails
      setUser(null)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset password action
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true)
      setError(null)

      const _result = await post<{message: string}>('/api/auth/reset-password', { email })
      toast.success(_result.message)
      return { success: true, message: _result.message }
    } catch (error: unknown) {
      const authError: TypedAuthError = {
        name: 'AuthError',
        message: error instanceof Error ? error.message : 'Password reset failed',
        code: 'UNKNOWN_ERROR'
      }
      setError(authError)
      toast.error(authError.message)
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
