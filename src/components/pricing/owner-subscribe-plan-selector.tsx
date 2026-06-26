"use client";

import { Lock, Mail, User } from "lucide-react";
import { withForm } from "#lib/forms/form-hook";
import { subscribeFormOptions } from "./owner-subscribe-form-options";

/**
 * Signup fields for the owner subscribe dialog. `withForm` injects a fully
 * typed `form` from the shared `subscribeFormOptions` — no hand-rolled form
 * type, no per-field annotations.
 */
export const SubscribeFormFields = withForm({
	...subscribeFormOptions,
	props: { isSubmitting: false },
	render: function SubscribeFormFields({ form, isSubmitting }) {
		return (
			<>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<form.AppField name="first_name">
						{(field) => (
							<field.IconInputField
								label="First name"
								icon={User}
								placeholder="Jamie"
								disabled={isSubmitting}
							/>
						)}
					</form.AppField>
					<form.AppField name="last_name">
						{(field) => (
							<field.IconInputField
								label="Last name"
								icon={User}
								placeholder="Rivera"
								disabled={isSubmitting}
							/>
						)}
					</form.AppField>
				</div>
				<form.AppField name="email">
					{(field) => (
						<field.IconInputField
							label="Work email"
							icon={Mail}
							type="email"
							placeholder="jamie@riverapm.com"
							disabled={isSubmitting}
						/>
					)}
				</form.AppField>
				<form.AppField name="password">
					{(field) => (
						<field.IconInputField
							label="Password"
							icon={Lock}
							type="password"
							placeholder="Create a password"
							autoComplete="new-password"
							disabled={isSubmitting}
						/>
					)}
				</form.AppField>
			</>
		);
	},
});
