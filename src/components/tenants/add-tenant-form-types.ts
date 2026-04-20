import type {
	FormValidateOrFn,
	FormAsyncValidateOrFn,
	ReactFormExtendedApi
} from '@tanstack/react-form'

/**
 * Form values for the add tenant form.
 */
export interface AddTenantFormValues {
	email: string
	first_name: string
	last_name: string
	phone: string
	property_id: string
	unit_id: string
}

/**
 * Typed form API instance for the add tenant form.
 * The validator generics are widened to accept field-level validators
 * passed via addTenantSchema.shape.* in form.Field validators.
 */
export type AddTenantFormApi = ReactFormExtendedApi<
	AddTenantFormValues,
	undefined | FormValidateOrFn<AddTenantFormValues>,
	undefined | FormValidateOrFn<AddTenantFormValues>,
	undefined | FormAsyncValidateOrFn<AddTenantFormValues>,
	undefined | FormValidateOrFn<AddTenantFormValues>,
	undefined | FormAsyncValidateOrFn<AddTenantFormValues>,
	undefined | FormValidateOrFn<AddTenantFormValues>,
	undefined | FormAsyncValidateOrFn<AddTenantFormValues>,
	undefined | FormValidateOrFn<AddTenantFormValues>,
	undefined | FormAsyncValidateOrFn<AddTenantFormValues>,
	undefined | FormAsyncValidateOrFn<AddTenantFormValues>,
	unknown
>
