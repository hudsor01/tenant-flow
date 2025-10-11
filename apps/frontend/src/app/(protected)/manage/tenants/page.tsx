'use client'

import { TenantsTable } from '../../tenant/tenants-table.client'

export default function TenantsPage() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">
						Manage your property tenants and their lease information.
					</p>
				</div>
			</div>
			<TenantsTable />
		</div>
	)
}
