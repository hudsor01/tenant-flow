import { z } from 'zod'

// User role enum
export const userRoleSchema = z.enum([
  'ADMIN',
  'OWNER', 
  'TENANT',
  'MANAGER'
])

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Register schema
export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(255),
  role: userRoleSchema.default('OWNER'),
})

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
})

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
})

// Update profile schema
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
})

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// Google OAuth schema
export const googleOAuthSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  redirectUri: z.string().url('Valid redirect URI is required'),
})

// Response schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: userRoleSchema,
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.string().default('Bearer'),
})

export const authResponseSchema = z.object({
  user: userSchema,
  tokens: authTokensSchema,
})

export const profileUpdateResponseSchema = z.object({
  user: userSchema,
  message: z.string(),
})

export const passwordChangeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export const logoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export const emailVerificationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: userSchema.optional(),
})

export const resendVerificationSchema = z.object({
  email: z.string().email('Valid email is required'),
})

// Session validation schema
export const sessionSchema = z.object({
  user: userSchema,
  isValid: z.boolean(),
  expiresAt: z.date(),
})