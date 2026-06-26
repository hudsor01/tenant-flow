import { formOptions } from "@tanstack/react-form";
import { signupFormSchema } from "#lib/validation/auth";

/**
 * Shared options for the owner subscribe / signup form. Spread into both
 * `useAppForm` (owner-subscribe-dialog) and `withForm` (SubscribeFormFields) so
 * the default values + validator live in one place and the section is auto-typed.
 */
export const subscribeFormOptions = formOptions({
	defaultValues: {
		first_name: "",
		last_name: "",
		email: "",
		password: "",
	},
	validators: { onSubmit: signupFormSchema },
});
