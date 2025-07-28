import { z } from 'zod'
import { USER_ROLE } from '@tenantflow/shared/constants/auth'



// Create UserRole enum from constants
const UserRole = USER_ROLE

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Profile update schema
export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional()
})

// Profile update response schema
export const profileUpdateResponseSchema = z.object({
  success: z.boolean(),
  user: userSchema
})

// Session schema
export const sessionSchema = z.object({
  isValid: z.boolean(),
  user: userSchema,
  expiresAt: z.string().datetime()
})

// Auth input schemas to match shared types
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
})

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1)
})

export const forgotPasswordInputSchema = z.object({
  email: z.string().email()
})

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
})

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
})

export const authCallbackInputSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  type: z.string().optional()
})