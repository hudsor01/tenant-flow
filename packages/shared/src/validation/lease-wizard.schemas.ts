/**
 * Lease Creation Wizard Validation Schemas
 *
 * Step-by-step validation for the unified lease creation wizard.
 * These schemas validate each step independently and provide a combined
 * schema for the final submission.
 */
import { z } from 'zod'
import {
	uuidSchema,
	positiveNumberSchema,
	nonNegativeNumberSchema
} from './common.js'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

/**
 * US State codes for governing law selection
 */
export const usStateSchema = z.enum([
	'AL',
	'AK',
	'AZ',
	'AR',
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'GA',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VA',
	'WA',
	'WV',
	'WI',
	'WY',
	'DC'
])

/**
 * Common utility types for lease agreements
 */
export const utilityTypeSchema = z.enum([
	'electricity',
	'gas',
	'water',
	'sewer',
	'trash',
	'internet',
	'cable',
	'lawn_care',
	'pest_control',
	'hoa_fees'
])

/**
 * Date string validation (YYYY-MM-DD format)
 */
const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
	.refine(val => {
		const date = new Date(`${val}T00:00:00.000Z`)
		if (isNaN(date.getTime())) return false
		const [year, month, day] = val.split('-').map(Number)
		return (
			date.getUTCFullYear() === year &&
			date.getUTCMonth() + 1 === month &&
			date.getUTCDate() === day
		)
	}, 'Invalid date')

// ============================================================================
// STEP 1: SELECTION SCHEMA
// ============================================================================

/**
 * Step 1: Property, Unit, and Tenant Selection
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const selectionStepSchema = z.object({
	property_id: uuidSchema.describe('Selected property'),
	unit_id: uuidSchema.describe('Selected unit within the property'),
	primary_tenant_id: uuidSchema.describe('Primary tenant for the lease')
})

export type SelectionStepData = z.infer<typeof selectionStepSchema>

// ============================================================================
// STEP 2: TERMS SCHEMA
// ============================================================================

/**
 * Step 2: Lease Terms (dates and financial details)
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export const termsStepSchema = z
	.object({
		start_date: dateStringSchema.describe('Lease start date'),
		end_date: dateStringSchema.describe('Lease end date'),
		rent_amount: positiveNumberSchema
			.max(
				VALIDATION_LIMITS.RENT_MAXIMUM_VALUE,
				'Rent amount seems unrealistic'
			)
			.describe('Monthly rent in cents'),
		security_deposit: nonNegativeNumberSchema
			.max(
				VALIDATION_LIMITS.RENT_MAXIMUM_VALUE,
				'Security deposit seems unrealistic'
			)
			.describe('Security deposit in cents'),
		payment_day: z
			.number()
			.int('Payment day must be a whole number')
			.min(1, 'Payment day must be between 1 and 31')
			.max(31, 'Payment day must be between 1 and 31')
			.default(1)
			.describe('Day of month rent is due'),
		grace_period_days: z
			.number()
			.int('Grace period must be a whole number')
			.min(0, 'Grace period cannot be negative')
			.max(30, 'Grace period cannot exceed 30 days')
			.default(3)
			.describe('Days after due date before late fee applies'),
		late_fee_amount: nonNegativeNumberSchema
			.max(
				VALIDATION_LIMITS.RENT_MAXIMUM_VALUE,
				'Late fee amount seems unrealistic'
			)
			.default(0)
			.describe('Late fee amount in cents')
	})
	.refine(
		data => {
			const start = new Date(`${data.start_date}T00:00:00.000Z`)
			const end = new Date(`${data.end_date}T00:00:00.000Z`)
			return end > start
		},
		{
			message: 'End date must be after start date',
			path: ['end_date']
		}
	)

export type TermsStepData = z.infer<typeof termsStepSchema>

/**
 * Validates start date is not in the past (for new leases)
 * Property 5: Start date validation
 */
export const validateStartDateNotInPast = (startDate: string): boolean => {
	const today = new Date()
	today.setUTCHours(0, 0, 0, 0)
	const start = new Date(`${startDate}T00:00:00.000Z`)
	return start >= today
}

// ============================================================================
// STEP 3: LEASE DETAILS SCHEMA
// ============================================================================

/**
 * Step 3: Lease Details (occupancy, pets, utilities, disclosures)
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */
export const leaseDetailsStepSchema = z
	.object({
		max_occupants: z
			.number()
			.int('Maximum occupants must be a whole number')
			.min(1, 'At least 1 occupant required')
			.max(20, 'Maximum occupants cannot exceed 20')
			.optional()
			.describe('Maximum number of occupants allowed'),
		pets_allowed: z
			.boolean()
			.default(false)
			.describe('Whether pets are allowed'),
		pet_deposit: nonNegativeNumberSchema
			.max(
				VALIDATION_LIMITS.RENT_MAXIMUM_VALUE,
				'Pet deposit seems unrealistic'
			)
			.optional()
			.describe('One-time pet deposit in cents'),
		pet_rent: nonNegativeNumberSchema
			.max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Pet rent seems unrealistic')
			.optional()
			.describe('Monthly pet rent in cents'),
		utilities_included: z
			.array(z.string())
			.default([])
			.describe('Utilities included in rent'),
		tenant_responsible_utilities: z
			.array(z.string())
			.default([])
			.describe('Utilities tenant is responsible for'),
		property_rules: z
			.string()
			.max(5000, 'Property rules cannot exceed 5000 characters')
			.optional()
			.describe('Additional property rules and restrictions'),
		property_built_before_1978: z
			.boolean()
			.default(false)
			.describe(
				'Whether property was built before 1978 (lead paint disclosure)'
			),
		lead_paint_disclosure_acknowledged: z
			.boolean()
			.optional()
			.describe('Tenant acknowledged lead paint disclosure'),
		governing_state: usStateSchema
			.default('TX')
			.describe('State whose laws govern the lease')
	})
	.refine(
		data => {
			// Property 8: Lead paint disclosure requirement
			// If property built before 1978, lead paint disclosure must be acknowledged
			if (data.property_built_before_1978) {
				return data.lead_paint_disclosure_acknowledged === true
			}
			return true
		},
		{
			message:
				'Lead paint disclosure acknowledgment is required for properties built before 1978',
			path: ['lead_paint_disclosure_acknowledged']
		}
	)

export type LeaseDetailsStepData = z.infer<typeof leaseDetailsStepSchema>

// ============================================================================
// COMBINED WIZARD SCHEMA
// ============================================================================

/**
 * Complete lease creation wizard data
 * Combines all steps for final submission
 */
export const leaseWizardSchema = z
	.object({
		// Step 1: Selection
		property_id: uuidSchema,
		unit_id: uuidSchema,
		primary_tenant_id: uuidSchema,

		// Step 2: Terms
		start_date: dateStringSchema,
		end_date: dateStringSchema,
		rent_amount: positiveNumberSchema.max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE),
		security_deposit: nonNegativeNumberSchema.max(
			VALIDATION_LIMITS.RENT_MAXIMUM_VALUE
		),
		payment_day: z.number().int().min(1).max(31).default(1),
		grace_period_days: z.number().int().min(0).max(30).default(3),
		late_fee_amount: nonNegativeNumberSchema
			.max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE)
			.default(0),

		// Step 3: Lease Details
		max_occupants: z.number().int().min(1).max(20).optional(),
		pets_allowed: z.boolean().default(false),
		pet_deposit: nonNegativeNumberSchema.optional(),
		pet_rent: nonNegativeNumberSchema.optional(),
		utilities_included: z.array(z.string()).default([]),
		tenant_responsible_utilities: z.array(z.string()).default([]),
		property_rules: z.string().max(5000).optional(),
		property_built_before_1978: z.boolean().default(false),
		lead_paint_disclosure_acknowledged: z.boolean().optional(),
		governing_state: usStateSchema.default('TX'),

		// Status (always draft for new leases)
		lease_status: z.literal('draft').default('draft')
	})
	.refine(
		data => {
			const start = new Date(`${data.start_date}T00:00:00.000Z`)
			const end = new Date(`${data.end_date}T00:00:00.000Z`)
			return end > start
		},
		{
			message: 'End date must be after start date',
			path: ['end_date']
		}
	)
	.refine(
		data => {
			if (data.property_built_before_1978) {
				return data.lead_paint_disclosure_acknowledged === true
			}
			return true
		},
		{
			message:
				'Lead paint disclosure acknowledgment is required for properties built before 1978',
			path: ['lead_paint_disclosure_acknowledged']
		}
	)

export type LeaseWizardData = z.infer<typeof leaseWizardSchema>

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

/**
 * Create lease request schema (sent to backend)
 */
export const createLeaseWizardRequestSchema = leaseWizardSchema
	.omit({
		lease_status: true
	})
	.extend({
		rent_currency: z.string().length(3).default('USD')
	})

export type CreateLeaseWizardRequest = z.infer<
	typeof createLeaseWizardRequestSchema
>

/**
 * Signature status response schema
 */
export const signatureStatusResponseSchema = z.object({
	lease_id: uuidSchema,
	status: z.enum([
		'draft',
		'pending_signature',
		'active',
		'ended',
		'terminated'
	]),
	owner_signed: z.boolean(),
	owner_signed_at: z.string().nullable(),
	tenant_signed: z.boolean(),
	tenant_signed_at: z.string().nullable(),
	sent_for_signature_at: z.string().nullable(),
	both_signed: z.boolean(),
	docuseal_submission_id: z.string().nullable()
})

export type SignatureStatusResponse = z.infer<
	typeof signatureStatusResponseSchema
>

// ============================================================================
// FORM STATE TYPES (for frontend wizard)
// ============================================================================

/**
 * Wizard step identifiers
 */
export type WizardStep = 'selection' | 'terms' | 'details' | 'review'

/**
 * Wizard form state (partial data during wizard flow)
 */
export interface WizardFormState {
	currentStep: WizardStep
	selection: Partial<SelectionStepData>
	terms: Partial<TermsStepData>
	details: Partial<LeaseDetailsStepData>
	isSubmitting: boolean
	error: string | null
}

/**
 * Initial wizard state
 */
export const initialWizardState: WizardFormState = {
	currentStep: 'selection',
	selection: {},
	terms: {
		payment_day: 1,
		grace_period_days: 3,
		late_fee_amount: 0
	},
	details: {
		pets_allowed: false,
		utilities_included: [],
		tenant_responsible_utilities: [],
		property_built_before_1978: false,
		governing_state: 'TX'
	},
	isSubmitting: false,
	error: null
}
