"use client";

import { Building2, Home } from "lucide-react";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { withForm } from "#lib/forms/form-hook";
import type { Property, Unit } from "#types/core";
import { addTenantFormOptions } from "./add-tenant-form-options";

export const AddTenantPropertyFields = withForm({
	...addTenantFormOptions,
	props: {
		properties: [] as Property[],
		availableUnits: [] as Unit[],
		selectedPropertyId: "",
		onPropertyChange: (() => {}) as (propertyId: string) => void,
	},
	render: function AddTenantPropertyFields({
		form,
		properties,
		availableUnits,
		selectedPropertyId,
		onPropertyChange,
	}) {
		if (properties.length === 0) {
			return (
				<div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
					<Building2 className="size-8 mx-auto mb-2 opacity-50" />
					<p className="text-sm">
						No properties configured yet. You can still add tenants and assign
						them to properties later.
					</p>
				</div>
			);
		}

		return (
			<div className="space-y-4">
				<div className="flex items-center gap-2 typography-large">
					<Building2 className="size-5" />
					Property Assignment (Optional)
				</div>
				<p className="text-muted-foreground text-sm">
					Assign tenant to a property now, or skip and assign later when
					creating a lease.
				</p>

				{/* Property kept inline — per-item Home icons + the onValueChange that
				    fans out to handleChange + onPropertyChange + setFieldValue. */}
				<form.AppField name="property_id">
					{(field) => (
						<Field>
							<FieldLabel htmlFor="property_id">Property</FieldLabel>
							<Select
								value={field.state.value}
								onValueChange={(value) => {
									field.handleChange(value);
									onPropertyChange(value);
									form.setFieldValue("unit_id", "");
								}}
							>
								<SelectTrigger id="property_id">
									<SelectValue placeholder="Select a property (optional)" />
								</SelectTrigger>
								<SelectContent>
									{properties.map((property) => (
										<SelectItem key={property.id} value={property.id}>
											<div className="flex items-center gap-2">
												<Home className="size-4" />
												{property.name}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{field.state.meta.isTouched ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</Field>
					)}
				</form.AppField>

				{/* Only show unit field if property has multiple units */}
				{selectedPropertyId && availableUnits.length > 1 && (
					<form.AppField name="unit_id">
						{(field) => (
							<field.SelectField
								label="Unit (Optional)"
								placeholder="Select a unit"
								options={availableUnits.map((unit) => ({
									value: unit.id,
									label: unit.unit_number ?? "",
								}))}
							/>
						)}
					</form.AppField>
				)}

				{/* Show message for single-family homes */}
				{selectedPropertyId && availableUnits.length <= 1 && (
					<p className="text-muted-foreground text-sm">
						{availableUnits.length === 0
							? "This property has no units configured."
							: "Single-unit property - unit will be assigned automatically."}
					</p>
				)}
			</div>
		);
	},
});
