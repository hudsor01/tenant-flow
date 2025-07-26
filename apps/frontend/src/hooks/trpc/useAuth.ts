import { trpc, supabase } from '../../lib/api'
import { useEffect, useState } from 'react'

// Auth queries using Supabase session
export function useMe(): ReturnType<typeof trpc.auth.me.useQuery> {
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
  
  return trpc.auth.me.useQuery(undefined, {
    enabled: hasSession, // Only run when session exists
    retry: false, // Don't retry auth failures
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: false,
    refetchIntervalInBackground: false,
    networkMode: 'offlineFirst',
  })
}

export function useValidateSession(): ReturnType<typeof trpc.auth.validateSession.useQuery> {
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
  
  return trpc.auth.validateSession.useQuery(undefined, {
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
  const utils = trpc.useUtils()
  
  // Use Supabase directly for login, then invalidate cache
  return {
    mutateAsync: async (credentials: { email: string; password: string }) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
      
      // Invalidate user data to refetch with new session
      utils.auth.me.invalidate()
      return data
    }
  }
}

export function useRegister() {
  const utils = trpc.useUtils()
  
  // Use Supabase directly for registration, then invalidate cache
  return {
    mutateAsync: async (credentials: { email: string; password: string }) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.signUp(credentials)
      if (error) throw error
      
      // Invalidate user data to refetch with new session
      utils.auth.me.invalidate()
      return data
    }
  }
}

export function useLogout() {
  const utils = trpc.useUtils()
  
  // Use Supabase directly for logout, then clear cache
  return {
    mutateAsync: async () => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear all cached data on logout
      utils.invalidate()
    }
  }
}

export function useUpdateProfile(): ReturnType<typeof trpc.auth.updateProfile.useMutation> {
  const utils = trpc.useUtils()
  
  return trpc.auth.updateProfile.useMutation({
    onSuccess: (data) => {
      // Update cached user data
      utils.auth.me.setData(undefined, data.user)
    },
  })
}

export function useChangePassword() {
  // Use Supabase directly for password changes
  return {
    mutateAsync: async (newPassword: string) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      return data
    }
  }
}

export function useForgotPassword() {
  // Use Supabase directly for password reset
  return {
    mutateAsync: async (email: string) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return data
    }
  }
}

export function useResetPassword() {
  const utils = trpc.useUtils()
  
  // Use Supabase directly for password reset confirmation
  return {
    mutateAsync: async (newPassword: string) => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      
      utils.auth.me.invalidate()
      return data
    }
  }
}

export function useRefreshToken() {
  const utils = trpc.useUtils()
  
  // Use Supabase's automatic token refresh
  return {
    mutateAsync: async () => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      utils.auth.me.invalidate()
      return data
    }
  }
}

// Google OAuth
export function useGoogleOAuth() {
  const utils = trpc.useUtils()
  
  // Use Supabase directly for Google OAuth
  return {
    mutateAsync: async () => {
      if (!supabase) throw new Error('Supabase not initialized')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      })
      if (error) throw error
      
      utils.auth.me.invalidate()
      return data
    }
  }
}

// Email verification
// Note: verifyEmail and resendVerification are not in the current AppRouter interface
// These would need to be added to the backend or implemented differently

// Custom auth hooks with business logic
export function useAuthGuard(): { user: User | undefined; isAuthenticated: boolean; isLoading: boolean; error: TRPCError | null } {
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