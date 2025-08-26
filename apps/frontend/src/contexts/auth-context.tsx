'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase/client'
import { AuthApi } from '../lib/auth-api'
import { logger } from '@/lib/logger'
import type { User, AuthError, LoginCredentials, SignupCredentials } from '../types/auth'

interface AuthContextType {
  // State
  user: User | null
  loading: boolean
  error: AuthError | null
  isAuthenticated: boolean
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: AuthError }>
  signup: (credentials: SignupCredentials) => Promise<{ success: boolean; message?: string; error?: AuthError }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: AuthError }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Initialize auth state - direct Supabase integration
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setLoading(true)
        const session = await AuthApi.getCurrentSession()

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
            const authSession = await AuthApi.getCurrentSession()
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
                emailVerified: !!session.user.email_confirmed_at,
                createdAt: session.user.created_at || new Date().toISOString(),
                updatedAt: session.user.updated_at || new Date().toISOString(),
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

      const session = await AuthApi.login(credentials)
      setUser(session.user)

      toast.success('Welcome back!')
      return { success: true }
    } catch (error: unknown) {
      const authError: AuthError = {
        type: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : 'Login failed',
        code: error instanceof Error && 'code' in error 
          ? (error as { code: string }).code 
          : 'AUTH_ERROR'
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

      const result = await AuthApi.signup(credentials)
      toast.success(result.message)
      return { success: true, message: result.message }
    } catch (error: unknown) {
      const authError: AuthError = {
        type: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : 'Signup failed',
        code: error instanceof Error && 'code' in error 
          ? (error as { code: string }).code 
          : 'AUTH_ERROR'
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
      await AuthApi.logout()
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

      const result = await AuthApi.resetPassword(email)
      toast.success(result.message)
      return { success: true, message: result.message }
    } catch (error: unknown) {
      const authError: AuthError = {
        type: 'AUTH_ERROR',
        message: error instanceof Error ? error.message : 'Password reset failed',
        code: error instanceof Error && 'code' in error 
          ? (error as { code: string }).code 
          : 'AUTH_ERROR'
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