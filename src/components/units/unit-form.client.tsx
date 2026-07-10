"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { unitQueries } from "#hooks/api/query-keys/unit-keys";
import {
	useCreateUnitMutation,
	useUpdateUnitMutation,
} from "#hooks/api/use-unit";
import { useCurrentUser } from "#hooks/use-current-user";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import {
	handleConflictError,
	isConflictError,
} from "#lib/utils/optimistic-locking";
import type { Unit } from "#types/core";
import { UnitFormFields } from "./unit-form-fields";
import { unitFormOptions } from "./unit-form-options";

interface UnitFormProps {
	mode: "create" | "edit";
	unit?: Unit;
	id?: string; // For edit mode - will fetch unit if provided
	onSuccess?: () => void;
}

/**
 * Unit Form Component
 *
 * Consolidated form for creating and editing units.
 * Follows the same pattern as PropertyForm, LeaseForm, and MaintenanceForm.
 */
export function UnitForm({
	mode,
	unit: unitProp,
	id,
	onSuccess,
}: UnitFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { isLoading: isAuthLoading } = useCurrentUser();
	const { data: propertiesResponse } = useQuery(
		propertyQueries.list({ limit: 100 }),
	);
	const properties = propertiesResponse?.data;
	const createUnitMutation = useCreateUnitMutation();
	const updateUnitMutation = useUpdateUnitMutation();
	const logger = createLogger({ component: "UnitForm" });

	// Fetch unit if id provided (for client-side edit mode)
	// Only fetch if we don't have a unit prop and we're in edit mode
	const shouldFetch = mode === "edit" && !!id && !unitProp;
	const { data: fetchedUnit } = useQuery({
		...unitQueries.detail(shouldFetch ? id! : ""),
		enabled: shouldFetch,
	});

	// Use provided unit or fetched unit
	const unit = unitProp || fetchedUnit;

	// Sync server-fetched unit into TanStack Query cache (edit mode only)
	useEffect(() => {
		if (mode === "edit" && unit) {
			queryClient.setQueryData(unitQueries.detail(unit.id).queryKey, unit);
		}
	}, [mode, unit, unit?.id, queryClient]);

	const form = useAppForm({
		...unitFormOptions,
		defaultValues: {
			property_id: unit?.property_id ?? "",
			unit_number: unit?.unit_number ?? "",
			bedrooms: unit?.bedrooms?.toString() ?? "1",
			bathrooms: unit?.bathrooms?.toString() ?? "1",
			square_feet: unit?.square_feet?.toString() ?? "",
			rent_amount: unit?.rent_amount?.toString() ?? "",
			status: (unit?.status ?? "available") as
				| "available"
				| "occupied"
				| "maintenance"
				| "reserved",
		},
		onSubmit: async ({ value }) => {
			try {
				// Validate required fields first
				if (!value.property_id?.trim()) {
					toast.error("Property is required");
					return;
				}

				if (!value.unit_number?.trim()) {
					toast.error("Unit number is required");
					return;
				}

				if (!value.rent_amount?.trim()) {
					toast.error("Rent is required");
					return;
				}

				// Validate required numeric fields
				const bedrooms = Number.parseInt(value.bedrooms, 10);
				const bathrooms = Number.parseFloat(value.bathrooms);
				const rent_amount = Number.parseFloat(value.rent_amount);
				const square_feet = value.square_feet
					? Number.parseInt(value.square_feet, 10)
					: null;

				if (!Number.isFinite(bedrooms) || bedrooms < 0) {
					toast.error("Bedrooms must be a valid positive number");
					return;
				}

				if (!Number.isFinite(bathrooms) || bathrooms < 0) {
					toast.error("Bathrooms must be a valid positive number");
					return;
				}

				if (!Number.isFinite(rent_amount) || rent_amount <= 0) {
					toast.error("Rent must be a valid positive number greater than zero");
					return;
				}

				if (
					value.square_feet &&
					(!Number.isFinite(square_feet) || square_feet! < 0)
				) {
					toast.error("Square feet must be a valid positive number");
					return;
				}

				const unitData = {
					property_id: value.property_id,
					unit_number: value.unit_number,
					bedrooms,
					bathrooms,
					square_feet: square_feet ?? undefined,
					rent_amount,
					rent_currency: "USD",
					rent_period: "monthly",
					status: value.status,
				};

				if (mode === "create") {
					await createUnitMutation.mutateAsync(unitData);
					// FORMFIX-08: the create mutation's createMutationCallbacks fires the
					// single success toast; no form-level duplicate.
					router.push("/units");
				} else {
					if (!unit?.id) {
						toast.error("Unit ID is missing");
						return;
					}
					await updateUnitMutation.mutateAsync({
						id: unit.id,
						// PROP-05: the shared unitData omits square_feet on clear
						// (square_feet ?? undefined); the edit path must send explicit
						// null so a cleared optional column is actually nulled.
						data: { ...unitData, square_feet },
					});
					// FORMFIX-08: the update mutation's createMutationCallbacks fires the
					// single success toast; no form-level duplicate.
				}

				onSuccess?.();
			} catch (error) {
				// FORMFIX-08: the mutation's onError (createMutationCallbacks ->
				// handleMutationError) surfaces the single error toast, including the
				// 409 "Conflict" toast. On a conflict, reconcile the cache so the stale
				// unit refetches; otherwise just log. No second toast, and no re-throw
				// (form-core re-throws onSubmit errors into the un-awaited handleSubmit).
				if (mode === "edit" && unit && isConflictError(error)) {
					handleConflictError("units", unit.id, queryClient, [
						unitQueries.detail(unit.id).queryKey,
						unitQueries.all(),
					]);
				}
				logger.error(`Unit ${mode} failed`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
	});

	// Reset form when unit data loads
	useEffect(() => {
		if (unit) {
			form.reset({
				property_id: unit.property_id ?? "",
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
		}
	}, [unit, form]);

	const isSubmitting =
		mode === "create"
			? createUnitMutation.isPending
			: updateUnitMutation.isPending;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<UnitFormFields
				form={form}
				properties={properties}
				mode={mode}
				isSubmitting={isSubmitting}
				isAuthLoading={isAuthLoading}
			/>
		</form>
	);
}
