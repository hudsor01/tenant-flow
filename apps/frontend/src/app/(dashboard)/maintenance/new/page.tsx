import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MaintenanceForm } from '@/components/maintenance/maintenance-form'
import { PageTracker } from '@/components/analytics/page-tracker'
import type { Metadata } from 'next/types'

export const metadata: Metadata = {
	title: 'Create Maintenance Request | TenantFlow',
	description: 'Create a new maintenance request for your property'
}

function NewMaintenanceHeader() {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center space-x-4">
				<Link href="/maintenance">
					<Button variant="outline" size="sm">
						<i className="i-lucide-arrow-left mr-2 h-4 w-4"  />
						Back to Maintenance
					</Button>
				</Link>
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
						Create Maintenance Request
					</h1>
					<p className="text-muted-foreground">
						Submit a new maintenance request for your property
					</p>
				</div>
			</div>
		</div>
	)
}

export default function NewMaintenancePage() {
	return (
		<div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
			<PageTracker pageName="maintenance-new" />
			<NewMaintenanceHeader />

			<div className="mx-auto max-w-2xl">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<div className="bg-primary op-10 rounded-lg p-2">
								<i className="i-lucide-wrench text-primary h-5 w-5"  />
							</div>
							Request Information
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Suspense
							fallback={
								<div className="space-y-4">
									<div className="h-10 w-full animate-pulse rounded bg-gray-2" />
									<div className="h-10 w-full animate-pulse rounded bg-gray-2" />
									<div className="h-10 w-full animate-pulse rounded bg-gray-2" />
								</div>
							}
						>
							<MaintenanceForm requests={[]} properties={[]} units={[]} />
						</Suspense>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
