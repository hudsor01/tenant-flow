import { MaintenanceForm } from '#components/maintenance/maintenance-form.client'
import { serverFetch } from '#lib/api/server'
import { requireSession } from '#lib/server-auth'
import type { MaintenanceRequest } from '@repo/shared/types/core'

interface MaintenanceEditPageProps {
	params: Promise<{ id: string }>
}

export default async function MaintenanceEditPage({
	params
}: MaintenanceEditPageProps) {
	const { id } = await params
	await requireSession()

	// Fetch maintenance request data on server
	const request = await serverFetch<MaintenanceRequest>(
		`/api/v1/maintenance-requests/${id}`
	)

	return (
		<div className="mx-auto w-full max-w-4xl space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Edit maintenance request
				</h1>
				<p className="text-muted-foreground">
					Update request details and communicate changes with your team.
				</p>
			</div>
			<MaintenanceForm
				mode="edit"
				request={request}
				onSuccess={() => {
					if (typeof window !== 'undefined') {
						window.history.back()
					}
				}}
			/>
		</div>
	)
}
