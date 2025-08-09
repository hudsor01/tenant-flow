import { atomWithImmer } from 'jotai-immer'
import { atomWithReset } from 'jotai/utils'
import { atom } from 'jotai'
import type { CreatePropertyInput, UpdatePropertyInput, CreateTenantInput } from '@repo/shared'

export interface PropertyFormState extends Partial<CreatePropertyInput> {
  // Form-specific fields
  isEditing: boolean
  validationErrors: Record<string, string>
  isDirty: boolean
}

export interface TenantFormState extends Partial<CreateTenantInput> {
  // Form-specific fields
  propertyId?: string
  unitId?: string
  leaseStartDate?: string
  leaseEndDate?: string
  monthlyRent?: number
  securityDeposit?: number
  isEditing: boolean
  validationErrors: Record<string, string>
  isDirty: boolean
}

// Property form atom with Immer for complex nested updates
export const propertyFormAtom = atomWithImmer<PropertyFormState>({
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  propertyType: 'SINGLE_FAMILY',
  units: [],
  isEditing: false,
  validationErrors: {},
  isDirty: false,
})

// Tenant form atom with Immer
export const tenantFormAtom = atomWithImmer<TenantFormState>({
  name: '',
  email: '',
  phone: '',
  emergencyContact: '',
  propertyId: '',
  unitId: '',
  leaseStartDate: '',
  leaseEndDate: '',
  monthlyRent: 0,
  securityDeposit: 0,
  isEditing: false,
  validationErrors: {},
  isDirty: false,
})

// Reset atoms for clearing forms
export const resetPropertyFormAtom = atomWithReset(propertyFormAtom)
export const resetTenantFormAtom = atomWithReset(tenantFormAtom)

// Validation atoms
export const propertyFormValidAtom = atom((get) => {
  const form = get(propertyFormAtom)
  return Object.keys(form.validationErrors).length === 0 && 
         form.name?.trim() && 
         form.address?.trim()
})

export const tenantFormValidAtom = atom((get) => {
  const form = get(tenantFormAtom)
  return Object.keys(form.validationErrors).length === 0 && 
         form.name?.trim() && 
         form.email?.trim()
})

// Form actions using Immer's draft state
export const setPropertyFormFieldAtom = atom(
  null,
  (get, set, field: keyof PropertyFormState, value: unknown) => {
    set(propertyFormAtom, (draft) => {
      ;(draft as PropertyFormState)[field] = value as PropertyFormState[typeof field]
      draft.isDirty = true
      
      // Clear validation error for this field
      if (draft.validationErrors[field]) {
        delete draft.validationErrors[field]
      }
    })
  }
)

export const setPropertyFormErrorAtom = atom(
  null,
  (get, set, field: string, error: string) => {
    set(propertyFormAtom, (draft) => {
      draft.validationErrors[field] = error
    })
  }
)

export const clearPropertyFormErrorsAtom = atom(
  null,
  (get, set) => {
    set(propertyFormAtom, (draft) => {
      draft.validationErrors = {}
    })
  }
)

export const setTenantFormFieldAtom = atom(
  null,
  (get, set, field: keyof TenantFormState, value: string | number | boolean) => {
    set(tenantFormAtom, (draft) => {
      // Use type assertion for the draft assignment
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        (draft as Record<string, unknown>)[field] = value
      }
      draft.isDirty = true
      
      // Clear validation error for this field
      if (draft.validationErrors[field]) {
        delete draft.validationErrors[field]
      }
    })
  }
)

export const populatePropertyFormAtom = atom(
  null,
  (get, set, propertyData: Partial<CreatePropertyInput & UpdatePropertyInput>) => {
    set(propertyFormAtom, (draft) => {
      Object.assign(draft, propertyData)
      draft.isEditing = true
      draft.isDirty = false
      draft.validationErrors = {}
    })
  }
)

export const populateTenantFormAtom = atom(
  null,
  (get, set, tenantData: Partial<TenantFormState>) => {
    set(tenantFormAtom, (draft) => {
      Object.assign(draft, tenantData)
      draft.isEditing = true
      draft.isDirty = false
      draft.validationErrors = {}
    })
  }
)