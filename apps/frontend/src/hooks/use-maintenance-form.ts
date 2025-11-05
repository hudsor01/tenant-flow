import { useForm } from '@tanstack/react-form'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'MaintenanceFormHook' })

export interface MaintenanceFormData {
	title: string
	description: string
	priority: string
	category: string
	propertyId: string
	unitId: string
	estimatedCost?: string
	preferredDate?: string
}

export function useMaintenanceForm(
	mode: 'create' | 'edit',
	defaultValues: Partial<MaintenanceFormData> = {}
) {
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
			// This will be handled by the component
			logger.info('Form submitted', { mode, value })
		}
	})

	return form
}
