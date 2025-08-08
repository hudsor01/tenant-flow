/**
 * Property Form Atom with validation and history
 * Uses jotai-form for complex form state management
 */
// TODO: Fix jotai-form integration
// import { atomWithFormControls } from 'jotai-form'
// import { withHistory } from 'jotai-history'
import { atom } from 'jotai'
import { z } from 'zod'

// Property form schema
export const propertyFormSchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  propertyType: z.enum(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL']),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(10),
  squareFootage: z.number().min(0).optional(),
  monthlyRent: z.number().min(0),
  securityDeposit: z.number().min(0),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
})

export type PropertyFormData = z.infer<typeof propertyFormSchema>

// Default values for new property
export const defaultPropertyForm: PropertyFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  propertyType: 'SINGLE_FAMILY',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: undefined,
  monthlyRent: 0,
  securityDeposit: 0,
  description: '',
  amenities: [],
  images: [],
}

// TODO: Implement property form atom with proper jotai-form integration  
// Main property form atom with validation
// export const propertyFormAtom = atomWithForm({
//   defaultValue: defaultPropertyForm,
//   validate: (values) => {
//     try {
//       propertyFormSchema.parse(values)
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
//   onSubmit: async (values) => {
//     // This will be connected to your API
//     console.log('Submitting property:', values)
//     // Return API response
//   }
// })

// TODO: Add history tracking for undo/redo
// export const propertyFormWithHistoryAtom = atomWithHistory({
//   defaultValue: defaultPropertyForm,
//   limit: 20, // Keep last 20 states
// })

// TODO: Atom for tracking form dirty state
// export const propertyFormDirtyAtom = atomWithForm({
//   defaultValue: false,
//   // Will be true when form has unsaved changes
// })

// TODO: Atom for form submission state  
// export const propertyFormSubmittingAtom = atomWithForm({
//   defaultValue: false,
//   // Will be true during form submission
// })

// Simple placeholder atoms for build - will be implemented properly later
export const propertyFormAtom = atom<PropertyFormData>(defaultPropertyForm)
export const propertyFormDirtyAtom = atom<boolean>(false)
export const propertyFormSubmittingAtom = atom<boolean>(false)