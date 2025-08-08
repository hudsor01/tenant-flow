/**
 * Lease Generator Form with Multi-Step Wizard
 * Uses jotai-form with history for complex wizard state
 */
import { atom } from 'jotai'
// TODO: Fix jotai-form integration - using atomWithFormControls instead of atomWithForm
// import { atomWithFormControls } from 'jotai-form'
// import { withHistory } from 'jotai-history'
import { z } from 'zod'

// Lease form steps
export const LEASE_STEPS = [
  { id: 'property', title: 'Property Details', description: 'Property information' },
  { id: 'parties', title: 'Parties', description: 'Landlord and tenant details' },
  { id: 'terms', title: 'Lease Terms', description: 'Rent and duration' },
  { id: 'policies', title: 'Policies', description: 'Rules and policies' },
  { id: 'review', title: 'Review', description: 'Review and generate' },
] as const

export type LeaseStep = typeof LEASE_STEPS[number]['id']

// Comprehensive lease form schema
export const leaseFormSchema = z.object({
  // Property Information
  propertyAddress: z.string().min(1, 'Address required'),
  unitNumber: z.string().optional(),
  city: z.string().min(1, 'City required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP'),
  propertyType: z.enum(['SINGLE_FAMILY', 'APARTMENT', 'CONDO', 'TOWNHOUSE']),
  bedrooms: z.number().min(0).max(10),
  bathrooms: z.number().min(0).max(10),
  squareFootage: z.number().min(0).optional(),
  parkingSpaces: z.number().min(0).optional(),
  
  // Landlord Information
  landlordName: z.string().min(1, 'Landlord name required'),
  landlordAddress: z.string().min(1, 'Landlord address required'),
  landlordCity: z.string().min(1),
  landlordState: z.string().length(2),
  landlordZip: z.string().regex(/^\d{5}(-\d{4})?$/),
  landlordPhone: z.string().min(10, 'Valid phone required'),
  landlordEmail: z.string().email('Valid email required'),
  
  // Tenant Information
  tenantNames: z.array(z.string().min(1)).min(1, 'At least one tenant required'),
  tenantEmails: z.array(z.string().email()).min(1),
  tenantPhones: z.array(z.string()).min(1),
  
  // Lease Terms
  leaseStartDate: z.string().min(1, 'Start date required'),
  leaseEndDate: z.string().min(1, 'End date required'),
  monthlyRent: z.number().min(0, 'Rent must be positive'),
  securityDeposit: z.number().min(0),
  petDeposit: z.number().min(0).optional(),
  paymentDueDay: z.number().min(1).max(31),
  lateFeeAmount: z.number().min(0),
  lateFeeGracePeriod: z.number().min(0).max(30),
  
  // Policies
  petsAllowed: z.boolean(),
  petTypes: z.array(z.string()).optional(),
  maxPets: z.number().min(0).max(10).optional(),
  smokingAllowed: z.boolean(),
  utilitiesIncluded: z.array(z.enum(['WATER', 'ELECTRICITY', 'GAS', 'TRASH', 'INTERNET'])),
  
  // Additional Terms
  additionalTerms: z.string().optional(),
  specialClauses: z.array(z.string()).optional(),
})

export type LeaseFormData = z.infer<typeof leaseFormSchema>

// Default lease form values
export const defaultLeaseForm: LeaseFormData = {
  propertyAddress: '',
  unitNumber: '',
  city: '',
  state: '',
  zipCode: '',
  propertyType: 'SINGLE_FAMILY',
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
  
  leaseStartDate: '',
  leaseEndDate: '',
  monthlyRent: 0,
  securityDeposit: 0,
  petDeposit: 0,
  paymentDueDay: 1,
  lateFeeAmount: 50,
  lateFeeGracePeriod: 5,
  
  petsAllowed: false,
  petTypes: [],
  maxPets: 0,
  smokingAllowed: false,
  utilitiesIncluded: [],
  
  additionalTerms: '',
  specialClauses: [],
}

// Current wizard step atom
export const currentStepAtom = atom<LeaseStep>('property')

// Step validation status
export const stepValidationAtom = atom<Record<LeaseStep, boolean>>({
  property: false,
  parties: false,
  terms: false,
  policies: false,
  review: false,
})

// TODO: Implement lease form atom with proper jotai-form integration
// Main lease form atom with validation
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

// TODO: Add history for undo/redo in wizard
// export const leaseFormHistoryAtom = atomWithHistory({
//   defaultValue: defaultLeaseForm,
//   limit: 30, // More history for complex form
// })

// Wizard progress atom (0-100%)
export const wizardProgressAtom = atom(
  (get) => {
    const currentStep = get(currentStepAtom)
    const stepIndex = LEASE_STEPS.findIndex(s => s.id === currentStep)
    return Math.round((stepIndex / (LEASE_STEPS.length - 1)) * 100)
  }
)

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