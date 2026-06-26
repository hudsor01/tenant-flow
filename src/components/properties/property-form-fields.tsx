"use client";

import { withForm } from "#lib/forms/form-hook";
import { propertyFormOptions } from "./property-form-options";

export const AcquisitionDetailsSection = withForm({
	...propertyFormOptions,
	render: function AcquisitionDetailsSection({ form }) {
		return (
			<div className="space-y-4 border rounded-lg p-6">
				<div>
					<h3 className="text-sm font-medium">Acquisition Details</h3>
					<p className="text-xs text-muted-foreground mt-1">
						Optional. Used for accurate depreciation calculations in your tax
						documents.
					</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<form.AppField name="acquisition_cost">
						{(field) => (
							<field.NumberField
								label="Purchase Price"
								step="0.01"
								min="0"
								placeholder="e.g. 250000"
							/>
						)}
					</form.AppField>
					<form.AppField name="acquisition_date">
						{(field) => <field.DateField label="Purchase Date" />}
					</form.AppField>
				</div>
			</div>
		);
	},
});
