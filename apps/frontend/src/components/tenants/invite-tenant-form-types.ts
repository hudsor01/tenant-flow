import type {
	FormValidateOrFn,
	FormAsyncValidateOrFn,
	ReactFormExtendedApi
} from '@tanstack/react-form'

/**
 * Form values for the invite tenant form.
 */
export interface InviteTenantFormValues {
	email: string
	first_name: string
	last_name: string
	phone: string
	property_id: string
	unit_id: string
}

/**
 * Typed form API instance for the invite tenant form.
 * The validator generics are widened to accept field-level validators
 * passed via inviteTenantSchema.shape.* in form.Field validators.
 */
export type InviteTenantFormApi = ReactFormExtendedApi<
	InviteTenantFormValues,
	undefined | FormValidateOrFn<InviteTenantFormValues>,
	undefined | FormValidateOrFn<InviteTenantFormValues>,
	undefined | FormAsyncValidateOrFn<InviteTenantFormValues>,
	undefined | FormValidateOrFn<InviteTenantFormValues>,
	undefined | FormAsyncValidateOrFn<InviteTenantFormValues>,
	undefined | FormValidateOrFn<InviteTenantFormValues>,
	undefined | FormAsyncValidateOrFn<InviteTenantFormValues>,
	undefined | FormValidateOrFn<InviteTenantFormValues>,
	undefined | FormAsyncValidateOrFn<InviteTenantFormValues>,
	undefined | FormAsyncValidateOrFn<InviteTenantFormValues>,
	unknown
>
