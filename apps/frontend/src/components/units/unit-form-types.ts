import type {
	FormValidateOrFn,
	FormAsyncValidateOrFn,
	ReactFormExtendedApi
} from '@tanstack/react-form'

/**
 * Form values for the unit create/edit form.
 * Defined once here and shared between unit-form.client.tsx and its field sub-components.
 */
export interface UnitFormValues {
	property_id: string
	unit_number: string
	bedrooms: string
	bathrooms: string
	square_feet: string
	rent_amount: string
	status: 'available' | 'occupied' | 'maintenance' | 'reserved'
}

/**
 * Typed form instance for the unit form.
 * The validator generics are widened to accept any validator combination
 * that the form is configured with.
 */
export type UnitFormApi = ReactFormExtendedApi<
	UnitFormValues,
	undefined | FormValidateOrFn<UnitFormValues>,
	undefined | FormValidateOrFn<UnitFormValues>,
	undefined | FormAsyncValidateOrFn<UnitFormValues>,
	undefined | FormValidateOrFn<UnitFormValues>,
	undefined | FormAsyncValidateOrFn<UnitFormValues>,
	undefined | FormValidateOrFn<UnitFormValues>,
	undefined | FormAsyncValidateOrFn<UnitFormValues>,
	undefined | FormValidateOrFn<UnitFormValues>,
	undefined | FormAsyncValidateOrFn<UnitFormValues>,
	undefined | FormAsyncValidateOrFn<UnitFormValues>,
	unknown
>
