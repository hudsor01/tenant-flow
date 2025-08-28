import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { MaintenanceDataTable } from '@/components/maintenance/maintenance-data-table'
import { MaintenanceStats } from '@/components/maintenance/maintenance-stats'
import { PageTracker } from '@/components/analytics/page-tracker'
import type { Metadata } from 'next/types'

export const metadata: Metadata = {
	title: 'Maintenance | TenantFlow',
	description:
		'Manage your property maintenance requests and track completion'
}

function MaintenanceHeader() {
	return (
		<div className="flex items-center justify-between">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
					Maintenance
				</h1>
				<p className="text-muted-foreground">
					Manage maintenance requests and track completion status
				</p>
			</div>
			<div className="flex gap-2">
				<Button variant="outline" size="sm">
					<i className="i-lucide-filter inline-block mr-2 h-4 w-4"  />
					Filter
				</Button>
				<Link href="/maintenance/new">
					<Button size="sm">
						<i className="i-lucide-plus inline-block mr-2 h-4 w-4"  />
						Add Request
					</Button>
				</Link>
			</div>
		</div>
	)
}

function MaintenanceSearch() {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex gap-4">
					<div className="relative flex-1">
						<i className="i-lucide-search inline-block text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform"  />
						<Input
							placeholder="Search requests by title, unit, or status..."
							className="pl-10"
						/>
					</div>
					<Button variant="outline">
						<i className="i-lucide-filter inline-block mr-2 h-4 w-4"  />
						Filters
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

function MaintenanceLoadingSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-8 w-16" />
						</CardHeader>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[...Array(5)].map((_, i) => (
							<div
								key={i}
								className="flex items-center space-x-4"
							>
								<Skeleton className="h-12 w-12 rounded-lg" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-[250px]" />
									<Skeleton className="h-4 w-[180px]" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default function MaintenancePage() {
	return (
		<div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
			<PageTracker pageName="maintenance" />
			<MaintenanceHeader />

			<Suspense
				fallback={
					<div className="grid gap-4 md:grid-cols-4">
						{[...Array(4)].map((_, i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-8 w-16" />
								</CardHeader>
							</Card>
						))}
					</div>
				}
			>
				<MaintenanceStats />
			</Suspense>

			<MaintenanceSearch />

			<Suspense fallback={<MaintenanceLoadingSkeleton />}>
				<MaintenanceDataTable />
			</Suspense>
		</div>
	)
}
