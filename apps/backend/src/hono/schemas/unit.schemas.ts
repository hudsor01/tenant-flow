import { z } from 'zod'
import { UNIT_STATUS } from '@tenantflow/shared/constants/properties'
import {
  createCrudSchemas,
  uuidSchema,
  nonNegativeIntSchema,
  moneySchema,
  idParamSchema
} from './common.schemas'

// Unit-specific filter schema
const unitFilterSchema = z.object({
  propertyId: uuidSchema.optional(),
  status: z.nativeEnum(UNIT_STATUS).optional()
})

// Create unit schema
export const createUnitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  propertyId: uuidSchema,
  floor: z.number().int().optional(),
  bedrooms: nonNegativeIntSchema,
  bathrooms: z.number().positive(),
  size: z.number().positive().optional(),
  rent: moneySchema,
  deposit: moneySchema.optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional()
})

// Generate CRUD schemas using factory
export const unitSchemas = createCrudSchemas({
  createSchema: createUnitSchema,
  filterSchema: unitFilterSchema,
  requiredOnUpdate: ['unitNumber'] // Unit number stays required on update
})

// Export individual schemas for backward compatibility
export const unitIdSchema = idParamSchema
export const unitListQuerySchema = unitSchemas.list
export const updateUnitSchema = unitSchemas.update.omit({ propertyId: true })

// Additional unit-specific schemas
export const bulkCreateUnitsSchema = z.object({
  propertyId: uuidSchema,
  units: z.array(createUnitSchema.omit({ propertyId: true }))
})

export const assignTenantSchema = z.object({
  tenantId: uuidSchema
})

export const unitPropertyIdSchema = z.object({
  propertyId: uuidSchema
})
