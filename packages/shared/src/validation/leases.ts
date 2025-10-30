// Lease validation schema for TenantFlow
import { z } from 'zod'
import { Constants } from '../types/supabase-generated.js'
import { requiredString } from './common.js'

// Enhanced validation with Zod patterns
const positiveMoneyAmount = z
	.number()
	.min(0, { message: 'Amount must be positive' })
	.max(100000, { message: 'Amount exceeds maximum limit' })
	.refine(Number.isFinite, { message: 'Must be a finite number' })

const uuidString = z
	.string()
	.regex(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		{ message: 'Must be a valid identifier' }
	)

const dateString = z
	.string()
	.refine(
		(val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val) || !isNaN(Date.parse(val)),
		{
			message: 'Invalid date format'
		}
	)

// Use auto-generated Supabase enums - single source of truth
export const leaseStatusEnum = z.enum(
	Constants.public.Enums.LeaseStatus as readonly [string, ...string[]]
)

export const leaseTypeEnum = z.enum(
	Constants.public.Enums.LeaseType as readonly [string, ...string[]]
)

export const smokingPolicyEnum = z.enum(['ALLOWED', 'NOT_ALLOWED'])

// Base lease object schema (without refinements) - matches Supabase Lease table exactly
const leaseBaseSchema = z.object({
	unitId: uuidString,
	tenantId: uuidString,
	startDate: dateString,
	endDate: dateString,
	rentAmount: positiveMoneyAmount,
	// Security deposit is optional - 0 or empty is valid (some leases may not require a deposit)
	securityDeposit: positiveMoneyAmount.optional().nullable().or(z.literal(0)),
	terms: z.string().optional().nullable(),
	status: leaseStatusEnum.default('DRAFT' as const),
	propertyId: uuidString.optional().nullable(),
	monthlyRent: positiveMoneyAmount.optional().nullable()
})

// Main lease input schema (with refinements)
export const leaseInputSchema = leaseBaseSchema.refine(
	(data: { startDate: string; endDate: string }) => {
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

// Lease renewal schema
export const leaseRenewalSchema = z.object({
	endDate: dateString,
	newRent: positiveMoneyAmount.optional(),
	renewalTerms: z.string().optional()
})

// Lease termination schema
export const leaseTerminationSchema = z.object({
	terminationDate: dateString,
	reason: requiredString,
	earlyTerminationFee: positiveMoneyAmount.optional(),
	refundableDeposit: positiveMoneyAmount.optional(),
	notes: z.string().optional()
})

// Lease update schema (for partial updates)
export const leaseUpdateSchema = leaseBaseSchema.partial()

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
