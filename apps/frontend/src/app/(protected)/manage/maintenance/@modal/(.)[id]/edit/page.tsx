import { MaintenanceForm } from '#components/maintenance/maintenance-form.client'
import { RouteModal } from '#components/ui/route-modal'
import { clientFetch } from '#lib/api/client'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import { notFound } from 'next/navigation'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'EditMaintenanceModal' })

/**
 * Edit Maintenance Request Modal (Intercepting Route)
 */
export default async function EditMaintenanceModal({
	params
}: {
	params: Promise<{ id: string }>
}) {
	try {
		const { id } = await params
		const request = await clientFetch<MaintenanceRequest>(
			`${process.env.API_BASE_URL}/api/v1/maintenance/${id}`
		)

		if (!request?.id) {
			notFound()
		}

		return (
			<RouteModal className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<MaintenanceForm mode="edit" request={request} />
			</RouteModal>
		)
	} catch (error) {
		logger.error('Failed to fetch maintenance request', { error })
		notFound()
	}
}
