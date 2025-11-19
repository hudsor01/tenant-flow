import { z } from 'zod'
import {
  emailSchema,
  requiredString,
  uuidSchema,
  nonEmptyStringSchema,
  urlSchema
} from './common.js'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// User status enum validation
export const userStatusSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'suspended'
])

// User type enum validation
export const userTypeSchema = z.enum([
  'property_owner',
  'tenants',
  'admin',
  'staff'
])

// Base user input schema (matches database exactly)
export const userInputSchema = z.object({
  email: emailSchema,

  full_name: nonEmptyStringSchema
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),

  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .optional(),

  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .optional(),

  phone: z.string()
    .regex(/^[\d+()-\s]+$/, 'Phone number can only contain digits, +, (), -, and spaces')
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional(),

  avatar_url: urlSchema.optional(),

  user_type: userTypeSchema,

  status: userStatusSchema.default('pending'),

  stripe_customer_id: z.string().optional(),

  connected_account_id: z.string().optional(),

  identity_verification_status: z.enum([
    'not_started',
    'pending',
    'verified',
    'failed',
    'expired'
  ]).optional(),

  identity_verification_session_id: z.string().uuid().optional(),

  identity_verification_data: z.record(z.string(), z.unknown()).optional(),

  identity_verification_error: z.string().optional(),

  onboarding_status: z.enum([
    'not_started',
    'in_progress',
    'completed',
    'abandoned'
  ]).optional(),

  onboarding_completed_at: z.string().optional()
})

// Full user schema (includes server-generated fields)
export const userSchema = userInputSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string(),
  identity_verified_at: z.string().optional()
})

// User update schema (partial input)
export const userUpdateSchema = userInputSchema.partial().extend({
  id: uuidSchema.optional(),
  email: emailSchema.optional()
})

// User query schema (for search/filtering)
export const userQuerySchema = z.object({
  search: z.string().optional(),
  email: emailSchema.optional(),
  user_type: userTypeSchema.optional(),
  status: userStatusSchema.optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  sort_by: z.enum([
    'created_at',
    'full_name',
    'email',
    'status'
  ]).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(20)
})

// User registration schema (for new user creation)
export const userRegistrationSchema = z.object({
  email: emailSchema,
  full_name: nonEmptyStringSchema
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .optional(),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .optional(),
  phone: z.string()
    .regex(/^[\d+()-\s]+$/, 'Phone number can only contain digits, +, (), -, and spaces')
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional(),
  avatar_url: urlSchema.optional(),
  user_type: userTypeSchema,
  password: z.string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// User profile update schema
export const userProfileUpdateSchema = z.object({
  full_name: nonEmptyStringSchema
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .optional(),
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .optional(),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .optional(),
  phone: z.string()
    .regex(/^[\d+()-\s]+$/, 'Phone number can only contain digits, +, (), -, and spaces')
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional(),
  avatar_url: urlSchema.optional()
})

// User preferences schema
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().length(2).optional(),
  timezone: z.string().optional(),
  notifications_enabled: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional()
})

// User preferences update schema
export const userPreferencesUpdateSchema = userPreferencesSchema.partial()

// Export types
export type UserInput = z.infer<typeof userInputSchema>
export type User = z.infer<typeof userSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>
export type UserQuery = z.infer<typeof userQuerySchema>
export type UserRegistration = z.infer<typeof userRegistrationSchema>
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>
export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UserPreferencesUpdate = z.infer<typeof userPreferencesUpdateSchema>

// Frontend-specific form schemas
export const userFormSchema = z.object({
  email: requiredString,
  full_name: requiredString,
 first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
  user_type: userTypeSchema.optional(),
  status: userStatusSchema.optional()
})

export const userRegistrationFormSchema = userRegistrationSchema.extend({
  email: z.string().email('Please enter a valid email address'),
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().optional()
})

// Transform functions for form data
export const transformUserFormData = (data: UserFormData) => ({
 email: data.email,
  full_name: data.full_name,
  first_name: data.first_name || undefined,
  last_name: data.last_name || undefined,
  phone: data.phone || undefined,
  avatar_url: data.avatar_url || undefined,
  user_type: data.user_type,
  status: data.status
})

export type UserFormData = z.infer<typeof userFormSchema>
export type UserRegistrationFormData = z.infer<typeof userRegistrationFormSchema>
export type TransformedUserData = ReturnType<typeof transformUserFormData>
