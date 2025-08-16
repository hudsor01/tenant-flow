/**
 * Lease Generator Form with Multi-Step Wizard
 * Uses jotai-form with history for complex wizard state
 */
import { atom } from 'jotai'
// Note: jotai-form integration pending library update
// Will use atomWithFormControls when available
import { z } from 'zod'
import { leaseSchema } from '@repo/shared/validation/leases'

// Lease form steps
export const LEASE_STEPS = [
	{
		id: 'property',
		title: 'Property Details',
		description: 'Property information'
	},
	{
		id: 'parties',
		title: 'Parties',
		description: 'Landlord and tenant details'
	},
	{ id: 'terms', title: 'Lease Terms', description: 'Rent and duration' },
	{ id: 'policies', title: 'Policies', description: 'Rules and policies' },
	{ id: 'review', title: 'Review', description: 'Review and generate' }
] as const

export type LeaseStep = (typeof LEASE_STEPS)[number]['id']

// Extended lease form schema for wizard - extends shared schema with UI-specific fields
export const leaseFormSchema = leaseSchema.extend({
	// Property Information (additional UI fields)
	propertyAddress: z.string().min(1, 'Address required'),
	city: z.string().min(1, 'City required'),
	state: z.string().length(2, 'State must be 2 characters'),
	zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP'),
	bedrooms: z.number().min(0).max(10),
	bathrooms: z.number().min(0).max(10),
	squareFootage: z.number().min(0).optional(),
	parkingSpaces: z.number().min(0).optional(),

	// Landlord Information (wizard-specific)
	landlordName: z.string().min(1, 'Landlord name required'),
	landlordAddress: z.string().min(1, 'Landlord address required'),
	landlordCity: z.string().min(1),
	landlordState: z.string().length(2),
	landlordZip: z.string().regex(/^\d{5}(-\d{4})?$/),
	landlordPhone: z.string().min(10, 'Valid phone required'),
	landlordEmail: z.string().email('Valid email required'),

	// Tenant Information (wizard-specific multi-tenant support)
	tenantNames: z
		.array(z.string().min(1))
		.min(1, 'At least one tenant required'),
	tenantEmails: z.array(z.string().email()).min(1),
	tenantPhones: z.array(z.string()).min(1),

	// Additional Lease Terms (wizard-specific)
	petDeposit: z.number().min(0).optional(),
	paymentDueDay: z.number().min(1).max(31),
	lateFeeAmount: z.number().min(0),
	lateFeeGracePeriod: z.number().min(0).max(30),

	// Policy Details (wizard-specific)
	petsAllowed: z.boolean(),
	petTypes: z.array(z.string()).optional(),
	maxPets: z.number().min(0).max(10).optional(),
	utilitiesIncluded: z.array(
		z.enum(['WATER', 'ELECTRICITY', 'GAS', 'TRASH', 'INTERNET'])
	),

	// Document Generation (wizard-specific)
	specialClauses: z.array(z.string()).optional()
})

export type LeaseFormData = z.infer<typeof leaseFormSchema>

// Default lease form values
export const defaultLeaseForm: LeaseFormData = {
	// Required fields from shared schema
	propertyId: '',
	unitId: null,
	tenantId: '',
	startDate: '',
	endDate: '',
	monthlyRent: 0,
	securityDeposit: 0,
	status: 'DRAFT' as const,

	// Optional fields from schema
	leaseTerm: 12,
	leaseType: 'FIXED' as const,
	petPolicy: '',
	smokingPolicy: 'NOT_ALLOWED' as const,
	utilities: [],
	additionalTerms: '',

	// Required wizard UI fields
	propertyAddress: '',
	city: '',
	state: '',
	zipCode: '',
	bedrooms: 3,
	bathrooms: 2,
	squareFootage: undefined,
	parkingSpaces: 2,

	landlordName: '',
	landlordAddress: '',
	landlordCity: '',
	landlordState: '',
	landlordZip: '',
	landlordPhone: '',
	landlordEmail: '',

	tenantNames: [''],
	tenantEmails: [''],
	tenantPhones: [''],

	petDeposit: 0,
	paymentDueDay: 1,
	lateFeeAmount: 50,
	lateFeeGracePeriod: 5,

	petsAllowed: false,
	petTypes: [],
	maxPets: 0,
	utilitiesIncluded: [],

	specialClauses: []
}

// Current wizard step atom
export const currentStepAtom = atom<LeaseStep>('property')

// Step validation status
export const stepValidationAtom = atom<Record<LeaseStep, boolean>>({
	property: false,
	parties: false,
	terms: false,
	policies: false,
	review: false
})

// Lease form atom with validation (jotai-form integration pending)
// export const leaseFormAtom = atomWithForm({
//   defaultValue: defaultLeaseForm,
//   validate: (values) => {
//     try {
//       leaseFormSchema.parse(values)
//       return {}
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         return error.errors.reduce((acc, err) => ({
//           ...acc,
//           [err.path.join('.')]: err.message
//         }), {})
//       }
//       return {}
//     }
//   },
// })

// History for undo/redo in wizard (pending jotai-history integration)
// export const leaseFormHistoryAtom = atomWithHistory({
//   defaultValue: defaultLeaseForm,
//   limit: 30, // More history for complex form
// })

// Wizard progress atom (0-100%)
export const wizardProgressAtom = atom(get => {
	const currentStep = get(currentStepAtom)
	const stepIndex = LEASE_STEPS.findIndex(s => s.id === currentStep)
	return Math.round((stepIndex / (LEASE_STEPS.length - 1)) * 100)
})

// Form dirty state
export const leaseFormDirtyAtom = atom(false)

// PDF generation state
export const pdfGeneratingAtom = atom(false)

// Generated lease document
export const generatedLeaseAtom = atom<{
	pdfUrl?: string
	docxUrl?: string
	previewHtml?: string
} | null>(null)
