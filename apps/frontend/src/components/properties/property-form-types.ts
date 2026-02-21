import type { PropertyType } from '@repo/shared/types/core'
import type {
	FormValidateOrFn,
	FormAsyncValidateOrFn,
	ReactFormExtendedApi
} from '@tanstack/react-form'

/**
 * Form values for the property create/edit form.
 * Defined once here and shared between property-form.client.tsx and its field sub-components.
 */
export interface PropertyFormValues {
	name: string
	property_type: PropertyType
	address_line1: string
	address_line2: string
	city: string
	state: string
	postal_code: string
	country: string
	acquisition_cost: number | null
	acquisition_date: string
}

/**
 * Typed form instance for the property form.
 * The validator generics are widened to accept the onBlur/onSubmitAsync validators
 * that the form is configured with.
 */
export type PropertyFormApi = ReactFormExtendedApi<
	PropertyFormValues,
	undefined | FormValidateOrFn<PropertyFormValues>,
	undefined | FormValidateOrFn<PropertyFormValues>,
	undefined | FormAsyncValidateOrFn<PropertyFormValues>,
	undefined | FormValidateOrFn<PropertyFormValues>,
	undefined | FormAsyncValidateOrFn<PropertyFormValues>,
	undefined | FormValidateOrFn<PropertyFormValues>,
	undefined | FormAsyncValidateOrFn<PropertyFormValues>,
	undefined | FormValidateOrFn<PropertyFormValues>,
	undefined | FormAsyncValidateOrFn<PropertyFormValues>,
	undefined | FormAsyncValidateOrFn<PropertyFormValues>,
	unknown
>
