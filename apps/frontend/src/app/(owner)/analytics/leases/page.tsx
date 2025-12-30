import { redirect } from 'next/navigation'

// Lease analytics has been moved to the main leases page under the "Insights" tab
export default function LeaseAnalyticsRedirect() {
	redirect('/leases?tab=insights')
}
