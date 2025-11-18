/**
 * TenantFlow Lease Generator - Production SaaS Types
 * Core Types for Dynamic Lease Generation
 */
import type {
	LeaseTemplateContext,
	LeaseTemplateSelections
} from '../templates/lease-template.js'
import type { PropertyType } from '../constants/status-types.js'
/**
 * US States with specific lease requirements
 */
// prettier-ignore
export type USState = 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA' | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD' | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ' | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC' | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY' | 'DC' // District of Columbia


/**
 * Lease term types
 */
// prettier-ignore
export type LeaseTermType = 'fixed_term' | 'month_to_month' | 'week_to_week' | 'at_will' // Standard 1-year lease, Monthly renewal, Weekly (rare), Terminable at any time

/**
 * Base lease form data that user fills out
 */
export interface LeaseFormData {
	// Property Information
	property: {
		address: {
			street: string
			unit?: string
			city: string
			state: USState
			postal_code: string
		}
		type: PropertyType
		bedrooms: number
		bathrooms: number
		square_feet?: number
		parking?: {
			included: boolean
			spaces?: number
			monthly_fee?: number
		}
		amenities?: string[]
	}

	// owner Information
	owner: {
		name: string
		isEntity: boolean // Individual vs LLC/Corp
		entityType?: 'LLC' | 'Corporation' | 'Partnership'
		address: {
			street: string
			city: string
			state: USState
			postal_code: string
		}
		phone: string
		email: string
		agent?: {
			name: string
			phone: string
			email: string
		}
	}

	// Tenant Information
	tenants: Array<{
		name: string
		email: string
		phone: string
		isMainTenant: boolean
	}>

	// Lease Terms
	leaseTerms: {
		type: LeaseTermType
		start_date: string // ISO date
		end_date?: string // For fixed term
		rent_amount: number // Monthly rent in cents
		currency: 'USD'

		// Payment Terms
		dueDate: number // Day of month (1-31)
		lateFee: {
			enabled: boolean
			amount?: number
			gracePeriod?: number // Days
			percentage?: number // Alternative to fixed amount
		}

		// Security Deposit
		security_deposit: {
			amount: number
			monthsRent: number // 1x, 2x, etc.
			holdingAccount?: boolean // Some states require separate account
		}

		// Additional Fees
		additionalFees?: Array<{
			// prettier-ignore
			type: 'pet_fee' | 'cleaning_fee' | 'application_fee' | 'key_deposit' | 'other'
			description: string
			amount: number
			refundable: boolean
		}>
	}

	// Property Rules & Policies
	policies?: {
		pets: {
			allowed: boolean
			// prettier-ignore
			types?: Array<'dogs' | 'cats' | 'birds' | 'fish' | 'other'>
			deposit?: number
			monthlyFee?: number
			restrictions?: string // Weight limits, breed restrictions
		}
		smoking: {
			allowed: boolean
			designatedAreas?: string
		}
		guests: {
			overnightLimit?: number // Days per month
			extendedStayLimit?: number // Consecutive days
		}
		maintenance: {
			tenantResponsibilities: string[]
			ownerResponsibilities: string[]
		}
	}

	// Optional Custom Terms
	customTerms?: Array<{
		title: string
		content: string
		required: boolean
	}>

	// Generation Options
	options: {
		includeStateDisclosures: boolean
		includeFederalDisclosures: boolean
		includeSignaturePages: boolean
		// prettier-ignore
		format: 'standard' | 'detailed' | 'simple'
	}

	// Template configuration (optional - used by custom builder)
	templateConfig?: {
		selections: LeaseTemplateSelections
		contextOverrides?: Partial<LeaseTemplateContext>
	}
}

/**
 * State-specific legal requirements
 */
export interface StateLeaseRequirements {
	state: USState
	stateName: string

	// Security Deposit Rules
	security_deposit: {
		maxAmount: {
			// prettier-ignore
			type: 'months_rent' | 'fixed_amount'
			value: number
		}
		holdingRequirements: {
			separateAccount: boolean
			interestRequired: boolean
			interestRate?: number
		}
		returnPeriod: number // Days
	}

	// Required Disclosures
	requiredDisclosures: Array<{
		// prettier-ignore
		type: 'lead_paint' | 'mold' | 'bed_bugs' | 'sex_offender' | 'flood_zone' | 'other'
		title: string
		content: string
		applicableIf?: {
			property_type?: PropertyType[]
			buildYear?: 'before_1978' | 'any'
			floodZone?: boolean
		}
	}>

	// Notice Periods
	noticePeriods: {
		monthToMonthTermination: number // Days
		rentIncrease: number // Days
		entryForInspection: number // Hours
		entryForRepairs: number // Hours
	}

	// Late Fee Rules
	lateFeeRules: {
		maxAmount?: {
			// prettier-ignore
			type: 'percentage' | 'fixed'
			value: number
		}
		gracePeriod: number // Minimum grace period in days
		dailyFees: boolean // Whether daily late fees are allowed
	}

	// Prohibited Clauses
	prohibitedClauses: Array<{
		type: string
		description: string
		reason: string
	}>

	// Required Clauses
	requiredClauses: Array<{
		type: string
		title: string
		content: string
		// prettier-ignore
		placement: 'beginning' | 'middle' | 'end'
	}>
}

/**
 * Generated lease document
 */
export interface GeneratedLease {
	id: string
	user_id: string

	// Form data used
	formData: LeaseFormData

	// Generated content
	document: {
		html: string
		pdf: Buffer
		pageCount: number
		generatedAt: string
	}

	// State compliance info
	compliance: {
		state: USState
		appliedRules: string[]
		warnings: Array<{
			// prettier-ignore
			type: 'info' | 'warning' | 'error'
			message: string
			suggestion?: string
		}>
	}

	// Billing
	billing: {
		// prettier-ignore
		plan: 'free' | 'basic' | 'pro' | 'enterprise'
		cost: number
		transaction?: string // Stripe payment intent ID
	}

	// Status
	// prettier-ignore
	status: 'draft' | 'generated' | 'downloaded' | 'signed'

	// Metadata
	created_at: string
	updated_at: string
	expiresAt: string // When draft expires
}

/**
 * User's lease generation history
 */
export interface UserLeaseHistory {
	user_id: string
	leases: GeneratedLease[]

	// Usage statistics
	usage: {
		totalGenerated: number
		thisMonth: number
		planLimits: {
			monthlyLimit: number
			remaining: number
		}
	}

	// Billing info
	billing: {
		// prettier-ignore
		currentPlan: 'free' | 'basic' | 'pro' | 'enterprise'
		subscriptionId?: string
		nextBillingDate?: string
	}
}

/**
 * Pricing tiers for lease generation
 */
export interface LeaseGenerationPricing {
	// prettier-ignore
	plan: 'free' | 'basic' | 'pro' | 'enterprise'

	limits: {
		leasesPerMonth: number
		// prettier-ignore
		statesSupported: USState[] | 'all'
		customClauses: boolean
		priority_support: boolean
		whiteLabel: boolean
	}

	pricing: {
		monthly: number // in cents
		yearly: number // in cents
		perLease: number // in cents (for overage)
	}

	features: string[]
}

// API Response Types
export interface LeaseGenerationResponse {
	success: boolean
	lease: GeneratedLease
	downloadUrl: string
	previewUrl: string
}

export interface LeaseValidationResponse {
	valid: boolean
	errors: Array<{
		field: string
		message: string
		code: string
	}>
	warnings: Array<{
		field: string
		message: string
		suggestion: string
	}>
	stateRequirements: StateLeaseRequirements
}
