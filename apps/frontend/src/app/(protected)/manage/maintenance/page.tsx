import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'

import { maintenanceApi } from '@/lib/api-client'
import { MaintenanceTable } from './maintenance-table.client'

export const metadata: Metadata = {
	title: 'Maintenance | TenantFlow',
	description: 'Manage maintenance requests and track resolution progress'
}

async function deleteMaintenanceRequest(requestId: string) {
	'use server'
	try {
		await maintenanceApi.remove(requestId)
		revalidatePath('/manage/maintenance')
		return { success: true }
	} catch (error) {
		// Server Action: console.error is acceptable for server-side logging
		// eslint-disable-next-line no-console, no-restricted-syntax
		console.error('[Server Action] Failed to delete maintenance request:', {
			requestId,
			error: error instanceof Error ? error.message : String(error)
		})
		throw error
	}
}

export default async function MaintenancePage() {
	// ✅ Server Component: Fetch data on server during RSC render
	const data = await maintenanceApi.list()

	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
				<p className="text-muted-foreground">
					Stay on top of maintenance requests and keep residents updated on
					progress.
				</p>
			</div>
			<MaintenanceTable initialData={data} deleteMaintenanceRequestAction={deleteMaintenanceRequest} />
		</div>
	)
}
