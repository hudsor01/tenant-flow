import { z } from 'zod'
import {
  uuidSchema,
  requiredString,
  nonEmptyStringSchema,
  positiveNumberSchema,
 nonNegativeNumberSchema
} from './common.js'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// Property status enum validation
export const propertyStatusSchema = z.enum([
  'active',
  'inactive',
  'maintenance',
  'sold',
  'leased',
  'under_construction'
])

// Property type enum validation
export const propertyTypeSchema = z.enum([
  'single_family',
  'multi_family',
  'condo',
  'townhouse',
  'apartment',
  'commercial',
  'industrial',
  'mixed_use',
  'other'
])

// Base property input schema (matches database exactly)
export const propertyInputSchema = z.object({
  name: nonEmptyStringSchema
    .min(2, 'Property name must be at least 2 characters')
    .max(VALIDATION_LIMITS.PROPERTY_NAME_MAX_LENGTH, `Property name cannot exceed ${VALIDATION_LIMITS.PROPERTY_NAME_MAX_LENGTH} characters`),

  address_line1: nonEmptyStringSchema
    .min(5, 'Address line 1 must be at least 5 characters')
    .max(200, 'Address line 1 cannot exceed 200 characters'),

  address_line2: z.string()
    .max(200, 'Address line 2 cannot exceed 200 characters')
    .optional(),

  city: nonEmptyStringSchema
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters'),

  state: z.string()
    .min(2, 'State is required')
    .max(2, 'State must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),

  postal_code: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (12345 or 12345-6789)'),

  country: z.string()
    .max(50, 'Country cannot exceed 50 characters')
    .default('US'),

  property_type: propertyTypeSchema,

  status: propertyStatusSchema.default('active'),

  property_owner_id: uuidSchema,

  bedrooms: positiveNumberSchema
    .int('Bedrooms must be a whole number')
    .max(VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BEDROOMS, `Maximum ${VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BEDROOMS} bedrooms allowed`)
    .optional(),

  bathrooms: positiveNumberSchema
    .max(VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BATHROOMS, `Maximum ${VALIDATION_LIMITS.PROPERTY_UNIT_MAX_BATHROOMS} bathrooms allowed`)
    .optional(),

  // Note: square footage is not in the database schema based on the supabase.ts file
})

// Full property schema (includes server-generated fields)
export const propertySchema = propertyInputSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string()
})

// Property update schema (partial input)
export const propertyUpdateSchema = propertyInputSchema.partial().extend({
  id: uuidSchema.optional(),
  status: propertyStatusSchema.optional(),
  property_owner_id: uuidSchema.optional()
})

// Property query schema (for search/filtering)
export const propertyQuerySchema = z.object({
  search: z.string().optional(),
  property_type: propertyTypeSchema.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: propertyStatusSchema.optional(),
  property_owner_id: uuidSchema.optional(),
  min_bedrooms: positiveNumberSchema.int().optional(),
  max_bedrooms: positiveNumberSchema.int().optional(),
  min_bathrooms: positiveNumberSchema.optional(),
  max_bathrooms: positiveNumberSchema.optional(),
  sort_by: z.enum([
    'name',
    'created_at',
    'city',
    'status',
    'bedrooms',
    'bathrooms'
  ]).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(20)
})

// Property creation schema
export const propertyCreateSchema = propertyInputSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  status: true
}).extend({
  status: propertyStatusSchema.default('active')
})

// Property address validation schema
export const propertyAddressSchema = z.object({
  address_line1: nonEmptyStringSchema
    .min(5, 'Address line 1 must be at least 5 characters')
    .max(200, 'Address line 1 cannot exceed 200 characters'),
  address_line2: z.string()
    .max(200, 'Address line 2 cannot exceed 200 characters')
    .optional(),
  city: nonEmptyStringSchema
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters'),
  state: z.string()
    .min(2, 'State is required')
    .max(2, 'State must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),
  postal_code: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (12345 or 12345-6789)'),
  country: z.string()
    .max(50, 'Country cannot exceed 50 characters')
    .default('US')
})

// Property statistics schema
export const propertyStatsSchema = z.object({
  total: nonNegativeNumberSchema,
  active: nonNegativeNumberSchema,
  inactive: nonNegativeNumberSchema,
  maintenance: nonNegativeNumberSchema,
  units: nonNegativeNumberSchema,
  occupied_units: nonNegativeNumberSchema,
  vacant_units: nonNegativeNumberSchema,
  occupancy_rate: z.number().min(0).max(100)
})

// Property sold schema
export const propertySoldSchema = z.object({
  sale_date: z.string().min(1, 'Sale date is required'),
  sale_price: positiveNumberSchema
    .max(VALIDATION_LIMITS.SALE_PRICE_MAXIMUM, 'Sale price seems unrealistic'),
  sale_notes: z.string()
    .max(VALIDATION_LIMITS.PROPERTY_DESCRIPTION_MAX_LENGTH, `Sale notes cannot exceed ${VALIDATION_LIMITS.PROPERTY_DESCRIPTION_MAX_LENGTH} characters`)
    .optional()
})

/**
 * @deprecated propertyImageUploadSchema - Legacy, not used
 * 
 * The new frontend implementation (PropertyImageUpload component + usePropertyImageUpload hook)
 * handles validation entirely on the client side. This schema is no longer needed.
 * 
 * Fields (isPrimary, caption) were not supported by the database schema anyway.
 * Migration: Use apps/frontend/src/components/properties/property-image-upload.tsx
 */

// Export types
export type PropertyInput = z.infer<typeof propertyInputSchema>
export type Property = z.infer<typeof propertySchema>
export type PropertyUpdate = z.infer<typeof propertyUpdateSchema>
export type PropertyQuery = z.infer<typeof propertyQuerySchema>
export type PropertyCreate = z.infer<typeof propertyCreateSchema>
export type PropertyAddress = z.infer<typeof propertyAddressSchema>
export type PropertyStats = z.infer<typeof propertyStatsSchema>
export type PropertySold = z.infer<typeof propertySoldSchema>

// Frontend-specific form schemas
export const propertyFormSchema = z.object({
  name: requiredString,
  address_line1: requiredString,
  address_line2: z.string().optional(),
  city: requiredString,
  state: requiredString,
 postal_code: requiredString,
  country: z.string().optional().default('US'),
  property_type: z.enum([
    'single_family',
    'multi_family',
    'condo',
    'townhouse',
    'apartment',
    'commercial',
    'industrial',
    'mixed_use',
    'other'
  ]),
  property_owner_id: requiredString,
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional()
})

export const propertyUpdateFormSchema = propertyFormSchema.partial()

// Transform functions for form data
export const transformPropertyFormData = (data: PropertyFormData) => ({
  name: data.name,
  address_line1: data.address_line1,
  address_line2: data.address_line2 || undefined,
  city: data.city,
 state: data.state,
  postal_code: data.postal_code,
  country: data.country || 'US',
  property_type: data.property_type,
  property_owner_id: data.property_owner_id,
  bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : undefined,
  bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : undefined
})

export type PropertyFormData = z.infer<typeof propertyFormSchema>
export type PropertyUpdateFormData = z.infer<typeof propertyUpdateFormSchema>
export type TransformedPropertyData = ReturnType<typeof transformPropertyFormData>
