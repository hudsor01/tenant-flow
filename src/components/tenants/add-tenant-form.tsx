"use client";

import { useStore } from "@tanstack/react-form";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import type { RentalApplicationRow } from "#hooks/api/query-keys/application-keys";
import { useCreateTenantMutation } from "#hooks/api/use-tenant-mutations";
import { useUnsavedChangesWarning } from "#hooks/use-unsaved-changes";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import type { TenantCreate } from "#lib/validation/tenants";
import type { Property, Unit } from "#types/core";
import { addTenantFormOptions } from "./add-tenant-form-options";
import { AddTenantInfoFields } from "./add-tenant-info-fields";
import { AddTenantPropertyFields } from "./add-tenant-property-fields";

const logger = createLogger({ component: "AddTenantForm" });

/** The six controlled fields this form owns. */
export type AddTenantFormValues = typeof addTenantFormOptions.defaultValues;

/**
 * The four application columns the conversion reads. A `Pick` rather than the
 * whole row so a future field cannot be added to the mapping by accident.
 */
export type ApplicationPrefillSource = Pick<
	RentalApplicationRow,
	| "applicant_email"
	| "applicant_first_name"
	| "applicant_last_name"
	| "applicant_phone"
>;

/**
 * Application row -> tenant-form prefill (APPLY-04). Defined ONCE and called
 * from BOTH `/tenants/new` and its intercepting-route twin — two independent
 * copies of this mapping is precisely the drift research Pitfall 6 describes.
 *
 * FOUR keys, and deliberately no more. `tenants` has no column for an
 * applicant's address, income, employer or references, and widening it to
 * absorb them would stand up a SECOND retention surface for applicant PII
 * outside the 730-day sweep (T-66-51). The rest of the application stays on the
 * application row and is reachable from the tenant through `converted_tenant_id`.
 *
 * The fifth prefilled tenant column, `name`, is NOT a key here because it is
 * not a field on this form: `onSubmit` derives it from first + last exactly as
 * it did before any application existed.
 */
export function applicationToTenantInitialValues(
	row: ApplicationPrefillSource,
): Partial<AddTenantFormValues> {
	return {
		email: row.applicant_email,
		first_name: row.applicant_first_name,
		last_name: row.applicant_last_name,
		// A null phone becomes the empty string, never `undefined` and never the
		// literal "null": an undefined would survive the defaults spread below and
		// hand TanStack Form an uncontrolled input that React warns about
		// mid-typing.
		phone: row.applicant_phone ?? "",
	};
}

interface AddTenantFormProps {
	properties: Property[];
	units: Unit[];
	onSuccess?: () => void;
	/**
	 * Prefill from a rental application (APPLY-04). Spread OVER
	 * `addTenantFormOptions.defaultValues` — never replaces them, so any key
	 * absent here keeps its `""` default rather than becoming `undefined`.
	 */
	initialValues?: Partial<AddTenantFormValues> | undefined;
	/** When set, the created tenant is recorded against this application. */
	applicationId?: string | undefined;
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
	initialValues,
}: AddTenantFormProps) {
	const router = useRouter();
	const [selectedPropertyId, setSelectedPropertyId] = useState("");
	const createTenant = useCreateTenantMutation();
	const isSubmitting = createTenant.isPending;

	const form = useAppForm({
		...addTenantFormOptions,
		// Spread OVER the defaults, never a replacement: a replacement missing a
		// key yields `undefined` where the form expects `""` under
		// `exactOptionalPropertyTypes`, and TanStack Form then renders an
		// uncontrolled input.
		defaultValues: { ...addTenantFormOptions.defaultValues, ...initialValues },
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
				// FORMFIX-08: the mutation's onError (createMutationCallbacks) surfaces
				// the error toast; only log here to avoid a duplicate.
				logger.error("Failed to add tenant", {
					error: error instanceof Error ? error.message : String(error),
				});
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
