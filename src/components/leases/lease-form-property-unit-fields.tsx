"use client";

import { Field, FieldLabel } from "#components/ui/field";
import { LoadingSpinner } from "#components/ui/loading-spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { withForm } from "#lib/forms/form-hook";
import type { Property, Unit } from "#types/core";
import { leaseFormOptions } from "./lease-form-options";

export const LeaseFormPropertyUnitFields = withForm({
	...leaseFormOptions,
	props: {
		properties: [] as Property[],
		propertiesIsLoading: false,
		propertiesIsError: false,
		propertiesError: null as Error | null,
		units: [] as Unit[],
		unitsIsError: false,
		unitsError: null as Error | null,
		selectedPropertyId: "",
		onPropertyChange: (() => {}) as (propertyId: string) => void,
	},
	render: function LeaseFormPropertyUnitFields({
		form,
		properties,
		propertiesIsLoading,
		propertiesIsError,
		propertiesError,
		units,
		unitsIsError,
		unitsError,
		selectedPropertyId,
		onPropertyChange,
	}) {
		const unitOptions = units.map((unit) => ({
			value: unit.id,
			label: unit.unit_number ?? "",
		}));
		return (
			<>
				{/* Property Selection (for filtering units, not stored in lease) */}
				<div className="grid gap-4 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="property-select">Property *</FieldLabel>
						<Select
							value={selectedPropertyId}
							onValueChange={(value) => {
								onPropertyChange(value);
								form.setFieldValue("unit_id", "");
							}}
							disabled={propertiesIsError}
						>
							<SelectTrigger id="property-select">
								<SelectValue placeholder="Select property" />
							</SelectTrigger>
							<SelectContent>
								{propertiesIsLoading ? (
									<div className="flex-center p-4">
										<LoadingSpinner size="sm" />
									</div>
								) : properties.length === 0 ? (
									<div className="flex-center p-4 text-muted-foreground">
										No properties available
									</div>
								) : (
									properties.map((property) => (
										<SelectItem key={property.id} value={property.id}>
											{property.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</Field>

					{propertiesIsError && (
						<p className="text-sm text-destructive-text mt-2">
							Failed to load properties
							{propertiesError ? `: ${propertiesError.message}` : ""}. Please
							refresh to retry.
						</p>
					)}
				</div>

				{unitsIsError && (
					<p className="text-sm text-destructive-text mt-2">
						Failed to load units for the selected property.
						{unitsError ? ` ${unitsError.message}` : ""} Please retry.
					</p>
				)}

				<form.AppField name="unit_id">
					{(field) => (
						<field.SelectField
							label="Unit *"
							placeholder="Select unit"
							options={unitOptions}
							disabled={!selectedPropertyId}
						/>
					)}
				</form.AppField>
			</>
		);
	},
});
