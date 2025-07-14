import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { AuthService } from '../../auth/auth.service'
import { TRPCError } from '@trpc/server'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  refreshTokenSchema,
  googleOAuthSchema,
  emailVerificationSchema,
  resendVerificationSchema,
  authResponseSchema,
  profileUpdateResponseSchema,
  passwordChangeResponseSchema,
  logoutResponseSchema,
  emailVerificationResponseSchema,
  sessionSchema,
  userSchema,
} from '../schemas/auth.schemas'

export const createAuthRouter = (authService: AuthService) => {
  return router({
    // Public authentication endpoints
    login: publicProcedure
      .input(loginSchema)
      .output(authResponseSchema)
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement Supabase login
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Login endpoint not yet implemented',
          })
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Login failed',
            cause: error,
          })
        }
      }),

    register: publicProcedure
      .input(registerSchema)
      .output(authResponseSchema)
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement Supabase registration
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Registration endpoint not yet implemented',
          })
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Registration failed',
            cause: error,
          })
        }
      }),

    forgotPassword: publicProcedure
      .input(forgotPasswordSchema)
      .output(z.object({ success: z.boolean(), message: z.string() }))
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement password reset email
          return {
            success: true,
            message: 'Password reset email sent if account exists',
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to process password reset request',
            cause: error,
          })
        }
      }),

    resetPassword: publicProcedure
      .input(resetPasswordSchema)
      .output(passwordChangeResponseSchema)
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement password reset with token
          return {
            success: true,
            message: 'Password successfully reset',
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to reset password',
            cause: error,
          })
        }
      }),

    refreshToken: publicProcedure
      .input(refreshTokenSchema)
      .output(authResponseSchema)
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement token refresh
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Token refresh not yet implemented',
          })
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Token refresh failed',
            cause: error,
          })
        }
      }),

    googleOAuth: publicProcedure
      .input(googleOAuthSchema)
      .output(authResponseSchema)
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement Google OAuth callback
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Google OAuth not yet implemented',
          })
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Google OAuth failed',
            cause: error,
          })
        }
      }),

    verifyEmail: publicProcedure
      .input(emailVerificationSchema)
      .output(emailVerificationResponseSchema)
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement email verification
          return {
            success: true,
            message: 'Email successfully verified',
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Email verification failed',
            cause: error,
          })
        }
      }),

    resendVerification: publicProcedure
      .input(resendVerificationSchema)
      .output(z.object({ success: z.boolean(), message: z.string() }))
      .mutation(async ({ input }) => {
        try {
          // TODO: Implement resend verification email
          return {
            success: true,
            message: 'Verification email sent if account exists',
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to resend verification email',
            cause: error,
          })
        }
      }),

    // Protected endpoints (require authentication)
    me: protectedProcedure
      .output(userSchema)
      .query(async ({ ctx }) => {
        try {
          // Return current user from context
          return {
            id: ctx.user.id,
            email: ctx.user.email,
            name: ctx.user.name,
            role: ctx.user.role,
            phone: ctx.user.phone,
            avatarUrl: ctx.user.avatarUrl,
            emailVerified: true, // Assume verified if they have a token
            createdAt: ctx.user.createdAt,
            updatedAt: ctx.user.updatedAt,
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch user profile',
            cause: error,
          })
        }
      }),

    updateProfile: protectedProcedure
      .input(updateProfileSchema)
      .output(profileUpdateResponseSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // TODO: Implement profile update with Prisma
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Profile update not yet implemented',
          })
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update profile',
            cause: error,
          })
        }
      }),

    changePassword: protectedProcedure
      .input(changePasswordSchema)
      .output(passwordChangeResponseSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          // TODO: Implement password change
          return {
            success: true,
            message: 'Password successfully changed',
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to change password',
            cause: error,
          })
        }
      }),

    logout: protectedProcedure
      .output(logoutResponseSchema)
      .mutation(async ({ ctx }) => {
        try {
          // TODO: Implement logout (invalidate tokens)
          return {
            success: true,
            message: 'Successfully logged out',
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Logout failed',
            cause: error,
          })
        }
      }),

    validateSession: protectedProcedure
      .output(sessionSchema)
      .query(async ({ ctx }) => {
        try {
          return {
            user: {
              id: ctx.user.id,
              email: ctx.user.email,
              name: ctx.user.name,
              role: ctx.user.role,
              phone: ctx.user.phone,
              avatarUrl: ctx.user.avatarUrl,
              emailVerified: true,
              createdAt: ctx.user.createdAt,
              updatedAt: ctx.user.updatedAt,
            },
            isValid: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          }
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Session validation failed',
            cause: error,
          })
        }
      }),
  })
}

// Export factory function for DI
export const authRouter = createAuthRouter