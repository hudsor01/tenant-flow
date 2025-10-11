import { Suspense } from 'react'

import { LeasesTable } from './leases-table.client'

export default function LeasesPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Leases</h1>
				<p className="text-muted-foreground">
					Monitor active leases, review financial terms, and manage renewals.
				</p>
			</div>
			<Suspense
				fallback={
					<div className="animate-pulse text-muted-foreground">
						Loading leases...
					</div>
				}
			>
				<LeasesTable />
			</Suspense>
		</div>
	)
}
