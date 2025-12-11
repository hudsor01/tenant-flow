import { useForm } from '@tanstack/react-form'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'
import type { MaintenanceRequest, MaintenancePriority } from '@repo/shared/types/core'
import type { MaintenanceUpdateMutationVariables } from '#hooks/api/mutations/maintenance-mutations'

const logger = createLogger({ component: 'MaintenanceFormHook' })

// Use DB enum values (lowercase): 'low' | 'normal' | 'high' | 'urgent'
export interface MaintenanceFormData {
	title: string
	description: string
	priority: MaintenancePriority
	unit_id: string
	tenant_id: string
	estimated_cost?: string
	scheduled_date?: string
}

/** Mutation variable type for creating maintenance requests */
type CreateMutationVariables = MaintenanceRequestCreate

export interface UseMaintenanceFormOptions {
	mode: 'create' | 'edit'
	defaultValues?: Partial<MaintenanceFormData>
	createMutation?: UseMutationResult<MaintenanceRequest, Error, CreateMutationVariables, unknown>
	updateMutation?: UseMutationResult<MaintenanceRequest, Error, MaintenanceUpdateMutationVariables, unknown>
	requestId?: string
	version?: number
	onSuccess?: (data: MaintenanceRequest) => void
}

export function useMaintenanceForm({
	mode,
	defaultValues = {},
	createMutation,
	updateMutation,
	requestId,
	version,
	onSuccess
}: UseMaintenanceFormOptions) {
	const form = useForm({
		defaultValues: {
			title: '',
			description: '',
			priority: 'low' as MaintenancePriority,
			unit_id: '',
			tenant_id: '',
			estimated_cost: '',
			scheduled_date: '',
			...defaultValues
		},
		onSubmit: async ({ value }) => {
			try {
				logger.info('Form submitting', { mode, value })

				if (mode === 'create') {
					if (!createMutation) {
						logger.error('Create mutation not provided for create mode')
						throw new Error('Create mutation is required for create mode')
					}

					const payload: MaintenanceRequestCreate = {
						title: value.title,
						description: value.description,
						priority: value.priority,
						unit_id: value.unit_id,
						tenant_id: value.tenant_id,
						status: 'open'
					}

					// Add optional fields only if they have values
					if (value.estimated_cost) {
						const parsed = parseFloat(value.estimated_cost)
						if (Number.isFinite(parsed)) {
							payload.estimated_cost = parsed
						}
					}
					if (value.scheduled_date) {
						payload.scheduled_date = value.scheduled_date
					}

					const result = await createMutation.mutateAsync(payload)
					logger.info('Maintenance request created successfully', {
						id: result.id
					})
					onSuccess?.(result)
				} else {
					// mode === 'edit'
					if (!updateMutation) {
						logger.error('Update mutation not provided for edit mode')
						throw new Error('Update mutation is required for edit mode')
					}

					if (!requestId) {
						logger.error('Request ID not provided for edit mode')
						throw new Error('Request ID is required for edit mode')
					}

					const payload: MaintenanceRequestUpdate = {
						title: value.title,
						description: value.description,
						priority: value.priority
					}

					// Add optional fields only if they have values
					if (value.estimated_cost) {
						const parsed = parseFloat(value.estimated_cost)
						if (Number.isFinite(parsed)) {
							payload.estimated_cost = parsed
						}
					}
					if (value.scheduled_date) {
						payload.scheduled_date = value.scheduled_date
					}

					const mutationPayload: {
						id: string
						data: MaintenanceRequestUpdate
						version?: number
					} = {
						id: requestId,
						data: payload
					}

					// Add version only if it's defined
					if (version !== undefined) {
						mutationPayload.version = version
					}

					const result = await updateMutation.mutateAsync(mutationPayload)
					logger.info('Maintenance request updated successfully', {
						id: result.id
					})
					onSuccess?.(result)
				}
			} catch (error) {
				logger.error('Failed to submit maintenance request', {
					mode,
					error
				})
				// Re-throw to let mutation error handlers manage UI notifications
				throw error
			}
		}
	})

	return form
}
