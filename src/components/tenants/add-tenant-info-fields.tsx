"use client";

import { Mail, Phone, User } from "lucide-react";
import { withForm } from "#lib/forms/form-hook";
import { optionalPhoneSchema } from "#lib/validation/common";
import { addTenantSchema } from "#lib/validation/tenants";
import { addTenantFormOptions } from "./add-tenant-form-options";

export const AddTenantInfoFields = withForm({
	...addTenantFormOptions,
	render: function AddTenantInfoFields({ form }) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-2 typography-large">
					<User className="size-5" />
					Tenant Information
				</div>

				<div className="grid grid-cols-2 gap-4">
					<form.AppField
						name="first_name"
						validators={{ onChange: addTenantSchema.shape.first_name }}
					>
						{(field) => (
							<field.IconInputField
								label="First Name"
								icon={User}
								placeholder="John"
							/>
						)}
					</form.AppField>

					<form.AppField
						name="last_name"
						validators={{ onChange: addTenantSchema.shape.last_name }}
					>
						{(field) => (
							<field.IconInputField
								label="Last Name"
								icon={User}
								placeholder="Smith"
							/>
						)}
					</form.AppField>
				</div>

				<form.AppField
					name="email"
					validators={{ onChange: addTenantSchema.shape.email }}
				>
					{(field) => (
						<field.IconInputField
							label="Email Address"
							icon={Mail}
							type="email"
							autoFocus
							description="Used for lease records and payment receipts"
							placeholder="john.smith@example.com"
						/>
					)}
				</form.AppField>

				{/* FORM-19: optionalPhoneSchema accepts "" OR a valid phone — do NOT
				    attach addTenantSchema.shape.phone (phoneSchema.optional()), which
				    runs .min(10) on the empty string and breaks optional entry. */}
				<form.AppField
					name="phone"
					validators={{ onChange: optionalPhoneSchema }}
				>
					{(field) => (
						<field.IconInputField
							label="Phone Number (Optional)"
							icon={Phone}
							type="tel"
							placeholder="(555) 123-4567"
						/>
					)}
				</form.AppField>
			</div>
		);
	},
});
