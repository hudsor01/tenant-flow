import { z } from 'zod'
import { UnitStatus } from '@tenantflow/shared'

// Unit ID schema
export const unitIdSchema = z.object({
  id: z.string().uuid()
})

// Unit list query schema
export const unitListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(UnitStatus).optional(),
  search: z.string().optional(),
  offset: z.string().optional()
})

// Create unit schema
export const createUnitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  propertyId: z.string().uuid(),
  floor: z.number().int().optional(),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().positive(),
  size: z.number().positive().optional(),
  rent: z.number().positive(),
  deposit: z.number().nonnegative().optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional()
})

// Update unit schema
export const updateUnitSchema = createUnitSchema.partial().omit({ propertyId: true })

// Bulk create units schema
export const bulkCreateUnitsSchema = z.object({
  propertyId: z.string().uuid(),
  units: z.array(createUnitSchema.omit({ propertyId: true }))
})

// Assign tenant schema
export const assignTenantSchema = z.object({
  tenantId: z.string().uuid()
})

// Unit property ID schema
export const unitPropertyIdSchema = z.object({
  propertyId: z.string().uuid()
})