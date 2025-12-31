import type { Metadata } from 'next'
import { MaintenanceViewClient } from '#components/maintenance/maintenance-view.client'

export const metadata: Metadata = {
	title: 'Maintenance | TenantFlow',
	description:
		'Stay on top of maintenance requests and keep residents updated on progress'
}

export default function MaintenancePage() {
	return <MaintenanceViewClient />
}
