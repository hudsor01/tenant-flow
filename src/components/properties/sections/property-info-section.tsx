"use client";

import { withForm } from "#lib/forms/form-hook";
import { propertyFormOptions } from "../property-form-options";

const PROPERTY_TYPE_OPTIONS = [
	{ value: "SINGLE_FAMILY", label: "Single Family" },
	{ value: "MULTI_UNIT", label: "Multi Family" },
	{ value: "APARTMENT", label: "Apartment" },
	{ value: "COMMERCIAL", label: "Commercial" },
	{ value: "CONDO", label: "Condo" },
	{ value: "TOWNHOUSE", label: "Townhouse" },
	{ value: "OTHER", label: "Other" },
];

export const PropertyInfoSection = withForm({
	...propertyFormOptions,
	render: function PropertyInfoSection({ form }) {
		return (
			<>
				<form.AppField name="name">
					{(field) => (
						<field.TextField
							label="Property Name *"
							autoComplete="organization"
							autoFocus
							placeholder="e.g. Sunset Apartments"
						/>
					)}
				</form.AppField>

				<form.AppField name="property_type">
					{(field) => (
						<field.SelectField
							label="Property Type *"
							placeholder="Select property type"
							options={PROPERTY_TYPE_OPTIONS}
						/>
					)}
				</form.AppField>
			</>
		);
	},
});
