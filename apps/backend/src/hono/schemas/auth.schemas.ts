import { z } from 'zod'
import { UserRole } from '@tenantflow/shared'

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
  user: userSchema,
  expiresAt: z.string().datetime()
})