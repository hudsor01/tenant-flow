"use client";

import { PROPERTY_TYPE_LABELS } from "#lib/constants/status-types";
import { withForm } from "#lib/forms/form-hook";
import { propertyFormOptions } from "../property-form-options";

const PROPERTY_TYPE_OPTIONS = Object.entries(PROPERTY_TYPE_LABELS).map(
	([value, label]) => ({ value, label }),
);

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
