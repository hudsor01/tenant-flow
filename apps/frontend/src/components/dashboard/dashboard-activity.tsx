import { getDashboardActivity } from '@/app/actions/dashboard'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

interface ActivityRow {
	type: string
	action: string
	details: string
	timestamp: string
}

export async function DashboardActivity() {
	const result = await getDashboardActivity()

	// Use fallback if fetch failed
	const activity = result.success ? result.data : { activities: [] }
	const chartData: never[] = [] // TODO: Add chart data endpoint

	return (
		<DashboardClient
			chartData={chartData}
			activityData={(activity?.activities || []) as ActivityRow[]}
		/>
	)
}