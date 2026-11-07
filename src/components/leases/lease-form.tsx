"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorBoundary } from "#components/error-boundary/error-boundary";
import { Button } from "#components/ui/button";
import {
	type LeaseDetailRow,
	leaseQueries,
} from "#hooks/api/query-keys/lease-keys";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { unitQueries } from "#hooks/api/query-keys/unit-keys";
import {
	useCreateLeaseMutation,
	useUpdateLeaseMutation,
} from "#hooks/api/use-lease-mutations";
import { useCurrentUser } from "#hooks/use-current-user";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import { cn } from "#lib/utils";
import type { LeaseCreate } from "#lib/validation/leases";
import type { Property, TenantWithLeaseInfo, Unit } from "#types/core";
import { LeaseFormFinancialFields } from "./lease-form-financial-fields";
import { leaseFormOptions } from "./lease-form-options";
import { LeaseFormPropertyUnitFields } from "./lease-form-property-unit-fields";
import { LeaseFormTenantDateFields } from "./lease-form-tenant-date-fields";

/**
 * A picker's rows with the edited lease's own record kept in them. The
 * property and tenant pickers read the 50 newest active rows and the unit
 * picker its property's first 500 active units by number, so a lease on an
 * older or a deleted tenant, property or unit opened on a blank value; the
 * lease detail's embeds name that record whatever the lists hold. It goes
 * last, where an older row or a later unit number would sort. A new lease
 * has no record, so its pickers show the lists alone.
 */
function withLeaseRecord<Row extends { id: string }>(
	rows: readonly Row[],
	record: Row | null,
): Row[] {
	if (record === null || rows.some((row) => row.id === record.id)) {
		return [...rows];
	}
	return [...rows, record];
}

interface LeaseFormProps {
	mode: "create" | "edit";
	lease?: LeaseDetailRow;
	onSuccess?: () => void;
}

export function LeaseForm({ mode, lease, onSuccess }: LeaseFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { isLoading: isAuthLoading } = useCurrentUser();
	const logger = createLogger({ component: "LeaseForm" });

	const createLeaseMutation = useCreateLeaseMutation();
	const updateLeaseMutation = useUpdateLeaseMutation();

	const {
		data: propertiesResponse,
		isError: propertiesIsError,
		isLoading: propertiesIsLoading,
	} = useQuery(propertyQueries.list());
	const leaseUnit = lease?.unit ?? null;
	const properties = withLeaseRecord<Pick<Property, "id" | "name">>(
		propertiesResponse?.data ?? [],
		leaseUnit?.property
			? { id: leaseUnit.property_id, name: leaseUnit.property.name }
			: null,
	);

	const tenantsResponse = useQuery(tenantQueries.list());
	const tenants = withLeaseRecord<
		Pick<TenantWithLeaseInfo, "id" | "name" | "email">
	>(tenantsResponse.data?.data ?? [], lease?.tenant ?? null);

	// Sync server-fetched lease into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === "edit" && lease) {
			queryClient.setQueryData(leaseQueries.detail(lease.id).queryKey, lease);
		}
	}, [mode, lease, queryClient]);

	const form = useAppForm({
		...leaseFormOptions,
		defaultValues: {
			unit_id: lease?.unit_id ?? "",
			primary_tenant_id: lease?.primary_tenant_id ?? "",
			start_date: lease?.start_date ?? "",
			end_date: lease?.end_date ?? "",
			rent_amount: lease?.rent_amount ?? 0,
			security_deposit: lease?.security_deposit ?? 0,
			rent_currency: lease?.rent_currency ?? "USD",
			payment_day: lease?.payment_day ?? 1,
			lease_status: lease?.lease_status ?? "draft",
		},
		onSubmit: async ({ value }) => {
			try {
				// The form only offers the writable workflow statuses; 'expired' is a
				// cron-set, read-only display state (part of the widened core
				// LeaseStatus union) and is never selectable here, so narrow to the
				// mutation-input union rather than the display union.
				const leaseStatus = value.lease_status as LeaseCreate["lease_status"];
				if (mode === "create") {
					await createLeaseMutation.mutateAsync({
						...value,
						lease_status: leaseStatus,
						tenant_ids: [value.primary_tenant_id],
					});
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: leaseQueries.all() }),
						queryClient.invalidateQueries({ queryKey: unitQueries.all() }),
						queryClient.invalidateQueries({ queryKey: tenantQueries.all() }),
					]);
					// FORMFIX-08: the create mutation's createMutationCallbacks fires the
					// single success toast; no form-level duplicate.
					router.push("/leases");
				} else {
					if (!lease?.id) {
						toast.error("Lease ID is missing");
						return;
					}
					await updateLeaseMutation.mutateAsync({
						id: lease.id,
						data: { ...value, lease_status: leaseStatus },
					});
					// FORMFIX-08: the update mutation's createMutationCallbacks fires the
					// single success toast; no form-level duplicate.
				}
				onSuccess?.();
			} catch (error) {
				// FORMFIX-08: the mutation's onError (createMutationCallbacks) surfaces
				// the error toast; only log here to avoid a duplicate.
				logger.error(`Lease ${mode} failed`, {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				});
			}
		},
	});

	// The lease's unit as the detail maps it. The detail returned its raw
	// `units` embed, so `unit` was always absent and the edit form opened with
	// no property chosen and no units to show the lease's unit by.
	const [selectedPropertyId, setSelectedPropertyId] = useState(
		leaseUnit?.property_id ?? "",
	);
	const { data: unitsData, isError: unitsIsError } = useQuery({
		...unitQueries.listByProperty(selectedPropertyId),
		enabled: !!selectedPropertyId,
	});
	// The lease's unit is an option only under its own property: choosing
	// another property clears the unit and lists that property's units.
	const units = withLeaseRecord<Pick<Unit, "id" | "unit_number">>(
		unitsData ?? [],
		leaseUnit && leaseUnit.property_id === selectedPropertyId
			? { id: leaseUnit.id, unit_number: leaseUnit.unit_number }
			: null,
	);

	const isSubmitting =
		mode === "create"
			? createLeaseMutation.isPending
			: updateLeaseMutation.isPending;

	return (
		<ErrorBoundary>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<div className="space-y-6">
					<LeaseFormPropertyUnitFields
						form={form}
						properties={properties}
						propertiesIsLoading={propertiesIsLoading}
						propertiesIsError={propertiesIsError}
						units={units}
						unitsIsError={unitsIsError}
						selectedPropertyId={selectedPropertyId}
						onPropertyChange={setSelectedPropertyId}
					/>

					<LeaseFormTenantDateFields form={form} tenants={tenants} />

					<LeaseFormFinancialFields form={form} />

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
									? "Create Lease"
									: "Save Changes"}
						</Button>
					</div>
				</div>
			</form>
		</ErrorBoundary>
	);
}
