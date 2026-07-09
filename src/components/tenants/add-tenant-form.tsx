"use client";

import { useStore } from "@tanstack/react-form";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { useCreateTenantMutation } from "#hooks/api/use-tenant-mutations";
import { useUnsavedChangesWarning } from "#hooks/use-unsaved-changes";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import { handleMutationError } from "#lib/mutation-error-handler";
import type { TenantCreate } from "#lib/validation/tenants";
import type { Property, Unit } from "#types/core";
import { addTenantFormOptions } from "./add-tenant-form-options";
import { AddTenantInfoFields } from "./add-tenant-info-fields";
import { AddTenantPropertyFields } from "./add-tenant-property-fields";

const logger = createLogger({ component: "AddTenantForm" });

interface AddTenantFormProps {
	properties: Property[];
	units: Unit[];
	onSuccess?: () => void;
}

/**
 * Add Tenant Form (landlord-only mode)
 *
 * Collects basic tenant info and records a tenant row for the landlord.
 * Tenants do NOT receive a portal login — they are data records on the
 * landlord's side. Lease assignment happens on the lease creation flow.
 *
 * Required Fields:
 * - Email
 * - First/Last name
 *
 * Optional Fields:
 * - Phone
 * - Property / Unit for early association
 */
export function AddTenantForm({
	properties,
	units,
	onSuccess,
}: AddTenantFormProps) {
	const router = useRouter();
	const [selectedPropertyId, setSelectedPropertyId] = useState("");
	const createTenant = useCreateTenantMutation();
	const isSubmitting = createTenant.isPending;

	const form = useAppForm({
		...addTenantFormOptions,
		onSubmit: async ({ value }) => {
			try {
				// Landlord-managed tenant record — contact info lives on the tenants row.
				const payload: TenantCreate = {
					email: value.email,
					first_name: value.first_name,
					last_name: value.last_name,
					name: `${value.first_name} ${value.last_name}`.trim(),
					...(value.phone ? { phone: value.phone } : {}),
				};

				const created = await createTenant.mutateAsync(payload);

				logger.info("Tenant added", { email: value.email });
				// FORMFIX-08: the create mutation's createMutationCallbacks already
				// fires the single success toast ("Tenant created successfully") — no
				// form-level duplicate here.

				onSuccess?.();

				// FORMFIX-04: a selected property/unit must not be silently dropped.
				// There is no standalone tenant↔unit link — lease_tenants needs a
				// lease_id, and a lease needs start/end/rent that this form does not
				// collect. So carry the created tenant + selected property/unit into
				// the lease-creation flow (preselection query params) instead of
				// discarding the selection on the /tenants redirect.
				if (value.property_id) {
					const params = new URLSearchParams({
						tenant: created.id,
						property: value.property_id,
					});
					if (value.unit_id) params.set("unit", value.unit_id);
					toast.info(
						"Complete the lease to finish assigning this tenant to the unit.",
					);
					router.push(`/leases/new?${params.toString()}`);
				} else {
					router.push("/tenants");
					router.refresh();
				}
			} catch (error) {
				logger.error("Failed to add tenant", {
					error: error instanceof Error ? error.message : String(error),
				});
				handleMutationError(error, "Add tenant");
			}
		},
	});

	// Warn before navigating away with unsaved form data.
	// FORMFIX-01: read dirty REACTIVELY from the form store so the boolean
	// re-renders as the user types (a `form.state.isDirty` snapshot is read once
	// at mount and never re-arms the guard's effect).
	const isDirty = useStore(form.store, (s) => s.isDirty);
	useUnsavedChangesWarning(isDirty);

	// Filter units based on selected property
	const availableUnits = units.filter(
		(unit) => unit.property_id === selectedPropertyId,
	);

	// Auto-select the first unit if only one exists
	useEffect(() => {
		if (
			availableUnits.length === 1 &&
			!form.getFieldValue("unit_id") &&
			availableUnits[0]
		) {
			form.setFieldValue("unit_id", availableUnits[0].id);
		}
	}, [availableUnits, form]);

	return (
		<div className="space-y-6">
			<AddTenantInfoFields form={form} />

			<AddTenantPropertyFields
				form={form}
				properties={properties}
				availableUnits={availableUnits}
				selectedPropertyId={selectedPropertyId}
				onPropertyChange={setSelectedPropertyId}
			/>

			{/* Form Actions */}
			<div className="flex justify-end gap-4 pt-4 border-t">
				<Button type="button" variant="outline" onClick={() => router.back()}>
					Cancel
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isFormSubmitting]) => (
						<Button
							type="submit"
							disabled={!canSubmit || isSubmitting || isFormSubmitting}
							onClick={form.handleSubmit}
						>
							<UserPlus className="size-4 mr-2" />
							{isSubmitting || isFormSubmitting
								? "Adding tenant..."
								: "Add Tenant"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	);
}
