// Lease validation schema for TenantFlow
import { z } from 'zod'

// Enhanced validation with Zod patterns
const positiveMoneyAmount = z
  .number({ 
    required_error: 'Must be a valid number',
    invalid_type_error: 'Must be a valid number'
  })
  .min(0, { message: 'Amount must be positive' })
  .max(100000, { message: 'Amount exceeds maximum limit' })
  .finite({ message: 'Must be a finite number' })

const uuidString = z
  .string({ 
    required_error: 'Required field',
    invalid_type_error: 'Must be a string'
  })
  .uuid({ message: 'Must be a valid identifier' })


const dateString = z
  .string({ 
    required_error: 'Date is required',
    invalid_type_error: 'Must be a string'
  })
  .datetime({ message: 'Invalid date format' })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date format' }))

export const leaseStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'], {
  required_error: 'Lease status is required',
  invalid_type_error: 'Invalid lease status'
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
