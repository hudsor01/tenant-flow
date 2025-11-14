import type { Metadata } from 'next'
import { requireSession } from '#lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { serverFetch } from '#lib/api/server'
import { Button } from '#components/ui/button'
import { Wrench } from 'lucide-react'
import Link from 'next/link'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'

import { MaintenanceViewClient } from './maintenance-view.client'

export const metadata: Metadata = {
	title: 'Maintenance | TenantFlow',
	description: 'Stay on top of maintenance requests and keep residents updated on progress'
}

export default async function MaintenancePage() {
	// Server-side auth - NO client flash, instant 307 redirect
	const { user } = await requireSession()

const logger = createLogger({ component: 'MaintenancePage', userId: user.id })

	// Server Component: Fetch data on server during RSC render
	let requests: MaintenanceRequestResponse['data'] = []

	try {
		// Production pattern: Server Component with explicit token
		const result: MaintenanceRequestResponse = await serverFetch('/api/v1/maintenance')
		requests = Array.isArray(result?.data) ? result.data : []
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch maintenance requests for MaintenancePage', {
			error: err instanceof Error ? err.message : String(err)
		})
		// Ensure requests is always an array
		requests = []
	}

	return (
		<main role="main" className="space-y-10">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
				<p className="text-muted-foreground">Stay on top of maintenance requests and keep residents updated on progress.</p>
			</div>

			<div>
				<Button asChild>
					<Link href="/manage/maintenance/new">
						<Wrench className="size-4 mr-2" />
						New Request
					</Link>
				</Button>
			</div>

			{/* Client Component for View Switcher and Data Display */}
			<MaintenanceViewClient initialRequests={requests} />
		</main>
	)
}