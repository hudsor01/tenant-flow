import { atom } from 'jotai'

export interface PropertyFormState {
  name: string
  address: string
  type: string
  units: number
  [key: string]: unknown
}

export interface PropertyFormData extends PropertyFormState {
  isEditing: boolean
  isDirty: boolean
  validationErrors: Record<string, string>
}

export const propertyFormAtom = atom<PropertyFormState>({
  name: '',
  address: '',
  type: 'residential',
  units: 1,
})

export const propertyFormErrorsAtom = atom<Record<string, string>>({})

export const propertyFormDirtyAtom = atom<boolean>(false)

export const propertyFormSubmittingAtom = atom<boolean>(false)