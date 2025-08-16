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
	.refine(val => /^\d{4}-\d{2}-\d{2}$/.test(val) || !isNaN(Date.parse(val)), {
		message: 'Invalid date format'
	})

export const leaseStatusEnum = z.enum(
	['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'],
	{
		error: 'Lease status is required'
	}
)

export const leaseTypeEnum = z.enum(['FIXED', 'MONTH_TO_MONTH'], {
	error: 'Lease type is required'
})

export const smokingPolicyEnum = z.enum(['ALLOWED', 'NOT_ALLOWED'], {
	error: 'Smoking policy is required'
})

// Main lease input schema
export const leaseInputSchema = z
	.object({
		propertyId: uuidString,
		unitId: uuidString.optional().or(z.null()),
		tenantId: uuidString,
		startDate: dateString,
		endDate: dateString,
		monthlyRent: positiveMoneyAmount,
		securityDeposit: positiveMoneyAmount.default(0),
		leaseTerm: z
			.number()
			.min(1, 'Lease term must be at least 1 month')
			.max(60, 'Lease term cannot exceed 60 months')
			.optional(),
		status: leaseStatusEnum.default('DRAFT'),
		leaseType: leaseTypeEnum.default('FIXED'),
		petPolicy: z.string().optional(),
		smokingPolicy: smokingPolicyEnum.optional(),
		utilities: z.array(z.string()).optional().default([]),
		additionalTerms: z.string().optional(),
		lateFeeDays: z
			.number()
			.min(0, 'Late fee days must be positive')
			.max(30, 'Late fee days cannot exceed 30')
			.optional(),
		lateFeeAmount: positiveMoneyAmount.optional()
	})
	.refine(
		data => {
			try {
				const start = new Date(data.startDate)
				const end = new Date(data.endDate)
				return (
					!isNaN(start.getTime()) &&
					!isNaN(end.getTime()) &&
					end > start
				)
			} catch {
				return false
			}
		},
		{
			message: 'End date must be after start date',
			path: ['endDate']
		}
	)

// Lease renewal schema
export const leaseRenewalSchema = z.object({
	endDate: dateString,
	newRent: positiveMoneyAmount.optional(),
	renewalTerms: z.string().optional()
})

// Lease termination schema
export const leaseTerminationSchema = z.object({
	terminationDate: dateString,
	reason: z.string().min(1, 'Termination reason is required'),
	earlyTerminationFee: positiveMoneyAmount.optional(),
	refundableDeposit: positiveMoneyAmount.optional(),
	notes: z.string().optional()
})

// Lease update schema (for partial updates)
export const leaseUpdateSchema = leaseInputSchema.partial()

// Legacy alias for backward compatibility
export const leaseSchema = leaseInputSchema

export type LeaseFormData = z.infer<typeof leaseInputSchema>
export type LeaseRenewalData = z.infer<typeof leaseRenewalSchema>
export type LeaseTerminationData = z.infer<typeof leaseTerminationSchema>
export type LeaseStatus = z.infer<typeof leaseStatusEnum>

// Backend DTO compatibility aliases
export type CreateLeaseInput = z.infer<typeof leaseInputSchema>
export type UpdateLeaseInput = z.infer<typeof leaseUpdateSchema>
export type LeaseInput = z.infer<typeof leaseInputSchema>
export type LeaseUpdate = z.infer<typeof leaseUpdateSchema>
export type LeaseQuery = z.infer<typeof leaseInputSchema> // Add proper query schema if needed
