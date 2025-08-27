/**
 * Lease Generator types (consolidated from apps/frontend/src/components/lease-generator/types)
 * These are frontend domain-specific types that should be accessible from shared package
 */

import { z } from 'zod'
import { requiredString } from '../validation/common'
// Remove frontend-specific dependency - use generic form type instead

export const leaseFormSchema = z.object({
	// Property Information
	propertyAddress: requiredString,
	city: requiredString,
	state: z.string().min(2, 'State is required'),
	zipCode: z.string().min(5, 'Valid ZIP code is required'),
	unitNumber: z.string().optional(),
	countyName: z.string().optional(),
	propertyType: z.enum([
		'house',
		'apartment',
		'condo',
		'townhouse',
		'duplex',
		'other'
	]),
	bedrooms: z.number().optional(),
	bathrooms: z.number().optional(),
	squareFootage: z.number().optional(),

	// Landlord Information
	landlordName: requiredString,
	landlordEmail: z.string().email('Valid email is required'),
	landlordPhone: z.string().optional(),
	landlordAddress: requiredString,

	// Tenant Information
	tenantNames: z
		.array(z.object({ name: z.string() }))
		.min(1, 'At least one tenant is required'),

	// Lease Terms
	leaseStartDate: requiredString,
	leaseEndDate: requiredString,
	rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
	securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),

	// Payment Information
	paymentDueDate: z.number().min(1).max(31),
	lateFeeAmount: z.number().min(0),
	lateFeeDays: z.number().min(1),
	paymentMethod: z.enum(['check', 'online', 'bank_transfer', 'cash']),
	paymentAddress: z.string().optional(),

	// Additional Terms
	petPolicy: z.enum(['allowed', 'not_allowed', 'with_deposit']),
	petDeposit: z.number().optional(),
	parkingSpaces: z.number().optional(),
	storageUnit: z.string().optional(),
	smokingPolicy: z.enum(['allowed', 'not_allowed']),
	maintenanceResponsibility: z.enum(['landlord', 'tenant', 'shared']),
	utilitiesIncluded: z.array(z.string()),

	// Occupancy
	maxOccupants: z.number().min(1),
	occupancyLimits: z.object({
		adults: z.number(),
		childrenUnder18: z.number(),
		childrenUnder2: z.number()
	}),

	// Emergency Contact
	emergencyContact: z
		.object({
			name: z.string(),
			phone: z.string(),
			relationship: z.string()
		})
		.optional(),

	// Additional fields
	moveInDate: z.string().optional(),
	prorationAmount: z.number().optional(),
	petDetails: z
		.object({
			type: z.string(),
			breed: z.string(),
			weight: z.string(),
			registration: z.string()
		})
		.optional(),
	keyDeposit: z.number().optional(),

	// Additional Clauses
	additionalTerms: z.string().optional(),
	specialProvisions: z.string().optional()
})

export type LeaseFormData = z.infer<typeof leaseFormSchema>

// Component prop types for lease generator sections - using generic form interface
export interface PropertyInfoSectionProps {
	form: GenericFormHandler<LeaseFormData>
	supportedStates: string[]
}

export interface TenantInfoSectionProps {
	form: GenericFormHandler<LeaseFormData>
}

export interface LeaseTermsSectionProps {
	form: GenericFormHandler<LeaseFormData>
}

export interface AdditionalTermsSectionProps {
	form: GenericFormHandler<LeaseFormData>
}

export interface PartiesInfoSectionProps {
	form: GenericFormHandler<LeaseFormData>
}

// Generic form handler interface - framework agnostic
export interface GenericFormHandler<T> {
	setValue: (field: keyof T, value: unknown) => void
	getValues: () => T
	watch: (field?: keyof T) => unknown
	register: (field: keyof T) => Record<string, unknown>
	formState: {
		errors: Record<string, { message?: string }>
		isValid: boolean
		isDirty: boolean
	}
}

// Additional types for lease generator functionality
export type LeaseGeneratorForm = LeaseFormData

export type LeaseOutputFormat = 'html' | 'pdf' | 'text' | 'docx' | 'both'

export interface LeaseGenerationResult {
	success: boolean
	content?: string
	downloadUrl?: string
	error?: string
}

export interface LeaseGeneratorUsage {
	id: string
	email: string
	ipAddress: string
	userAgent: string
	usageCount: number
	lastUsedAt: string
	createdAt: string
}

// Template data structure for lease generation
export interface LeaseTemplateData extends LeaseFormData {
	generatedAt: Date
	templateVersion: string
	stateRequirements?: StateLeaseRequirements
}

// State-specific lease requirements
export interface StateLeaseRequirements {
	state: string
	requiredClauses: string[]
	prohibitedClauses: string[]
	securityDepositLimit?: number
	noticePeriods: {
		terminationByLandlord: number
		terminationByTenant: number
		rentIncrease: number
	}
	mandatoryDisclosures: string[]
	lateFeeLimits?: {
		maxAmount?: number
		maxPercentage?: number
		gracePeriod: number
	}
}
