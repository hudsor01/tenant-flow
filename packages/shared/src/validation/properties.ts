import { z } from 'zod'
import { 
  uuidSchema, 
  nonEmptyStringSchema, 
  positiveNumberSchema, 
  nonNegativeNumberSchema,
  addressSchema,
  urlSchema
} from './common'

// Property type enum
export const propertyTypeSchema = z.enum([
  'SINGLE_FAMILY', 
  'MULTI_UNIT', 
  'APARTMENT', 
  'CONDO', 
  'TOWNHOUSE',
  'COMMERCIAL',
  'OTHER'
])

export const propertyStatusSchema = z.enum([
  'ACTIVE', 
  'INACTIVE', 
  'MAINTENANCE', 
  'DRAFT'
])

// Base property input schema (for forms and API creation)
export const propertyInputSchema = z.object({
  name: nonEmptyStringSchema
    .min(3, 'Property name must be at least 3 characters')
    .max(100, 'Property name cannot exceed 100 characters'),
  
  description: z.string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .or(z.literal('')),
  
  propertyType: propertyTypeSchema.default('SINGLE_FAMILY'),
  
  address: nonEmptyStringSchema
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address cannot exceed 200 characters'),
    
  city: nonEmptyStringSchema
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City cannot exceed 50 characters'),
    
  state: z.string()
    .min(2, 'State is required')
    .max(2, 'State must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'State must be 2 uppercase letters'),
    
  zipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (12345 or 12345-6789)'),
    
  bedrooms: positiveNumberSchema
    .int('Bedrooms must be a whole number')
    .max(50, 'Maximum 50 bedrooms allowed')
    .optional(),
    
  bathrooms: positiveNumberSchema
    .max(50, 'Maximum 50 bathrooms allowed')
    .optional(),
    
  squareFootage: positiveNumberSchema
    .int('Square footage must be a whole number')
    .max(1000000, 'Square footage seems unrealistic')
    .optional(),
    
  rent: nonNegativeNumberSchema
    .max(1000000, 'Rent amount seems unrealistic')
    .optional(),
    
  deposit: nonNegativeNumberSchema
    .max(1000000, 'Deposit amount seems unrealistic')
    .optional(),
    
  images: z.array(urlSchema).optional().default([]),
  
  amenities: z.array(z.string()).optional().default([])
})

// Full property schema (includes server-generated fields)
export const propertySchema = propertyInputSchema.extend({
  id: uuidSchema,
  ownerId: uuidSchema,
  status: propertyStatusSchema.default('DRAFT'),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Property update schema (partial input)
export const propertyUpdateSchema = propertyInputSchema
  .partial()
  .extend({
    status: propertyStatusSchema.optional()
  })

// Property query schema (for search/filtering)
export const propertyQuerySchema = z.object({
  search: z.string().optional(),
  propertyType: propertyTypeSchema.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  minRent: nonNegativeNumberSchema.optional(),
  maxRent: nonNegativeNumberSchema.optional(),
  bedrooms: positiveNumberSchema.int().optional(),
  bathrooms: positiveNumberSchema.optional(),
  status: propertyStatusSchema.optional(),
  sortBy: z.enum(['name', 'createdAt', 'rent', 'city']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
})

// Property statistics schema
export const propertyStatsSchema = z.object({
  total: nonNegativeNumberSchema,
  active: nonNegativeNumberSchema,
  inactive: nonNegativeNumberSchema,
  maintenance: nonNegativeNumberSchema,
  totalRent: nonNegativeNumberSchema,
  averageRent: nonNegativeNumberSchema
})

// Export types
export type PropertyInput = z.infer<typeof propertyInputSchema>
export type Property = z.infer<typeof propertySchema>
export type PropertyUpdate = z.infer<typeof propertyUpdateSchema>
export type PropertyQuery = z.infer<typeof propertyQuerySchema>
export type PropertyStats = z.infer<typeof propertyStatsSchema>
export type PropertyTypeValidation = z.infer<typeof propertyTypeSchema>
export type PropertyStatusValidation = z.infer<typeof propertyStatusSchema>

// Frontend-specific form schema (handles string inputs from HTML forms)
export const propertyFormSchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  description: z.string().optional(),
  propertyType: z.string().default('SINGLE_FAMILY'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  bedrooms: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  bathrooms: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  squareFootage: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  rent: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  deposit: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  imageUrl: z.string().optional(), // Legacy single image field
  // Frontend-specific UI fields
  hasGarage: z.boolean().optional().default(false),
  hasPool: z.boolean().optional().default(false),
  numberOfUnits: z.number().optional(),
  createUnitsNow: z.boolean().optional().default(false)
}).transform(data => ({
  ...data,
  propertyType: data.propertyType as PropertyTypeValidation
}))

// Create property form schema for API usage (transforms single imageUrl to images array)
export const createPropertyFormSchema = propertyFormSchema.transform(data => ({
  name: data.name,
  description: data.description,
  propertyType: data.propertyType,
  address: data.address,
  city: data.city,
  state: data.state,
  zipCode: data.zipCode,
  bedrooms: data.bedrooms,
  bathrooms: data.bathrooms,
  squareFootage: data.squareFootage,
  rent: data.rent,
  deposit: data.deposit,
  images: data.imageUrl ? [data.imageUrl] : [],
  // Transform frontend UI fields to amenities array
  amenities: [
    ...(data.hasGarage ? ['garage'] : []),
    ...(data.hasPool ? ['pool'] : [])
  ]
}))

export type PropertyFormData = z.input<typeof propertyFormSchema>
export type PropertyFormOutput = z.output<typeof propertyFormSchema>