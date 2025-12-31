import { redirect } from 'next/navigation'

// Occupancy analytics has been moved to the main properties page under the "Insights" tab
export default function OccupancyAnalyticsRedirect() {
	redirect('/properties?tab=insights')
}
