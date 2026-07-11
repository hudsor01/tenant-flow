"use client";

import { DollarSign, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#components/ui/sheet";
import { useUpdateUnitMutation } from "#hooks/api/use-unit";
import { useAppForm } from "#lib/forms/form-hook";
import type { Unit } from "#types/core";

interface EditUnitPanelProps {
	unit: Unit;
	propertyName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

const STATUS_OPTIONS = [
	{ value: "available", label: "Vacant" },
	{ value: "occupied", label: "Occupied" },
	{ value: "maintenance", label: "Maintenance" },
	{ value: "reserved", label: "Reserved" },
];

export function EditUnitPanel({
	unit,
	propertyName,
	open,
	onOpenChange,
	onSuccess,
}: EditUnitPanelProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const updateUnitMutation = useUpdateUnitMutation();

	const form = useAppForm({
		defaultValues: {
			unit_number: unit.unit_number ?? "",
			bedrooms: unit.bedrooms?.toString() ?? "1",
			bathrooms: unit.bathrooms?.toString() ?? "1",
			square_feet: unit.square_feet?.toString() ?? "",
			rent_amount: unit.rent_amount?.toString() ?? "",
			status: (unit.status ?? "available") as
				| "available"
				| "occupied"
				| "maintenance"
				| "reserved",
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				if (!value.unit_number?.trim()) {
					toast.error("Unit number is required");
					setIsSubmitting(false);
					return;
				}
				if (!value.rent_amount?.trim()) {
					toast.error("Monthly rent is required");
					setIsSubmitting(false);
					return;
				}
				const bedrooms = Number.parseInt(value.bedrooms, 10);
				const bathrooms = Number.parseFloat(value.bathrooms);
				const rent_amount = Number.parseFloat(value.rent_amount);
				const square_feet = value.square_feet
					? Number.parseInt(value.square_feet, 10)
					: null;
				if (!Number.isFinite(bedrooms) || bedrooms < 0) {
					toast.error("Bedrooms must be a valid positive number");
					setIsSubmitting(false);
					return;
				}
				if (!Number.isFinite(bathrooms) || bathrooms < 0) {
					toast.error("Bathrooms must be a valid positive number");
					setIsSubmitting(false);
					return;
				}
				if (!Number.isFinite(rent_amount) || rent_amount <= 0) {
					toast.error("Rent must be a valid positive number");
					setIsSubmitting(false);
					return;
				}
				await updateUnitMutation.mutateAsync({
					id: unit.id,
					data: {
						unit_number: value.unit_number,
						bedrooms,
						bathrooms,
						// Send the explicit null (not undefined) so clearing Square Feet
						// persists — omitUndefined keeps null but strips undefined, which
						// would silently drop the column and keep the old value (PROP-05).
						square_feet,
						rent_amount,
						status: value.status,
					},
				});

				onOpenChange(false);
				onSuccess?.();
			} catch {
				// Error is handled by mutation
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	useEffect(() => {
		form.reset({
			unit_number: unit.unit_number ?? "",
			bedrooms: unit.bedrooms?.toString() ?? "1",
			bathrooms: unit.bathrooms?.toString() ?? "1",
			square_feet: unit.square_feet?.toString() ?? "",
			rent_amount: unit.rent_amount?.toString() ?? "",
			status: (unit.status ?? "available") as
				| "available"
				| "occupied"
				| "maintenance"
				| "reserved",
		});
	}, [unit, form]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Edit Unit {unit.unit_number}</SheetTitle>
					<SheetDescription>
						Update unit details for {propertyName}
					</SheetDescription>
				</SheetHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="flex flex-col gap-6 p-4"
				>
					<form.AppField name="unit_number">
						{(field) => (
							<field.TextField
								label="Unit Number/Identifier *"
								placeholder="e.g., 101, A1, Suite 200"
							/>
						)}
					</form.AppField>

					<div className="grid grid-cols-2 gap-4">
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
					</div>

					<form.AppField name="square_feet">
						{(field) => (
							<field.TextField
								label="Square Feet (Optional)"
								type="number"
								min="0"
								placeholder="e.g., 850"
							/>
						)}
					</form.AppField>

					<form.AppField name="rent_amount">
						{(field) => (
							<field.IconInputField
								label="Monthly Rent *"
								icon={DollarSign}
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/>
						)}
					</form.AppField>

					<form.AppField name="status">
						{(field) => (
							<field.SelectField label="Status *" options={STATUS_OPTIONS} />
						)}
					</form.AppField>

					<SheetFooter className="mt-4 p-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								"Save Changes"
							)}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
