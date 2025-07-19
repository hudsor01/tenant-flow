import { z } from 'zod'

// User role enum
export const userRoleSchema = z.enum([
  'ADMIN',
  'OWNER', 
  'TENANT',
  'MANAGER'
])

// Core user schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  role: userRoleSchema,
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
})

// Update profile schema (only schema needed for mutations)
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
})

// Response schemas
export const profileUpdateResponseSchema = z.object({
  user: userSchema,
  message: z.string(),
})

// Session validation schema (for route guards)
export const sessionSchema = z.object({
  user: userSchema,
  isValid: z.boolean(),
  expiresAt: z.string(), // ISO string
})