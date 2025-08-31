'use client'

// Avoid static generation; this page depends on runtime-authenticated data.
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { UnitsDataTable } from '@/components/properties/units/units-data-table'
import { UnitsStats } from '@/components/properties/units/units-stats'
import { PageTracker } from '@/components/analytics/page-tracker'
import { Plus , Search , Filter } from 'lucide-react'
function UnitsHeader() {
	return (
		<div className="flex items-center justify-between">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
					Units
				</h1>
				<p className="text-muted-foreground">
					Manage your property units and track occupancy status
				</p>
			</div>
			<div className="flex gap-2">
				<Button variant="outline" size="sm">
					<Filter className="  mr-2 h-4 w-4"  />
					Filter
				</Button>
				<Link href="/properties/units/new">
					<Button size="sm">
						<Plus className="  mr-2 h-4 w-4"  />
						Add Unit
					</Button>
				</Link>
			</div>
		</div>
	)
}

function UnitsSearch() {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex gap-4">
					<div className="relative flex-1">
						<Search className="  text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform"  />
						<Input
							placeholder="Search units by number, property, or status..."
							className="pl-10"
						/>
					</div>
					<Button variant="outline">
						<Filter className="  mr-2 h-4 w-4"  />
						Filters
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

function UnitsLoadingSkeleton() {
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
									<Skeleton className="h-4 w-[200px]" />
									<Skeleton className="h-4 w-[150px]" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default function UnitsPage() {
	return (
		<div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
			<PageTracker pageName="units" />
			<UnitsHeader />

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
				<UnitsStats />
			</Suspense>

			<UnitsSearch />

			<Suspense fallback={<UnitsLoadingSkeleton />}>
				<UnitsDataTable />
			</Suspense>
		</div>
	)
}
