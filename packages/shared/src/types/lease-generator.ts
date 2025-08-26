/**
 * Lease Generator types (consolidated from apps/frontend/src/components/lease-generator/types)
 * These are frontend domain-specific types that should be accessible from shared package
 */

import { z } from 'zod'
import { requiredString } from '../validation/common'
// Remove frontend-specific dependency - use generic form type instead

export const leaseFormSchema = z.object({
	// Property Information
<<<<<<< HEAD
	propertyAddress: requiredString,
	city: requiredString,
=======
	propertyAddress: z.string().min(1, 'Property address is required'),
	city: z.string().min(1, 'City is required'),
>>>>>>> origin/main
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
<<<<<<< HEAD
	landlordName: requiredString,
	landlordEmail: z.string().email('Valid email is required'),
	landlordPhone: z.string().optional(),
	landlordAddress: requiredString,
=======
	landlordName: z.string().min(1, 'Landlord name is required'),
	landlordEmail: z.string().email('Valid email is required'),
	landlordPhone: z.string().optional(),
	landlordAddress: z.string().min(1, 'Landlord address is required'),
>>>>>>> origin/main

	// Tenant Information
	tenantNames: z
		.array(z.object({ name: z.string() }))
		.min(1, 'At least one tenant is required'),

	// Lease Terms
<<<<<<< HEAD
	leaseStartDate: requiredString,
	leaseEndDate: requiredString,
=======
	leaseStartDate: z.string().min(1, 'Lease start date is required'),
	leaseEndDate: z.string().min(1, 'Lease end date is required'),
>>>>>>> origin/main
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
<<<<<<< HEAD
	form: GenericFormHandler<LeaseFormData>
=======
	form: UseFormReturn<LeaseFormData>
>>>>>>> origin/main
	supportedStates: string[]
}

export interface TenantInfoSectionProps {
<<<<<<< HEAD
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
=======
	form: UseFormReturn<LeaseFormData>
}

export interface LeaseTermsSectionProps {
	form: UseFormReturn<LeaseFormData>
}

export interface AdditionalTermsSectionProps {
	form: UseFormReturn<LeaseFormData>
}

export interface PartiesInfoSectionProps {
	form: UseFormReturn<LeaseFormData>
>>>>>>> origin/main
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
