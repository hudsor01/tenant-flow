import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useTransition } from 'react'
import { api } from '@/lib/api/axios-client'
import { supabase } from '@/lib/clients'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import { useRouter } from '@tanstack/react-router'
import { handleApiError } from '@/lib/utils'
import { handlePromise } from '@/utils/async-handlers'
import type { User } from '@tenantflow/shared'

// Backend returns a subset of User fields, map to full User type
interface BackendUser {
  id: string
  email: string
  name?: string
  role: 'ADMIN' | 'OWNER' | 'TENANT' | 'MANAGER'
  phone?: string
  avatarUrl?: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}


// Simple inline user data transform since we removed the data-transforms utility
const transformUserData = (user: BackendUser | null): User | null => {
  if (!user) return null
  return {
    ...user,
    // Add missing fields with defaults
    supabaseId: '', // Will be populated by auth context
    stripeCustomerId: null,
    bio: null,
    name: user.name || null,
    phone: user.phone || null,
    avatarUrl: user.avatarUrl || null,
    // Parse dates
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt)
  }
}


// Auth queries using Supabase session
export function useMe() {
  const [hasSession, setHasSession] = useState(false)
  const [sessionCheckTimeout, setSessionCheckTimeout] = useState(false)
  const [, startTransition] = useTransition()
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setSessionCheckTimeout(true)
        return
      }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setHasSession(!!session)
        setSessionCheckTimeout(true) // Mark as done regardless of session
      } catch (error) {
        console.warn('[useMe] Session check failed:', error)
        setHasSession(false)
        setSessionCheckTimeout(true) // Mark as done even on error
      }
    }
    
    handlePromise(checkSession(), 'Failed to check session')
    
    // Add timeout to prevent infinite loading - but make it shorter for public routes
    const timeout = setTimeout(() => {
      console.warn('[useMe] Session check timeout, assuming no session')
      setSessionCheckTimeout(true)
    }, 1000) // Reduced to 1 second timeout
    
    // Listen for auth changes and invalidate queries immediately
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event, session) => {
      setHasSession(!!session)
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        startTransition(() => {
          void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
        })
      }
    }) || { data: { subscription: null } }
    
    return () => {
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [queryClient])
  
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      // Check if we're on a public route - if so, don't make API calls
      const isPublicRoute = typeof window !== 'undefined' && (
        window.location.pathname === '/' ||
        window.location.pathname.startsWith('/pricing') ||
        window.location.pathname.startsWith('/contact') ||
        window.location.pathname.startsWith('/auth/') ||
        window.location.pathname.startsWith('/about') ||
        window.location.pathname.startsWith('/terms') ||
        window.location.pathname.startsWith('/privacy') ||
        window.location.pathname.startsWith('/blog') ||
        window.location.pathname.startsWith('/tools')
      )
      
      // For public routes, return null immediately if no session
      if (isPublicRoute && !hasSession) {
        if (import.meta.env.DEV) {
          console.warn('[useMe] Public route with no session, returning null immediately')
        }
        return null
      }
      
      // If timeout reached and no session, return null immediately
      if (sessionCheckTimeout && !hasSession) {
        if (import.meta.env.DEV) {
          console.warn('[useMe] No session after timeout, returning null')
        }
        return null
      }
      
      try {
        const response = await api.auth.me()
        return response.data
      } catch (error) {
        console.warn('[useAuth] Auth API call failed:', error)
        // Return null for network errors to prevent infinite loading
        return null
      }
    },
    enabled: (hasSession || sessionCheckTimeout) && !(typeof window !== 'undefined' && window.location.pathname === '/' && !hasSession), // Don't run for homepage with no session
    retry: (failureCount, error) => {
      // Don't retry on authentication errors (4xx)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          return false
        }
      }
      return failureCount < 2 // Only retry twice for network errors
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30 * 1000, // 30 seconds - shorter for better responsiveness
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: false,
    refetchIntervalInBackground: false,
    networkMode: 'online', // Always try to fetch when online
    placeholderData: null, // Always use null as placeholder to prevent loading state
  })
}

export function useValidateSession() {
  const [hasSession, setHasSession] = useState(false)
  
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    
    handlePromise(checkSession(), 'Failed to check session')
    
    // Listen for auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    }) || { data: { subscription: null } }
    
    return () => {
      subscription?.unsubscribe()
    }
  }, [])
  
  return useQuery({
    queryKey: ['auth', 'validateSession'],
    queryFn: async () => {
      const response = await api.auth.me()
      return response.data
    },
    enabled: hasSession, // Only run when session exists
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent excessive validation
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })
}

// Auth mutations - using Supabase directly since backend handles profile only
export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
      
      // Invalidate user data to refetch with new session
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      return data
    },
    onSuccess: () => {
      toast.success(toastMessages.success.signedIn)
      void router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.signUp(credentials)
      if (error) throw error
      
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      return data
    },
    onSuccess: () => {
      toast.success('Account created successfully! Check your email to verify your account.')
      void router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  return useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      queryClient.clear()
    },
    onSuccess: () => {
      toast.success(toastMessages.success.signedOut)
      void router.navigate({ to: '/auth/login' })
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: { name?: string; email?: string }) => {
      const response = await api.users.updateProfile(input)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data)
      toast.success(toastMessages.success.updated('profile'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success(toastMessages.success.passwordChanged)
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success(toastMessages.info.emailSent)
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useResetPassword() {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  return useMutation({
    mutationFn: async (newPassword: string) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      return data
    },
    onSuccess: () => {
      toast.success(toastMessages.success.passwordChanged)
      void router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useRefreshToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      return data
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Google OAuth
export function useGoogleOAuth() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      })
      if (error) throw error
      
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      return data
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Custom auth hooks with business logic
export function useAuthGuard() {
  const { data: user, isLoading, error } = useMe()
  
  return {
    user,
    isAuthenticated: !!user && !error,
    isLoading,
    error,
  }
}

export function useRequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuthGuard()
  
  if (!isLoading && !isAuthenticated) {
    // Could redirect to login here
    throw new Error('Authentication required')
  }
  
  return { user, isAuthenticated }
}

// Main composite auth hook that most components should use
export function useAuth() {
  const { data: user, isLoading: queryLoading, error } = useMe()
  const login = useLogin()
  const register = useRegister()
  const logout = useLogout()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const forgotPassword = useForgotPassword()
  const resetPassword = useResetPassword()
  
  // For public routes, don't block on loading
  const isPublicRoute = typeof window !== 'undefined' && (
    window.location.pathname === '/' ||
    window.location.pathname.startsWith('/pricing') ||
    window.location.pathname.startsWith('/contact') ||
    window.location.pathname.startsWith('/auth/') ||
    window.location.pathname.startsWith('/about') ||
    window.location.pathname.startsWith('/terms') ||
    window.location.pathname.startsWith('/privacy') ||
    window.location.pathname.startsWith('/blog') ||
    window.location.pathname.startsWith('/tools')
  )
  
  // CRITICAL FIX: Always return false for isLoading on public routes
  // This prevents the app from getting stuck in loading state
  const isLoading = isPublicRoute ? false : queryLoading
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.warn('[useAuth] Auth state:', {
      pathname: window.location.pathname,
      isPublicRoute,
      queryLoading,
      isLoading,
      hasUser: !!user,
      error: error?.message
    })
  }
  
  return {
    user: transformUserData(user),
    isLoading,
    error,
    isAuthenticated: !!user && !error,
    
    // Auth actions - return mutation objects for full control
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    
    // Loading states for UI
    isLoggingIn: login.isPending,
    isRegistering: register.isPending,
    isLoggingOut: logout.isPending,
    isUpdatingProfile: updateProfile.isPending,
    isChangingPassword: changePassword.isPending,
    isSendingResetEmail: forgotPassword.isPending,
    isResettingPassword: resetPassword.isPending,
    
    // Any loading state
    anyLoading: isLoading || login.isPending || register.isPending || logout.isPending || updateProfile.isPending || changePassword.isPending || forgotPassword.isPending || resetPassword.isPending
  }
}