// Form-related types and interfaces
import type { Lease, Property } from '@tenantflow/shared'

export interface UseLeaseFormProps {
	lease?: Lease
	mode?: 'create' | 'edit'
	propertyId?: string
	unitId?: string
	tenantId?: string
	onSuccess: () => void
	onClose: () => void
}

export interface PropertyFormData {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	imageUrl?: string
	description?: string
	propertyType?: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
	hasGarage?: boolean
	hasPool?: boolean
	numberOfUnits?: number
	createUnitsNow?: boolean
}

export interface UsePropertyFormDataProps {
	property?: Property
	mode: 'create' | 'edit'
	isOpen: boolean
}

export interface FormFieldContextValue<
	TFieldValues extends Record<string, unknown> = Record<string, unknown>,
	TName extends keyof TFieldValues = keyof TFieldValues
> {
	name: TName
}

export interface FormItemContextValue {
	id: string
}
