/**
 * Server Actions for Reports Schedule Page
 * These functions run on the server and can be called from Server Components
 */

import type { ScheduledReport } from '#lib/api/reports-client'
import { serverFetch } from '#lib/api/server'

/**
 * Fetch scheduled reports from the backend API
 * This runs on the server during SSR/ISR
 */
export async function getSchedules(): Promise<ScheduledReport[]> {
	try {
		const result = await serverFetch<{ data: ScheduledReport[] }>('/api/v1/reports/schedules')
		return result.data
	} catch (error) {
		// Log error but don't throw - gracefully degrade
		const { createLogger } = await import('@repo/shared/lib/frontend-logger')
		const logger = createLogger({ component: 'ReportsScheduleActions' })
		logger.error('Error fetching schedules', {
			error: error instanceof Error ? error.message : String(error)
		})
		return []
	}
}