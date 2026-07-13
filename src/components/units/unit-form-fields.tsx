"use client";

import { DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "#components/ui/button";
import { withForm } from "#lib/forms/form-hook";
import { cn } from "#lib/utils";
import { unitFormOptions } from "./unit-form-options";

interface Property {
	id: string;
	name: string;
}

const STATUS_OPTIONS = [
	{ value: "available", label: "Vacant" },
	{ value: "occupied", label: "Occupied" },
	{ value: "maintenance", label: "Maintenance" },
	{ value: "reserved", label: "Reserved" },
];

export const UnitFormFields = withForm({
	...unitFormOptions,
	props: {
		properties: undefined as Property[] | undefined,
		mode: "create" as "create" | "edit",
		isSubmitting: false,
		isAuthLoading: false,
	},
	render: function UnitFormFields({
		form,
		properties,
		mode,
		isSubmitting,
		isAuthLoading,
	}) {
		const router = useRouter();
		const propertyOptions =
			properties?.map((property) => ({
				value: property.id,
				label: property.name,
			})) ?? [];
		return (
			<>
				<div className="grid gap-4 md:grid-cols-2">
					<form.AppField name="property_id">
						{(field) => (
							<field.SelectField
								label="Property *"
								placeholder="Select a property"
								options={propertyOptions}
							/>
						)}
					</form.AppField>

					<form.AppField name="unit_number">
						{(field) => (
							<field.TextField
								label="Unit Number *"
								placeholder="e.g., 101, A1"
							/>
						)}
					</form.AppField>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<form.AppField name="bedrooms">
						{(field) => (
							<field.TextField label="Bedrooms *" type="number" min="0" />
						)}
					</form.AppField>

					<form.AppField name="bathrooms">
						{(field) => (
							<field.TextField
								label="Bathrooms *"
								type="number"
								min="0"
								step="0.5"
							/>
						)}
					</form.AppField>

					<form.AppField name="square_feet">
						{(field) => (
							<field.TextField
								label="Square Feet"
								type="number"
								min="0"
								placeholder="Optional"
							/>
						)}
					</form.AppField>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<form.AppField name="rent_amount">
						{(field) => (
							<field.IconInputField
								label="Monthly Rent *"
								icon={DollarSign}
								type="number"
								min="0"
								step="1"
								placeholder="0"
							/>
						)}
					</form.AppField>

					<form.AppField name="status">
						{(field) => (
							<field.SelectField label="Status *" options={STATUS_OPTIONS} />
						)}
					</form.AppField>
				</div>

				<div className="flex justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={isSubmitting || isAuthLoading}
						className={cn(isAuthLoading && "animate-pulse")}
					>
						{isSubmitting
							? mode === "create"
								? "Creating..."
								: "Saving..."
							: mode === "create"
								? "Create Unit"
								: "Save Changes"}
					</Button>
				</div>
			</>
		);
	},
});
