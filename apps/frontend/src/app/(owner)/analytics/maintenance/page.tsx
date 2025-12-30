import { redirect } from 'next/navigation'

// Maintenance analytics has been moved to the main maintenance page under the "Insights" tab
export default function MaintenanceAnalyticsRedirect() {
	redirect('/maintenance?tab=insights')
}
