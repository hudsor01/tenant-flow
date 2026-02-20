import type {
	FormValidateOrFn,
	FormAsyncValidateOrFn,
	ReactFormExtendedApi
} from '@tanstack/react-form'

/**
 * Form values for the lease create/edit form.
 * Defined once here and shared between lease-form.tsx and its field sub-components.
 */
export interface LeaseFormValues {
	unit_id: string
	primary_tenant_id: string
	start_date: string
	end_date: string
	rent_amount: number
	security_deposit: number
	rent_currency: string
	payment_day: number
	lease_status: string
}

/**
 * Typed form instance for the lease form.
 * The validator generics are widened to accept the onBlur/onSubmitAsync validators
 * that the form is configured with.
 */
export type LeaseFormApi = ReactFormExtendedApi<
	LeaseFormValues,
	undefined | FormValidateOrFn<LeaseFormValues>,
	undefined | FormValidateOrFn<LeaseFormValues>,
	undefined | FormAsyncValidateOrFn<LeaseFormValues>,
	undefined | FormValidateOrFn<LeaseFormValues>,
	undefined | FormAsyncValidateOrFn<LeaseFormValues>,
	undefined | FormValidateOrFn<LeaseFormValues>,
	undefined | FormAsyncValidateOrFn<LeaseFormValues>,
	undefined | FormValidateOrFn<LeaseFormValues>,
	undefined | FormAsyncValidateOrFn<LeaseFormValues>,
	undefined | FormAsyncValidateOrFn<LeaseFormValues>,
	unknown
>
