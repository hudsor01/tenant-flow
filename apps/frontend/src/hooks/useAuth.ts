import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/axios-client'
import { supabase } from '@/lib/clients'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import { useRouter } from '@tanstack/react-router'
import { handleApiError } from '@/lib/utils'
import type { User } from '@tenantflow/shared/types/auth'

// Backend returns a subset of User fields, map to full User type
type BackendUser = {
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
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    
    checkSession()
    
    // Listen for auth changes and invalidate queries immediately
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event, session) => {
      console.log('[useMe] Auth state changed:', event, session?.user?.email)
      setHasSession(!!session)
      
      // Force refetch on auth state changes
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      }
    }) || { data: { subscription: null } }
    
    return () => {
      subscription?.unsubscribe()
    }
  }, [queryClient])
  
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.v1.auth.$get()
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch user')
      }
      return response.json()
    },
    enabled: hasSession, // Only run when session exists
    retry: 1, // Retry once for transient failures
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30 * 1000, // 30 seconds - shorter for better responsiveness
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: false,
    refetchIntervalInBackground: false,
    networkMode: 'online', // Always try to fetch when online
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
    
    checkSession()
    
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
      router.navigate({ to: '/dashboard' })
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
      router.navigate({ to: '/dashboard' })
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
      router.navigate({ to: '/auth/login' })
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
      router.navigate({ to: '/dashboard' })
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
  const { data: user, isLoading, error } = useMe()
  const login = useLogin()
  const register = useRegister()
  const logout = useLogout()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const forgotPassword = useForgotPassword()
  const resetPassword = useResetPassword()
  
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