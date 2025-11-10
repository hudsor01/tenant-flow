import { z } from 'zod'

/**
 * Helper to validate date strings and reject invalid dates like 2024-99-99
 */
export const validateDateString = (val: unknown): unknown => {
	if (typeof val === 'string' && val.length > 0) {
		const date = new Date(val)
		if (isNaN(date.getTime())) {
			throw new Error('Invalid date')
		}
	}
	return val
}

/**
 * Helper to convert YYYY-MM-DD to ISO 8601 datetime and validate
 * Used in backend DTOs for date preprocessing
 */
export const convertDateToIso = (val: unknown): unknown => {
	if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
		const isoDate = `${val}T00:00:00.000Z`
		// Validate it's a real date (not 2024-99-99)
		const date = new Date(isoDate)
		if (isNaN(date.getTime())) {
			return val // Return original to trigger validation error
		}
		return isoDate
	}
	return val
}

/**
 * Lease Generation Form Schema
 * Maps to Texas Residential Lease Agreement PDF (34 sections)
 */
export const leaseGenerationSchema = z.object({
	// Section 1: Property & Parties (Page 1)
	agreementDate: z.preprocess(validateDateString, z.string().min(1, 'Agreement date is required')),
	ownerName: z.string().min(1, 'Property owner name is required'),
	ownerAddress: z.string().min(1, 'Property owner address is required'),
	ownerPhone: z.string().optional(),
	tenantName: z.string().min(1, 'Tenant name is required'),
	propertyAddress: z.string().min(1, 'Property address is required'),

	// Section 2: Term (Page 1)
	commencementDate: z.preprocess(validateDateString, z.string().min(1, 'Commencement date is required')),
	terminationDate: z.preprocess(validateDateString, z.string().min(1, 'Termination date is required')),

	// Section 3: Rent (Pages 1-2)
	monthlyRent: z.number().gt(0, 'Monthly rent must be positive'),
	rentDueDay: z.number().min(1).max(31).default(1),
	lateFeeAmount: z.number().min(0).optional(),
	lateFeeGraceDays: z.number().min(0).default(3),
	nsfFee: z.number().min(0).default(50),

	// Section 4: Security Deposit (Page 2)
	securityDeposit: z.number().min(0),
	securityDepositDueDays: z.number().min(0).default(30),

	// Section 5: Use of Premises (Page 2)
	maxOccupants: z.number().min(1).optional(),
	allowedUse: z
		.string()
		.default('Residential dwelling purposes only. No business activities.'),

	// Section 8: Alterations (Pages 2-3)
	alterationsAllowed: z.boolean().default(false),
	alterationsRequireConsent: z.boolean().default(true),

	// Section 11: Utilities (Page 3)
	utilitiesIncluded: z.array(z.string()).default([]),
	tenantResponsibleUtilities: z.array(z.string()).default([]),

	// Section 12: Maintenance Rules (Pages 3-4)
	propertyRules: z.string().optional(),

	// Section 16: Hold Over Rent (Page 5)
	holdOverRentMultiplier: z.number().min(1).default(1.2), // 120% of monthly rent

	// Section 18: Animals (Page 5)
	petsAllowed: z.boolean().default(false),
	petDeposit: z.number().min(0).default(0),
	petRent: z.number().min(0).default(0),

	// Section 24: Attorneys' Fees (Page 6)
	prevailingPartyAttorneyFees: z.boolean().default(true),

	// Section 26: Governing Law (Page 6)
	governingState: z.string().default('TX'),

	// Section 33: Notice (Page 6)
	noticeAddress: z.string().optional(),
	noticeEmail: z.string().email().optional(),

	// Section 34: Lead-Based Paint (Page 7)
	propertyBuiltBefore1978: z.boolean().default(false),
	leadPaintDisclosureProvided: z.boolean().optional(),

	// Additional metadata (required for authorization/validation)
	propertyId: z.string().uuid('Invalid property ID'),
	tenantId: z.string().optional()
}).refine(
	(data) => {
		// Validate terminationDate > commencementDate
		const commence = new Date(data.commencementDate)
		const terminate = new Date(data.terminationDate)

		// Check both dates are valid
		if (isNaN(commence.getTime()) || isNaN(terminate.getTime())) {
			return true // Let individual field validation handle invalid dates
		}

		return terminate > commence
	},
	{
		message: 'Termination date must be after commencement date',
		path: ['terminationDate']
	}
)

export type LeaseGenerationFormData = z.infer<typeof leaseGenerationSchema>

/**
 * Auto-fill schema for pre-populating form from property/tenant/unit data
 * Matches the GET /api/v1/leases/auto-fill/:propertyId/:unitId/:tenantId endpoint
 */
export const leaseAutoFillSchema = z.object({
	propertyId: z.string().uuid('Invalid property ID'),
	unitId: z.string().uuid('Invalid unit ID'),
	tenantId: z.string().uuid('Invalid tenant ID')
})

export type LeaseAutoFillRequest = z.infer<typeof leaseAutoFillSchema>
