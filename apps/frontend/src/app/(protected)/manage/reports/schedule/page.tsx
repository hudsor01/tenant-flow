import type { Metadata } from 'next'
import { requireSession } from '#lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Calendar } from 'lucide-react'
import type { ScheduledReport } from '#lib/api/reports-client'
import { getSchedules } from './actions'
import { ScheduleReportsClient } from './schedule-reports.client'

export const metadata: Metadata = {
	title: 'Schedule Reports | TenantFlow',
	description: 'Automate report generation with recurring schedules'
}

export default async function ScheduleReportsPage() {
	// Server-side auth - NO client flash, instant 307 redirect
	const { user } = await requireSession()
	const logger = createLogger({ component: 'ScheduleReportsPage', userId: user.id })

	// Server Component: Fetch data on server during RSC render
	let schedules: ScheduledReport[] = []

	try {
		schedules = await getSchedules()
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch schedules for ScheduleReportsPage', {
			error: err instanceof Error ? err.message : String(err)
		})
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Schedule Reports</h1>
				<p className="text-muted-foreground">
					Automate report generation with recurring schedules
				</p>
			</div>

			{/* Client Component for Form and Mutations */}
			<ScheduleReportsClient initialSchedules={schedules} />

			<Card>
				<CardHeader>
					<CardTitle>Active Schedules</CardTitle>
					<CardDescription>
						{schedules.length}{' '}
						{schedules.length === 1 ? 'schedule' : 'schedules'} configured
					</CardDescription>
				</CardHeader>
				<CardContent>
					{schedules.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Calendar className="mb-4 size-12 text-muted-foreground" />
							<h3 className="mb-2 text-lg font-semibold">No schedules yet</h3>
							<p className="text-sm text-muted-foreground">
								Create your first scheduled report above
							</p>
						</div>
					) : (
						<div id="schedules-table-container">
							{/* Table will be rendered by client component */}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
