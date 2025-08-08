// Lease validation schema for TenantFlow
import { z } from 'zod'

// Enhanced validation with Zod patterns
const positiveMoneyAmount = z
  .number({ 
    error: 'Must be a valid number'
  })
  .min(0, { message: 'Amount must be positive' })
  .max(100000, { message: 'Amount exceeds maximum limit' })
  .refine(Number.isFinite, { message: 'Must be a finite number' })

const uuidString = z
  .string({ 
    error: 'Required field'
  })
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    { message: 'Must be a valid identifier' }
  )


const dateString = z
  .string({ 
    error: 'Date is required'
  })
  .refine(
    val =>
      /^\d{4}-\d{2}-\d{2}$/.test(val) ||
      !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  )

export const leaseStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'], {
  error: 'Lease status is required'
})

export const leaseSchema = z
  .object({
    propertyId: uuidString,
    unitId: uuidString.optional().or(z.null()),
    tenantId: uuidString,
    startDate: dateString,
    endDate: dateString,
    rentAmount: positiveMoneyAmount,
    securityDeposit: positiveMoneyAmount.default(0),
    status: leaseStatusEnum.default('DRAFT')
  })
  .refine(
    data => {
      try {
        const start = new Date(data.startDate)
        const end = new Date(data.endDate)
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start
      } catch {
        return false
      }
    },
    {
      message: 'End date must be after start date',
      path: ['endDate']
    }
  )

export type LeaseFormData = z.infer<typeof leaseSchema>
