/**
 * TenantFlow Lease Generator - Production SaaS Types
 * Core Types for Dynamic Lease Generation
 */
import type {
	LeaseTemplateContext,
	LeaseTemplateSelections
} from '#lib/templates/lease-template'
import type { PropertyType } from '#lib/constants/status-types'
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

