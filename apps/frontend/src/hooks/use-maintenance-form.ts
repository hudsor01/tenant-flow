import { useForm } from '@tanstack/react-form'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/backend-domain'
import type {
	MaintenanceRequest,
	MaintenanceCategory
} from '@repo/shared/types/core'

const logger = createLogger({ component: 'MaintenanceFormHook' })

export interface MaintenanceFormData {
	title: string
	description: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	category: MaintenanceCategory | undefined
	propertyId: string
	unitId: string
	estimatedCost?: string
	preferredDate?: string
}

export interface UseMaintenanceFormOptions {
	mode: 'create' | 'edit'
	defaultValues?: Partial<MaintenanceFormData>
	createMutation?: UseMutationResult<
		MaintenanceRequest,
		Error,
		CreateMaintenanceRequest,
		unknown
	>
	updateMutation?: UseMutationResult<
		MaintenanceRequest,
		Error,
		{ id: string; data: UpdateMaintenanceRequest; version?: number },
		unknown
	>
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
			priority: 'LOW',
			category: undefined,
			propertyId: '',
			unitId: '',
			estimatedCost: '',
			preferredDate: '',
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

					const payload: CreateMaintenanceRequest = {
						title: value.title,
						description: value.description,
						priority: value.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
						unitId: value.unitId
					}

					// Add optional fields only if they have values
					if (value.category) {
						payload.category = value.category
					}
					if (value.estimatedCost) {
						const parsed = parseFloat(value.estimatedCost)
						if (Number.isFinite(parsed)) {
							payload.estimatedCost = parsed
						}
					}
					if (value.preferredDate) {
						payload.scheduledDate = value.preferredDate
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

					const payload: UpdateMaintenanceRequest = {
						title: value.title,
						description: value.description,
						priority: value.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
					}

					// Add optional fields only if they have values
					if (value.category) {
						payload.category = value.category
					}
					if (value.estimatedCost) {
						const parsed = parseFloat(value.estimatedCost)
						if (Number.isFinite(parsed)) {
							payload.estimatedCost = parsed
						}
					}
					if (value.preferredDate) {
						payload.scheduledDate = value.preferredDate
					}

					const mutationPayload: {
						id: string
						data: UpdateMaintenanceRequest
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
