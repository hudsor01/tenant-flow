import { z } from 'zod'
import { PROPERTY_STATUS, PROPERTY_TYPE } from '@tenantflow/shared/constants/properties'
import { PropertyType as PrismaPropertyType } from '@prisma/client'
import {
  createCrudSchemas,
  addressSchema,
  positiveIntSchema,
  urlSchema,
  imageUploadSchema,
  idParamSchema
} from './common.schemas'

// Property-specific filter schema
const propertyFilterSchema = z.object({
  status: z.nativeEnum(PROPERTY_STATUS).optional(),
  propertyType: z.nativeEnum(PROPERTY_TYPE).optional()
})

// Create property schema
export const createPropertySchema = addressSchema.extend({
  name: z.string().min(1, 'Property name is required'),
  propertyType: z.nativeEnum(PROPERTY_TYPE),
  description: z.string().optional(),
  imageUrl: urlSchema.optional(),
  units: positiveIntSchema.default(1),
  size: z.number().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  features: z.array(z.string()).optional()
})

// Generate CRUD schemas using factory
export const propertySchemas = createCrudSchemas({
  createSchema: createPropertySchema,
  filterSchema: propertyFilterSchema,
  requiredOnUpdate: [] // All fields optional on update
})

// Export individual schemas for backward compatibility
export const propertyIdSchema = idParamSchema
export const propertyListQuerySchema = propertySchemas.list
export const updatePropertySchema = propertySchemas.update
export const uploadImageSchema = imageUploadSchema
