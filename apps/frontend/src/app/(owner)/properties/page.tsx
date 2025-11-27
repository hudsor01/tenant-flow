import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { serverFetch } from '#lib/api/server'
import { getClaims } from '#lib/dal'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import { Building2, Plus, TrendingDown, TrendingUp } from 'lucide-react'
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
	const { claims } = await getClaims()

const logger = createLogger({ component: 'PropertiesPage', user_id: claims?.sub ?? 'unknown' })

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
		<div className="flex-1 flex flex-col gap-8">
			{/* Header Card - Card-based redesign with better visual hierarchy */}
			<Card className="border-2">
				<CardHeader className="pb-4">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
						{/* Title Section */}
						<div className="flex-1 space-y-2">
							<div className="flex items-center gap-3">
								<div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
									<Building2 className="size-6 text-primary" />
								</div>
								<div>
									<h1 className="text-3xl font-bold tracking-tight leading-none font-semibold">Properties</h1>
									<CardDescription className="text-base">
										Manage your property portfolio and track performance
									</CardDescription>
								</div>
							</div>
						</div>

						{/* Quick Stats - Compact horizontal layout */}
						<div className="flex flex-wrap gap-4 lg:gap-6">
							<div className="flex flex-col items-center justify-center rounded-lg border bg-card px-4 py-3 min-w-[100px]">
								<div className="text-2xl font-bold text-foreground">
									{stats.total ?? properties.length}
								</div>
								<div className="text-xs text-muted-foreground">Total</div>
							</div>
							<div className="flex flex-col items-center justify-center rounded-lg border bg-card px-4 py-3 min-w-[100px]">
								<div className="text-2xl font-bold text-foreground">
									{stats.occupied ?? 0}
								</div>
								<div className="text-xs text-muted-foreground">Occupied</div>
							</div>
							<div className="flex flex-col items-center justify-center rounded-lg border bg-card px-4 py-3 min-w-[100px]">
								<div className="text-2xl font-bold text-foreground">
									{stats.vacant ?? 0}
								</div>
								<div className="text-xs text-muted-foreground">Vacant</div>
							</div>
						</div>
					</div>
				</CardHeader>

				{/* Action Buttons - Properly spaced with visual hierarchy */}
				<CardFooter className="border-t bg-muted/20 pt-4">
					<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						{/* Left side - Quick info */}
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span className="font-medium">
								{stats.occupancyRate?.toFixed(0) ?? 0}% occupancy
							</span>
							<span>•</span>
							<span>${(stats.totalMonthlyRent ?? 0).toLocaleString()}/mo</span>
						</div>

						{/* Right side - Action buttons with proper hierarchy */}
						<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
							<PropertyBulkImportDialog />
							<Button asChild size="default" className="min-h-11">
								<Link href="/properties/new">
									<Plus className="size-4 mr-2" />
									New Property
								</Link>
							</Button>
						</div>
					</div>
				</CardFooter>
			</Card>

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
		</div>
	)
}
