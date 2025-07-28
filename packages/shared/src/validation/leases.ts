// Lease validation schema for TenantFlow
import { z } from 'zod'

export const leaseSchema = z
  .object({
    propertyId: z.string().min(1, 'Please select a property'),
    unitId: z.string().nullable().optional(),
    tenantId: z.string().min(1, 'Please select at least one tenant'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    rentAmount: z
      .number()
      .min(0, 'Rent amount must be positive')
      .max(100000, 'Rent amount too high'),
    securityDeposit: z
      .number()
      .min(0, 'Security deposit must be positive')
      .max(100000, 'Security deposit too high'),
    status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'])
  })
  .refine(
    data => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return end > start
    },
    {
      message: 'End date must be after start date',
      path: ['endDate']
    }
  )

export type LeaseFormData = z.infer<typeof leaseSchema>
