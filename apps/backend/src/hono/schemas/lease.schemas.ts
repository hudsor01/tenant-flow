import { z } from 'zod'
import { LEASE_STATUS, LEASE_TYPE } from '@tenantflow/shared/constants/leases'



// Lease ID schema
export const leaseIdSchema = z.object({
  id: z.string().uuid()
})

// Lease list query schema
export const leaseListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(LEASE_STATUS).optional(),
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  search: z.string().optional(),
  offset: z.string().optional(),
  expiringDays: z.string().optional()
})

// Create lease schema
export const createLeaseSchema = z.object({
  propertyId: z.string().uuid(),
  unitId: z.string().uuid(),
  tenantId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  monthlyRent: z.number().positive(),
  securityDeposit: z.number().nonnegative(),
  leaseType: z.nativeEnum(LEASE_TYPE).default(LEASE_TYPE.FIXED_TERM),
  terms: z.string().optional(),
  notes: z.string().optional()
})

// Update lease schema
export const updateLeaseSchema = createLeaseSchema.partial()

// Terminate lease schema
export const terminateLeaseSchema = z.object({
  reason: z.string().min(1, 'Termination reason is required'),
  effectiveDate: z.string().datetime()
})

// Renew lease schema
export const renewLeaseSchema = z.object({
  newEndDate: z.string().datetime(),
  newMonthlyRent: z.number().positive().optional(),
  notes: z.string().optional()
})
