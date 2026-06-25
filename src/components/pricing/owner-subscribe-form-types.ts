import type {
	FormAsyncValidateOrFn,
	FormValidateOrFn,
	ReactFormExtendedApi,
} from "@tanstack/react-form";
import type { z } from "zod";
import type { signupFormSchema } from "#lib/validation/auth";

/**
 * Form values for the owner subscribe / signup dialog. Derived from the Zod
 * schema the form validates against so the value shape and validator can never
 * drift apart.
 */
export type SubscribeFormValues = z.infer<typeof signupFormSchema>;

/**
 * Typed form instance for the subscribe dialog (mirrors PropertyFormApi).
 * Consumed by the extracted SubscribeFormFields section; the dialog's own
 * `useForm` instance is inferred structurally and must stay assignable to this
 * type. Unused validator slots are widened to accept either an unset validator
 * or one added later; the onSubmit slot is pinned to the schema the form is
 * actually configured with (`validators.onSubmit`) so that assignment holds.
 */
export type SubscribeFormApi = ReactFormExtendedApi<
	SubscribeFormValues, // TFormData
	undefined | FormValidateOrFn<SubscribeFormValues>, // TOnMount
	undefined | FormValidateOrFn<SubscribeFormValues>, // TOnChange
	undefined | FormAsyncValidateOrFn<SubscribeFormValues>, // TOnChangeAsync
	undefined | FormValidateOrFn<SubscribeFormValues>, // TOnBlur
	undefined | FormAsyncValidateOrFn<SubscribeFormValues>, // TOnBlurAsync
	typeof signupFormSchema, // TOnSubmit
	undefined | FormAsyncValidateOrFn<SubscribeFormValues>, // TOnSubmitAsync
	undefined | FormValidateOrFn<SubscribeFormValues>, // TOnDynamic
	undefined | FormAsyncValidateOrFn<SubscribeFormValues>, // TOnDynamicAsync
	undefined | FormAsyncValidateOrFn<SubscribeFormValues>, // TOnServer
	unknown // TSubmitMeta
>;
