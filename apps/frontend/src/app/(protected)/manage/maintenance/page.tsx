import { Suspense } from 'react'

import { MaintenanceTable } from './maintenance-table.client'

export default function MaintenancePage() {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
				<p className="text-muted-foreground">
					Stay on top of maintenance requests and keep residents updated on
					progress.
				</p>
			</div>
			<Suspense
				fallback={
					<div className="animate-pulse text-muted-foreground">
						Loading maintenance requests...
					</div>
				}
			>
				<MaintenanceTable />
			</Suspense>
		</div>
	)
}
