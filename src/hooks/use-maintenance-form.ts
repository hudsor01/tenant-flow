import { useForm } from "@tanstack/react-form";
import type { UseMutationResult } from "@tanstack/react-query";
import type { MaintenanceUpdateMutationVariables } from "#hooks/api/use-maintenance";
import { createLogger } from "#lib/frontend-logger";
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate,
} from "#lib/validation/maintenance";
import type { MaintenancePriority, MaintenanceRequest } from "#types/core";

const logger = createLogger({ component: "MaintenanceFormHook" });

// Use DB enum values (lowercase): 'low' | 'normal' | 'high' | 'urgent'
export interface MaintenanceFormData {
	title: string;
	description: string;
	priority: MaintenancePriority;
	unit_id: string;
	tenant_id: string;
	estimated_cost?: string;
	scheduled_date?: string;
}

/** Mutation variable type for creating maintenance requests */
type CreateMutationVariables = MaintenanceRequestCreate;

export interface UseMaintenanceFormOptions {
	mode: "create" | "edit";
	defaultValues?: Partial<MaintenanceFormData>;
	createMutation?: UseMutationResult<
		MaintenanceRequest,
		Error,
		CreateMutationVariables,
		unknown
	>;
	updateMutation?: UseMutationResult<
		MaintenanceRequest,
		Error,
		MaintenanceUpdateMutationVariables,
		unknown
	>;
	requestId?: string;
	version?: number;
	onSuccess?: (data: MaintenanceRequest) => void;
}

export function useMaintenanceForm({
	mode,
	defaultValues = {},
	createMutation,
	updateMutation,
	requestId,
	version,
	onSuccess,
}: UseMaintenanceFormOptions) {
	const form = useForm({
		defaultValues: {
			title: "",
			description: "",
			priority: "low" as MaintenancePriority,
			unit_id: "",
			tenant_id: "",
			estimated_cost: "",
			scheduled_date: "",
			...defaultValues,
		},
		onSubmit: async ({ value }) => {
			try {
				logger.info("Form submitting", { mode, value });

				if (mode === "create") {
					if (!createMutation) {
						logger.error("Create mutation not provided for create mode");
						throw new Error("Create mutation is required for create mode");
					}

					const payload: MaintenanceRequestCreate = {
						title: value.title,
						description: value.description,
						priority: value.priority,
						unit_id: value.unit_id,
						tenant_id: value.tenant_id,
						status: "open",
					};

					// Add optional fields only if they have values. estimated_cost is
					// an integer column — parse as a whole dollar (the field validator
					// already rejects decimals/negatives).
					if (value.estimated_cost) {
						const parsed = Number.parseInt(value.estimated_cost, 10);
						if (Number.isFinite(parsed)) {
							payload.estimated_cost = parsed;
						}
					}
					if (value.scheduled_date) {
						payload.scheduled_date = value.scheduled_date;
					}

					const result = await createMutation.mutateAsync(payload);
					logger.info("Maintenance request created successfully", {
						id: result.id,
					});
					onSuccess?.(result);
				} else {
					// mode === 'edit'
					if (!updateMutation) {
						logger.error("Update mutation not provided for edit mode");
						throw new Error("Update mutation is required for edit mode");
					}

					if (!requestId) {
						logger.error("Request ID not provided for edit mode");
						throw new Error("Request ID is required for edit mode");
					}

					// FORMFIX-05: include unit_id/tenant_id so reassigning the unit or
					// tenant on edit actually persists (previously omitted → silently
					// dropped). maintenanceRequestUpdateSchema accepts them (partial input).
					const payload: MaintenanceRequestUpdate = {
						title: value.title,
						description: value.description,
						priority: value.priority,
						unit_id: value.unit_id,
						tenant_id: value.tenant_id,
					};

					// PROP-05: send explicit null on clear (edit branch only) so the
					// column is nulled — a cleared field previously omitted the key and
					// kept the old value. NOT-NULL columns above are always sent.
					if (value.estimated_cost) {
						const parsed = Number.parseInt(value.estimated_cost, 10);
						payload.estimated_cost = Number.isFinite(parsed) ? parsed : null;
					} else {
						payload.estimated_cost = null;
					}
					if (value.scheduled_date) {
						payload.scheduled_date = value.scheduled_date;
					} else {
						payload.scheduled_date = null;
					}

					const mutationPayload: {
						id: string;
						data: MaintenanceRequestUpdate;
						version?: number;
					} = {
						id: requestId,
						data: payload,
					};

					// Add version only if it's defined
					if (version !== undefined) {
						mutationPayload.version = version;
					}

					const result = await updateMutation.mutateAsync(mutationPayload);
					logger.info("Maintenance request updated successfully", {
						id: result.id,
					});
					onSuccess?.(result);
				}
			} catch (error) {
				// FORMFIX-08: the mutation's onError (createMutationCallbacks) surfaces
				// the single error toast; only log here. Do NOT re-throw — form-core
				// re-throws whatever onSubmit throws, and the DOM handler calls
				// form.handleSubmit() un-awaited, so a re-thrown rejection escapes as an
				// unhandled promise rejection (second Sentry capture + a dev error
				// overlay on an already-handled failure). Matches the other 3 forms.
				logger.error("Failed to submit maintenance request", {
					mode,
					error,
				});
			}
		},
	});

	return form;
}
