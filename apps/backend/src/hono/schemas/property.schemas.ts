import { z } from 'zod'
import { PropertyStatus, PropertyType } from '@tenantflow/shared'

// Property ID schema
export const propertyIdSchema = z.object({
  id: z.string().uuid()
})

// Property list query schema
export const propertyListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  search: z.string().optional(),
  offset: z.string().optional()
})

// Create property schema
export const createPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().default('US'),
  propertyType: z.nativeEnum(PropertyType),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  units: z.number().int().positive().default(1),
  size: z.number().positive().optional(),
  yearBuilt: z.number().int().optional(),
  features: z.array(z.string()).optional()
})

// Update property schema
export const updatePropertySchema = createPropertySchema.partial()

// Upload image schema
export const uploadImageSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().positive()
})