import { z } from 'zod'

/**
 * Frontend Zod Validation Schemas
 * Mirrors backend validation for consistent client-side validation
 */

// ========================================
// Base/Common Schemas (Frontend)
// ========================================

export const emailSchema = z.string().email('Please enter a valid email address')
export const phoneSchema = z.string()
  .regex(/^\+?[\d\s()-]{10,}$/, 'Please enter a valid phone number')
  .optional()
export const urlSchema = z.string().url('Please enter a valid URL').optional().or(z.literal(''))
export const zipCodeSchema = z.string()
  .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid zip code (12345 or 12345-6789)')

// Currency with frontend formatting
export const currencySchema = z.number()
  .min(0, 'Amount cannot be negative')
  .multipleOf(0.01, 'Amount must be in cents')
  .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid currency format').transform(val => parseFloat(val)))

// Date schemas with better frontend UX
export const dateSchema = z.string()
  .refine(val => !isNaN(Date.parse(val)), 'Please enter a valid date')
  .transform(val => new Date(val))

export const futureDateSchema = z.string()
  .refine(val => !isNaN(Date.parse(val)), 'Please enter a valid date')
  .transform(val => new Date(val))
  .refine(date => date > new Date(), 'Date must be in the future')

// ========================================
// Authentication Schemas
// ========================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms of service')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

// ========================================
// Property Schemas
// ========================================

export const propertyTypeSchema = z.enum(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL'])

// Form input schema - handles HTML form inputs (strings)
export const createPropertyFormSchema = z.object({
  name: z.string()
    .min(1, 'Property name is required')
    .max(200, 'Property name is too long'),
  description: z.string()
    .max(2000, 'Description is too long')
    .optional()
    .or(z.literal('')),
  propertyType: propertyTypeSchema.default('SINGLE_FAMILY'),
  address: z.string()
    .min(1, 'Address is required')
    .max(500, 'Address is too long'),
  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City name is too long'),
  state: z.string()
    .min(2, 'State is required')
    .max(50, 'State name is too long'),
  zipCode: zipCodeSchema,
  imageUrl: urlSchema,
  yearBuilt: z.string().optional().or(z.literal('')),
  totalSize: z.string().optional().or(z.literal('')),
  units: z.union([
    z.string().transform(val => {
      if (val === '' || val === undefined) return undefined
      const parsed = parseInt(val, 10)
      if (isNaN(parsed)) throw new Error('Units must be a number')
      if (parsed < 0) throw new Error('Units cannot be negative')
      if (parsed > 1000) throw new Error('Cannot create more than 1000 units')
      return parsed
    }),
    z.number()
      .int('Units must be a whole number')
      .min(0, 'Units cannot be negative')
      .max(1000, 'Cannot create more than 1000 units')
  ]).optional()
})

// API schema - the shape expected by the backend
export const createPropertySchema = z.object({
  name: z.string()
    .min(1, 'Property name is required')
    .max(200, 'Property name is too long'),
  description: z.string()
    .max(2000, 'Description is too long')
    .optional(),
  propertyType: propertyTypeSchema,
  address: z.string()
    .min(1, 'Address is required')
    .max(500, 'Address is too long'),
  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City name is too long'),
  state: z.string()
    .min(2, 'State is required')
    .max(50, 'State name is too long'),
  zipCode: zipCodeSchema,
  imageUrl: urlSchema,
  yearBuilt: z.number().optional(),
  totalSize: z.number().optional(),
  units: z.number()
    .int('Units must be a whole number')
    .min(0, 'Units cannot be negative')
    .max(1000, 'Cannot create more than 1000 units')
    .optional()
})

export const updatePropertySchema = createPropertySchema.partial()

// Export types for use in components
export type PropertyFormInputData = z.input<typeof createPropertyFormSchema>
export type PropertyAPIData = z.output<typeof createPropertyFormSchema>

export const propertySearchSchema = z.object({
  search: z.string().max(200, 'Search term is too long').optional(),
  propertyType: propertyTypeSchema.optional(),
  city: z.string().max(100, 'City name is too long').optional(),
  state: z.string().max(50, 'State name is too long').optional()
})

// ========================================
// Unit Schemas
// ========================================

export const unitStatusSchema = z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'])

// Form input schema - handles HTML form inputs (strings)
export const createUnitFormSchema = z.object({
  unitNumber: z.string()
    .min(1, 'Unit number is required')
    .max(50, 'Unit number is too long'),
  bedrooms: z.union([
    z.string().regex(/^\d+$/, 'Bedrooms must be a number'),
    z.number()
  ]).default('1'),
  bathrooms: z.union([
    z.string().regex(/^\d*\.?\d+$/, 'Bathrooms must be a number'),
    z.number()
  ]).default('1'),
  squareFeet: z.union([
    z.string().regex(/^\d*$/, 'Square feet must be a number').or(z.literal('')),
    z.number()
  ]).optional(),
  rent: z.union([
    z.string().regex(/^\d*\.?\d{0,2}$/, 'Invalid rent amount'),
    z.number()
  ]),
  status: unitStatusSchema.default('VACANT'),
  description: z.string()
    .max(1000, 'Description is too long')
    .optional()
    .or(z.literal(''))
})

// API schema - the shape expected by the backend
export const createUnitSchema = z.object({
  unitNumber: z.string()
    .min(1, 'Unit number is required')
    .max(50, 'Unit number is too long'),
  bedrooms: z.number()
    .int('Bedrooms must be a whole number')
    .min(0, 'Bedrooms cannot be negative')
    .max(20, 'Too many bedrooms'),
  bathrooms: z.number()
    .min(0, 'Bathrooms cannot be negative')
    .max(20, 'Too many bathrooms'),
  squareFeet: z.number()
    .int('Square feet must be a whole number')
    .min(1, 'Square feet must be positive')
    .max(50000, 'Square feet is too large')
    .optional(),
  rent: z.number()
    .min(0, 'Rent cannot be negative')
    .multipleOf(0.01, 'Rent must be in cents'),
  status: unitStatusSchema,
  description: z.string()
    .max(1000, 'Description is too long')
    .optional()
})

export const updateUnitSchema = createUnitSchema.partial()

// Export types
export type CreateUnitFormData = z.input<typeof createUnitFormSchema>
export type CreateUnitData = z.infer<typeof createUnitSchema>

// ========================================
// Tenant Schemas
// ========================================

// Form input schema - handles HTML form inputs
export const createTenantFormSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  email: emailSchema,
  phone: phoneSchema.or(z.literal('')),
  emergencyContactName: z.string()
    .max(100, 'Emergency contact name is too long')
    .optional()
    .or(z.literal('')),
  emergencyContactPhone: phoneSchema.or(z.literal('')).optional(),
  notes: z.string()
    .max(2000, 'Notes are too long')
    .optional()
    .or(z.literal(''))
})

// API schema - the shape expected by the backend
export const createTenantSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  emergencyContactName: z.string()
    .max(100, 'Emergency contact name is too long')
    .optional(),
  emergencyContactPhone: phoneSchema.optional(),
  notes: z.string()
    .max(2000, 'Notes are too long')
    .optional()
})

export const updateTenantSchema = createTenantSchema.partial()

// Export types
export type CreateTenantFormData = z.input<typeof createTenantFormSchema>
export type CreateTenantData = z.infer<typeof createTenantSchema>

// ========================================
// Maintenance Request Schemas
// ========================================

export const maintenancePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const maintenanceStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])

export const createMaintenanceRequestSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title is too long'),
  description: z.string()
    .min(1, 'Description is required')
    .max(2000, 'Description is too long'),
  category: z.string()
    .max(100, 'Category name is too long')
    .optional(),
  priority: maintenancePrioritySchema.default('MEDIUM'),
  preferredDate: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  allowEntry: z.boolean().default(true),
  contactPhone: phoneSchema,
  requestedBy: z.string()
    .max(100, 'Requested by field is too long')
    .optional(),
  photos: z.array(z.string().url('Invalid photo URL')).default([])
})

export const updateMaintenanceRequestSchema = createMaintenanceRequestSchema.partial().extend({
  status: maintenanceStatusSchema.optional(),
  estimatedCost: currencySchema.optional(),
  actualCost: currencySchema.optional(),
  completedAt: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Invalid date format'),
  notes: z.string()
    .max(2000, 'Notes are too long')
    .optional()
})

// ========================================
// Lease Schemas
// ========================================

export const leaseStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED'])

// Form input schema - handles HTML form inputs
export const createLeaseFormSchema = z.object({
  startDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Please enter a valid start date'),
  endDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Please enter a valid end date'),
  monthlyRent: z.union([
    z.string().regex(/^\d*\.?\d{0,2}$/, 'Invalid rent amount'),
    z.number()
  ]),
  securityDeposit: z.union([
    z.string().regex(/^\d*\.?\d{0,2}$/, 'Invalid deposit amount').or(z.literal('')),
    z.number()
  ]).optional(),
  petDeposit: z.union([
    z.string().regex(/^\d*\.?\d{0,2}$/, 'Invalid deposit amount').or(z.literal('')),
    z.number()
  ]).optional(),
  status: leaseStatusSchema.default('DRAFT'),
  terms: z.string()
    .max(5000, 'Terms are too long')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(2000, 'Notes are too long')
    .optional()
    .or(z.literal(''))
}).refine(data => {
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  return endDate > startDate
}, {
  message: 'End date must be after start date',
  path: ['endDate']
})

// API schema - the shape expected by the backend
export const createLeaseSchema = z.object({
  startDate: z.date().or(z.string().transform(val => new Date(val))),
  endDate: z.date().or(z.string().transform(val => new Date(val))),
  monthlyRent: z.number()
    .min(0, 'Rent cannot be negative')
    .multipleOf(0.01, 'Rent must be in cents'),
  securityDeposit: z.number()
    .min(0, 'Deposit cannot be negative')
    .multipleOf(0.01, 'Deposit must be in cents')
    .default(0),
  petDeposit: z.number()
    .min(0, 'Deposit cannot be negative')
    .multipleOf(0.01, 'Deposit must be in cents')
    .default(0),
  status: leaseStatusSchema.default('DRAFT'),
  terms: z.string()
    .max(5000, 'Terms are too long')
    .optional(),
  notes: z.string()
    .max(2000, 'Notes are too long')
    .optional()
}).refine(data => {
  const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate)
  const endDate = data.endDate instanceof Date ? data.endDate : new Date(data.endDate)
  return endDate > startDate
}, {
  message: 'End date must be after start date',
  path: ['endDate']
})

export const updateLeaseSchema = createLeaseSchema.partial()

// Export types
export type CreateLeaseFormData = z.input<typeof createLeaseFormSchema>
export type CreateLeaseData = z.infer<typeof createLeaseSchema>

// ========================================
// Contact/Support Schemas
// ========================================

export const contactFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long'),
  email: emailSchema,
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long'),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message is too long'),
  company: z.string()
    .max(100, 'Company name is too long')
    .optional()
})

// ========================================
// Search & Filter Schemas
// ========================================

export const searchFiltersSchema = z.object({
  query: z.string()
    .max(200, 'Search query is too long')
    .optional(),
  dateFrom: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Invalid from date'),
  dateTo: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), 'Invalid to date'),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional()
}).refine(data => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo)
  }
  return true
}, {
  message: 'From date must be before to date',
  path: ['dateTo']
})

// ========================================
// Type Inference Exports
// ========================================

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export type CreatePropertyFormData = z.infer<typeof createPropertySchema>
export type UpdatePropertyFormData = z.infer<typeof updatePropertySchema>
export type PropertySearchFormData = z.infer<typeof propertySearchSchema>

export type UpdateLeaseFormData = z.infer<typeof updateLeaseSchema>

export type ContactFormData = z.infer<typeof contactFormSchema>
export type SearchFiltersFormData = z.infer<typeof searchFiltersSchema>

// ========================================
// Validation Helper Functions
// ========================================

export const validateEmail = (email: string) => emailSchema.safeParse(email)
export const validatePassword = (password: string) => 
  signupSchema.shape.password.safeParse(password)
export const validatePhone = (phone: string) => phoneSchema.safeParse(phone)
export const validateZipCode = (zipCode: string) => zipCodeSchema.safeParse(zipCode)
export const validateUrl = (url: string) => urlSchema.safeParse(url)

// Frontend-specific validation utilities
export const getFieldError = (errors: Record<string, string>, field: string): string | undefined => {
  return errors[field]
}

export const hasFieldError = (errors: Record<string, string>, field: string): boolean => {
  return !!errors[field]
}

export const formatValidationErrors = (errors: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {}
  
  errors.issues.forEach((error) => {
    const field = error.path.join('.')
    formattedErrors[field] = error.message
  })
  
  return formattedErrors
}