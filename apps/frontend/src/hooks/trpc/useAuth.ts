import { trpc } from '@/lib/trpcClient'
import type {
  LoginSchema,
  RegisterSchema,
  UpdateProfileSchema,
  ChangePasswordSchema
} from '@/types/auth'

// Auth queries
export function useMe() {
  return trpc.auth.me.useQuery(undefined, {
    retry: false, // Don't retry auth failures
    refetchOnWindowFocus: false,
  })
}

export function useValidateSession() {
  return trpc.auth.validateSession.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

// Auth mutations
export function useLogin() {
  const utils = trpc.useUtils()
  
  return trpc.auth.login.useMutation({
    onSuccess: () => {
      // Invalidate user data to refetch with new session
      utils.auth.me.invalidate()
      utils.auth.validateSession.invalidate()
    },
  })
}

export function useRegister() {
  const utils = trpc.useUtils()
  
  return trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate()
    },
  })
}

export function useLogout() {
  const utils = trpc.useUtils()
  
  return trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Clear all cached data on logout
      utils.invalidate()
    },
  })
}

export function useUpdateProfile() {
  const utils = trpc.useUtils()
  
  return trpc.auth.updateProfile.useMutation({
    onSuccess: (data) => {
      // Update cached user data
      utils.auth.me.setData(undefined, data.user)
    },
  })
}

export function useChangePassword() {
  return trpc.auth.changePassword.useMutation()
}

export function useForgotPassword() {
  return trpc.auth.forgotPassword.useMutation()
}

export function useResetPassword() {
  return trpc.auth.resetPassword.useMutation()
}

export function useRefreshToken() {
  const utils = trpc.useUtils()
  
  return trpc.auth.refreshToken.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate()
      utils.auth.validateSession.invalidate()
    },
  })
}

// Google OAuth
export function useGoogleOAuth() {
  const utils = trpc.useUtils()
  
  return trpc.auth.googleOAuth.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate()
    },
  })
}

// Email verification
export function useVerifyEmail() {
  return trpc.auth.verifyEmail.useMutation()
}

export function useResendVerification() {
  return trpc.auth.resendVerification.useMutation()
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