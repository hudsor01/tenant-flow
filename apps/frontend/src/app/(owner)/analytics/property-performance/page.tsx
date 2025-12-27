'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/queries/analytics-queries'
import { Badge } from '#components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Skeleton } from '#components/ui/skeleton'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription
} from '#components/ui/empty'
import { formatCurrency, formatNumber, formatPercentage } from '#lib/formatters/currency'
import type {
	PropertyPerformanceSummary,
	PropertyPerformanceEntry,
	PropertyUnitDetail,
	UnitStatisticEntry,
	VisitorAnalyticsResponse
} from '@repo/shared/types/analytics'
import {
	PropertyOccupancyChart,
	VisitorAnalyticsChart
} from './property-charts'
import { Building2 } from 'lucide-react'
import { useMemo } from 'react'

function TopPropertiesTable({ properties }: { properties: PropertyPerformanceEntry[] }) {
	const columns: ColumnDef<PropertyPerformanceEntry>[] = useMemo(
		() => [
			{
				accessorKey: 'propertyName',
				header: 'Property',
				meta: {
					label: 'Property Name',
					variant: 'text',
					placeholder: 'Search property...'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'occupancyRate',
				header: 'Occupancy',
				meta: {
					label: 'Occupancy Rate',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatPercentage(row.original.occupancyRate)}
					</div>
				)
			},
			{
				id: 'units',
				header: 'Units',
				cell: ({ row }) => (
					<div className="text-right">
						{formatNumber(row.original.occupiedUnits)}/
						{formatNumber(row.original.totalUnits)}
					</div>
				)
			},
			{
				accessorKey: 'monthlyRevenue',
				header: 'Monthly revenue',
				meta: {
					label: 'Monthly Revenue',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatCurrency(row.original.monthlyRevenue)}
					</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: properties,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 6
			}
		}
	})

	if (!properties.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No property data available
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}

function ActiveUnitsTable({ units }: { units: PropertyUnitDetail[] }) {
	const columns: ColumnDef<PropertyUnitDetail>[] = useMemo(
		() => [
			{
				accessorKey: 'unit_number',
				header: 'Unit',
				meta: {
					label: 'Unit Number',
					variant: 'text',
					placeholder: 'Search unit...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="flex flex-col">
						<span className="font-medium">{row.original.unit_number}</span>
						<span className="text-caption">{row.original.property_id}</span>
					</div>
				)
			},
			{
				accessorKey: 'status',
				header: 'Status',
				meta: {
					label: 'Status',
					variant: 'text',
					placeholder: 'Search status...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>
			},
			{
				accessorKey: 'bedrooms',
				header: 'Bedrooms',
				meta: {
					label: 'Bedrooms',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.bedrooms !== null && row.original.bedrooms !== undefined
							? formatNumber(row.original.bedrooms)
							: '—'}
					</div>
				)
			},
			{
				accessorKey: 'bathrooms',
				header: 'Bathrooms',
				meta: {
					label: 'Bathrooms',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.bathrooms !== null && row.original.bathrooms !== undefined
							? formatNumber(row.original.bathrooms)
							: '—'}
					</div>
				)
			},
			{
				accessorKey: 'rent',
				header: 'Rent',
				meta: {
					label: 'Monthly Rent',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.rent !== null && row.original.rent !== undefined
							? formatCurrency(row.original.rent)
							: '—'}
					</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: units,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 8
			}
		}
	})

	if (!units.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No unit data available
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}

function PropertyPerformanceSkeleton() {
	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>Property Performance</h1>
						<p className="text-muted-foreground">
							Monitor occupancy, revenue, and demand signals across your portfolio.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-32" />
								</CardHeader>
								<CardContent className="pt-0">
									<Skeleton className="h-8 w-20" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>
			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<Card className="xl:col-span-2">
							<CardHeader>
								<Skeleton className="h-5 w-48" />
								<Skeleton className="h-4 w-64" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-64 w-full" />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-40" />
							</CardHeader>
							<CardContent className="space-y-4 pt-0">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</div>
	)
}

export default function PropertyPerformancePage() {
	const { data, isLoading, isError } = useQuery(analyticsQueries.propertyPerformancePageData())

	if (isLoading) {
		return <PropertyPerformanceSkeleton />
	}

	if (isError) {
		return (
			<div className="@container/main flex min-h-screen w-full flex-col">
				<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1>Property Performance</h1>
							<p className="text-muted-foreground">
								Monitor occupancy, revenue, and demand signals across your portfolio.
							</p>
						</div>
						<Card className="border-destructive bg-destructive/10">
							<CardContent className="p-4">
								<p className="text-sm text-destructive">
									Unable to load property performance data. Please try again later.
								</p>
							</CardContent>
						</Card>
					</div>
				</section>
			</div>
		)
	}

	// Type assertions for property performance data
	const metrics = (data?.metrics ?? {}) as PropertyPerformanceSummary
	const performance = (data?.performance ?? []) as PropertyPerformanceEntry[]
	const units = (data?.units ?? []) as PropertyUnitDetail[]
	const unitStats = (data?.unitStats ?? []) as UnitStatisticEntry[]
	const visitorAnalytics = (data?.visitorAnalytics ?? {
		summary: {
			totalVisits: 0,
			totalInquiries: 0,
			totalConversions: 0,
			conversionRate: 0
		},
		timeline: []
	}) as VisitorAnalyticsResponse

	// Show empty state when no meaningful data exists
	const hasData = metrics.totalProperties > 0 ||
		metrics.totalUnits > 0 ||
		performance.length > 0 ||
		units.length > 0

	if (!hasData) {
		return (
			<div className="@container/main flex min-h-screen w-full flex-col">
				<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1>Property Performance</h1>
							<p className="text-muted-foreground">
								Monitor occupancy, revenue, and demand signals across your portfolio.
							</p>
						</div>
					</div>
				</section>
				<section className="flex-1 p-6">
					<div className="mx-auto max-w-400 px-4 lg:px-6">
						<Empty className="min-h-96 border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Building2 />
								</EmptyMedia>
								<EmptyTitle>No property performance data yet</EmptyTitle>
								<EmptyDescription>
									Add properties and units to start tracking performance metrics across your portfolio.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</div>
				</section>
			</div>
		)
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section
				className="border-b bg-background p-6 border-(--color-fill-tertiary)"
			>
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>
							Property Performance
						</h1>
						<p className="text-muted-foreground">
							Monitor occupancy, revenue, and demand signals across your
							portfolio.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card>
							<CardHeader>
								<CardTitle>Total properties</CardTitle>
								<CardDescription>Tracked in this workspace</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="typography-h2 tabular-nums">
									{formatNumber(metrics.totalProperties)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Average occupancy</CardTitle>
								<CardDescription>Portfolio-wide</CardDescription>
							</CardHeader>
							<CardContent className="flex items-end justify-between pt-0">
								<p className="typography-h2 tabular-nums">
									{formatPercentage(metrics.averageOccupancy)}
								</p>
								<Badge variant="outline" className="text-xs">
									{formatNumber(metrics.occupiedUnits)} of{' '}
									{formatNumber(metrics.totalUnits)} units occupied
								</Badge>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Best performer</CardTitle>
								<CardDescription>Highest occupancy rate</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="typography-h2 tabular-nums">
									{metrics.bestPerformer ?? '—'}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Monthly revenue</CardTitle>
								<CardDescription>Combined across properties</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="typography-h2 tabular-nums">
									{formatCurrency(metrics.totalRevenue)}
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<Card className="xl:col-span-2">
							<CardHeader>
								<CardTitle>Occupancy & revenue by property</CardTitle>
								<CardDescription>
									Compare current performance across the portfolio
								</CardDescription>
							</CardHeader>
							<CardContent>
								<PropertyOccupancyChart data={performance} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Portfolio KPIs</CardTitle>
								<CardDescription>
									Highlights from unit-level statistics
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4 pt-0">
								{unitStats.slice(0, 6).map(stat => (
									<div
										key={stat.label}
										className="flex-between rounded-lg border px-3 py-2 text-sm"
									>
										<span className="text-muted-foreground">{stat.label}</span>
										<span className="font-medium tabular-nums">
											{formatNumber(stat.value)}
											{stat.trend !== null && stat.trend !== undefined && (
												<Badge
													variant={stat.trend >= 0 ? 'outline' : 'destructive'}
													className="ml-2"
												>
													{formatPercentage(Math.abs(stat.trend))}
												</Badge>
											)}
										</span>
									</div>
								))}
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Visitor analytics</CardTitle>
								<CardDescription>
									How prospective tenants engage with listings
								</CardDescription>
							</CardHeader>
							<CardContent>
								<VisitorAnalyticsChart data={visitorAnalytics} />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Top properties</CardTitle>
								<CardDescription>
									Key metrics for high-performing assets
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3 pt-0">
								<TopPropertiesTable properties={performance} />
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Active units</CardTitle>
							<CardDescription>
								Recently updated unit information
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-0">
							<ActiveUnitsTable units={units} />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}
