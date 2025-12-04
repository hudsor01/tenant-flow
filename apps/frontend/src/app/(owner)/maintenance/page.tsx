import type { Metadata } from 'next'
import { Button } from '#components/ui/button'
import { Wrench } from 'lucide-react'
import Link from 'next/link'

import { MaintenanceViewClient } from './maintenance-view.client'

export const metadata: Metadata = {
	title: 'Maintenance | TenantFlow',
	description: 'Stay on top of maintenance requests and keep residents updated on progress'
}

export default function MaintenancePage() {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
				<p className="text-muted-foreground">Stay on top of maintenance requests and keep residents updated on progress.</p>
			</div>

			<div>
				<Button asChild>
					<Link href="/maintenance/new">
						<Wrench className="size-4 mr-2" />
						New Request
					</Link>
				</Button>
			</div>

			{/* Client Component for View Switcher and Data Display */}
			<MaintenanceViewClient />
		</div>
	)
}