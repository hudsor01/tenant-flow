import { DashboardPage } from '@/components/dashboard-01/page'
import { Suspense } from 'react'

// Enable ISR with 60 second revalidation for better performance
export const revalidate = 60

// Enable dynamic rendering for authenticated content
export const dynamic = 'force-dynamic'

export default async function Page() {
	return (
		<Suspense fallback={<div>Loading dashboard...</div>}>
			<DashboardPage />
		</Suspense>
	)
}
