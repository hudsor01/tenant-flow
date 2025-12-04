'use client'

import { Alert, AlertDescription, AlertTitle } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { useQuery } from '@tanstack/react-query'
import type { PropertyStats } from '@repo/shared/types/core'
import { Building2, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { PropertiesViewClient } from './properties-view.client'
import { PropertyBulkImportDialog } from './property-bulk-import-dialog'

const defaultStats: PropertyStats = {
	total: 0,
	occupied: 0,
	vacant: 0,
	occupancyRate: 0,
	totalMonthlyRent: 0,
	averageRent: 0
}

export function PropertiesPageClient() {
	const { data: propertiesResponse, isLoading: propertiesLoading, error: propertiesError } = useQuery(propertyQueries.list())
	const properties = propertiesResponse?.data ?? []
	const { data: stats = defaultStats, isLoading: statsLoading } = useQuery(propertyQueries.stats())

	const isLoading = propertiesLoading || statsLoading
	const hasError = !!propertiesError
	const errorMessage = propertiesError instanceof Error ? propertiesError.message : 'Failed to load properties'

	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col gap-8">
				{/* Header Card Skeleton */}
				<Skeleton className="h-48 rounded-xl" />
				{/* Stats Cards Skeleton */}
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-36 rounded-xl" />
					))}
				</div>
				{/* Properties Grid Skeleton */}
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<Skeleton key={i} className="h-64 rounded-xl" />
					))}
				</div>
			</div>
		)
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
							<div className="flex-col-center rounded-lg border bg-card px-4 py-3 min-w-[100px]">
								<div className="text-2xl font-bold text-foreground">
									{stats.total ?? properties.length}
								</div>
								<div className="text-caption">Total</div>
							</div>
							<div className="flex-col-center rounded-lg border bg-card px-4 py-3 min-w-[100px]">
								<div className="text-2xl font-bold text-foreground">
									{stats.occupied ?? 0}
								</div>
								<div className="text-caption">Occupied</div>
							</div>
							<div className="flex-col-center rounded-lg border bg-card px-4 py-3 min-w-[100px]">
								<div className="text-2xl font-bold text-foreground">
									{stats.vacant ?? 0}
								</div>
								<div className="text-caption">Vacant</div>
							</div>
						</div>
					</div>
				</CardHeader>

				{/* Action Buttons - Properly spaced with visual hierarchy */}
				<CardFooter className="border-t bg-muted/20 pt-4">
					<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						{/* Left side - Quick info */}
						<div className="flex items-center gap-2 text-muted">
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
			<PropertiesViewClient properties={properties} />
		</div>
	)
}
