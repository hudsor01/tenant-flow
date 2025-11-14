export const dynamic = 'force-dynamic'

import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { serverFetch } from '#lib/api/server'
import { requireSession } from '#lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import { Plus, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next/types'
import { PropertiesViewClient } from './properties-view.client'
import { PropertyBulkImportDialog } from './property-bulk-import-dialog'

export const metadata: Metadata = {
	title: 'Properties | TenantFlow',
	description: 'Manage your real estate properties and portfolio'
}

export default async function PropertiesPage() {
	// Server-side auth - NO client flash, instant 307 redirect
	const { user } = await requireSession()

const logger = createLogger({ component: 'PropertiesPage', userId: user.id })

	let properties: Property[] = []
	let stats: PropertyStats = {
		total: 0,
		occupied: 0,
		vacant: 0,
		occupancyRate: 0,
		totalMonthlyRent: 0,
		averageRent: 0
	}
	let hasError = false
	let errorMessage: string | null = null

	try {
		// Production pattern: Server Component with explicit token
		const [propertiesData, statsData] = await Promise.all([
			serverFetch<Property[]>('/api/v1/properties'),
			serverFetch<PropertyStats>('/api/v1/properties/stats')
		])
		properties = propertiesData
		stats = statsData
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch properties or stats for PropertiesPage', {
			error: err instanceof Error ? err.message : String(err)
		})
		hasError = true
		errorMessage = err instanceof Error ? err.message : 'Failed to load properties'
	}

	return (
		<main role="main" className="flex-1 flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Properties</h1>
					<p className="text-muted-foreground">
						Manage your property portfolio and track performance.
					</p>
				</div>
				<div className="flex gap-2">
					<PropertyBulkImportDialog />
					<Button asChild>
						<Link href="/manage/properties/new">
							<Plus className="size-4 mr-2" />
							New Property
						</Link>
					</Button>
				</div>
			</div>

			{/* Error Alert */}
			{hasError && errorMessage && (
				<Alert variant="destructive">
					<AlertTitle>Failed to load properties</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}

			{/* Stats Cards */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Properties</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.total ?? properties.length}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<TrendingUp className="size-3" />
								Portfolio growing
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Active properties <TrendingUp className="size-4" />
						</div>
						<div className="text-muted-foreground">
							Properties under management
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Occupancy Rate</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.occupancyRate?.toFixed(1) ?? 0}%
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								{(stats.occupancyRate ?? 0) >= 90 ? (
									<TrendingUp className="size-3" />
								) : (
									<TrendingDown className="size-3" />
								)}
								{(stats.occupancyRate ?? 0) >= 90 ? 'Excellent' : 'Good'}
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							{(stats.occupancyRate ?? 0) >= 90
								? 'Strong performance'
								: 'Room for improvement'}
							{(stats.occupancyRate ?? 0) >= 90 ? (
								<TrendingUp className="size-4" />
							) : (
								<TrendingDown className="size-4" />
							)}
						</div>
						<div className="text-muted-foreground">
							{stats.occupied ?? 0} occupied of {stats.total ?? 0} units total
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Vacant Units</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.vacant ?? 0}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								{(stats.vacant ?? 0) === 0 ? (
									<TrendingUp className="size-3" />
								) : (
									<TrendingDown className="size-3" />
								)}
								{(stats.vacant ?? 0) === 0 ? 'Fully occupied' : 'Available'}
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Available units
							<TrendingDown className="size-4" />
						</div>
						<div className="text-muted-foreground">
							Units ready for new tenants
						</div>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardDescription>Total Monthly Rent</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							${(stats.totalMonthlyRent ?? 0).toLocaleString()}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<TrendingUp className="size-3" />
								Revenue potential
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Monthly income <TrendingUp className="size-4" />
						</div>
						<div className="text-muted-foreground">
							Avg: ${(stats.averageRent ?? 0).toLocaleString()}/unit
						</div>
					</CardFooter>
				</Card>
			</div>

		{/* Properties View with Grid/Table Toggle */}
		<PropertiesViewClient data={properties} />
		</main>
	)
}
