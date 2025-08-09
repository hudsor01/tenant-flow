import { atom } from 'jotai'
import type { PropertyFormData } from '@repo/shared'

export interface PropertyFormState {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  type: string
  propertyType?: string
  units: number
  [key: string]: unknown
}

export interface PropertyFormDataExtended extends PropertyFormData {
  isEditing: boolean
  isDirty: boolean
  validationErrors: Record<string, string>
}

export const propertyFormAtom = atom<PropertyFormState>({
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  type: 'residential',
  units: 1,
})

export const propertyFormErrorsAtom = atom<Record<string, string>>({})

export const propertyFormDirtyAtom = atom<boolean>(false)

export const propertyFormSubmittingAtom = atom<boolean>(false)