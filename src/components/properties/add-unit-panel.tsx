"use client";

import { DollarSign, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { Field, FieldLabel } from "#components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#components/ui/sheet";
import { useCreateUnitMutation } from "#hooks/api/use-unit";
import { useCurrentUser } from "#hooks/use-current-user";
import { useAppForm } from "#lib/forms/form-hook";
import { cn } from "#lib/utils";

interface AddUnitPanelProps {
	propertyId: string;
	propertyName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

/**
 * AddUnitPanel - Slide-out panel for adding units to a property
 *
 * Per spec: "Slide-out panel for adding units to a property"
 * Uses Sheet component for slide-out behavior from right side.
 */
export function AddUnitPanel({
	propertyId,
	propertyName,
	open,
	onOpenChange,
	onSuccess,
}: AddUnitPanelProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { isLoading: isAuthLoading } = useCurrentUser();
	const createUnitMutation = useCreateUnitMutation();

	const form = useAppForm({
		defaultValues: {
			unit_number: "",
			bedrooms: "1",
			bathrooms: "1",
			square_feet: "",
			rent_amount: "",
			status: "available" as "available" | "maintenance",
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				// Validate required fields
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

				if (!Number.isInteger(rent_amount)) {
					// units.rent_amount is an integer column — reject cents, never round.
					toast.error("Monthly rent must be a whole dollar amount (no cents)");
					setIsSubmitting(false);
					return;
				}

				await createUnitMutation.mutateAsync({
					property_id: propertyId,
					unit_number: value.unit_number,
					bedrooms,
					bathrooms,
					square_feet: square_feet ?? undefined,
					rent_amount,
					rent_currency: "USD",
					rent_period: "monthly",
					status: value.status,
				});

				// Reset form
				form.reset();
				onOpenChange(false);
				onSuccess?.();
			} catch {
				// Error is handled by mutation
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Add Unit</SheetTitle>
					<SheetDescription>Add a new unit to {propertyName}</SheetDescription>
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
								autoFocus
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
								step="1"
								placeholder="0"
							/>
						)}
					</form.AppField>

					<form.AppField name="status">
						{(field) => (
							<Field>
								<FieldLabel htmlFor="status">Initial Status *</FieldLabel>
								<Select
									value={field.state.value}
									onValueChange={(value) => {
										if (value === "available" || value === "maintenance") {
											field.handleChange(value);
										}
									}}
								>
									<SelectTrigger id="status">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="available">Vacant</SelectItem>
										<SelectItem value="maintenance">Maintenance</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground mt-1">
									Only Available or Maintenance can be set for new units
								</p>
							</Field>
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
						<Button
							type="submit"
							disabled={isSubmitting || isAuthLoading}
							className={cn(isAuthLoading && "animate-pulse")}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								"Create Unit"
							)}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
