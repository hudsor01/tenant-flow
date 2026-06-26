"use client";

import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { withForm } from "#lib/forms/form-hook";
import { propertyFormOptions } from "../property-form-options";

const COUNTRY_OPTIONS = [
	{ value: "US", label: "United States" },
	{ value: "CA", label: "Canada" },
];

export const PropertyAddressSection = withForm({
	...propertyFormOptions,
	render: function PropertyAddressSection({ form }) {
		return (
			<>
				<form.AppField name="address_line1">
					{(field) => (
						<field.TextField
							label="Address *"
							autoComplete="street-address"
							placeholder="123 Main St"
						/>
					)}
				</form.AppField>

				<form.AppField name="address_line2">
					{(field) => (
						<field.TextField
							label="Address Line 2 (Optional)"
							placeholder="Apt, Suite, Unit, etc."
						/>
					)}
				</form.AppField>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<form.AppField name="city">
						{(field) => (
							<field.TextField
								label="City *"
								autoComplete="address-level2"
								placeholder="City"
							/>
						)}
					</form.AppField>

					{/* State uppercases as you type + caps at 2 chars — the form schema
					    only requires non-empty, so this input is the sole enforcer of
					    the 2-letter code. Kept inline (TanStack validators don't write
					    back a normalized value). */}
					<form.AppField name="state">
						{(field) => (
							<Field>
								<FieldLabel htmlFor="state">State *</FieldLabel>
								<Input
									id="state"
									name="state"
									autoComplete="address-level1"
									placeholder="CA"
									maxLength={2}
									value={field.state.value}
									onChange={(event) =>
										field.handleChange(event.target.value.toUpperCase())
									}
									onBlur={field.handleBlur}
								/>
								{field.state.meta.isTouched ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						)}
					</form.AppField>

					<form.AppField name="postal_code">
						{(field) => (
							<field.TextField
								label="ZIP Code *"
								autoComplete="postal-code"
								inputMode="numeric"
								placeholder="12345"
							/>
						)}
					</form.AppField>
				</div>

				<form.AppField name="country">
					{(field) => (
						<field.SelectField
							label="Country *"
							placeholder="Select country"
							options={COUNTRY_OPTIONS}
						/>
					)}
				</form.AppField>
			</>
		);
	},
});
