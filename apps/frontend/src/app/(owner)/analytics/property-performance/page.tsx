'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/queries/analytics-queries'
import { Badge } from '#components/ui/badge'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend,
	StatDescription
} from '#components/ui/stat'
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
import {
	formatCurrency,
	formatNumber,
	formatPercentage
} from '#lib/formatters/currency'
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
import {
	Building2,
	TrendingUp,
	DollarSign,
	BarChart3,
	Users,
	Home
} from 'lucide-react'
import { useMemo } from 'react'

function TopPropertiesTable({
	properties
}: {
	properties: PropertyPerformanceEntry[]
}) {
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
				cell: ({ row }) => (
					<Badge variant="outline">{row.original.status}</Badge>
				)
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
						{row.original.bedrooms !== null &&
						row.original.bedrooms !== undefined
							? formatNumber(row.original.bedrooms)
							: '-'}
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
						{row.original.bathrooms !== null &&
						row.original.bathrooms !== undefined
							? formatNumber(row.original.bathrooms)
							: '-'}
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
							: '-'}
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
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col gap-2 mb-6">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-5 w-96" />
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-20 mb-2" />
						<Skeleton className="h-4 w-32" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-48 mb-2" />
					<Skeleton className="h-4 w-64 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-40 mb-6" />
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

export default function PropertyPerformancePage() {
	const { data, isLoading } = useQuery(
		analyticsQueries.propertyPerformancePageData()
	)

	if (isLoading) {
		return <PropertyPerformanceSkeleton />
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
	const hasData =
		metrics.totalProperties > 0 ||
		metrics.totalUnits > 0 ||
		performance.length > 0 ||
		units.length > 0

	if (!hasData) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="flex flex-col gap-2 mb-6">
						<h1 className="text-2xl font-semibold text-foreground">
							Property Performance
						</h1>
						<p className="text-muted-foreground">
							Monitor occupancy, revenue, and demand signals across your
							portfolio.
						</p>
					</div>
				</BlurFade>
				<BlurFade delay={0.2} inView>
					<Empty className="min-h-96 border rounded-lg">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Building2 />
							</EmptyMedia>
							<EmptyTitle>No property performance data yet</EmptyTitle>
							<EmptyDescription>
								Add properties and units to start tracking performance metrics
								across your portfolio.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</BlurFade>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col gap-2 mb-6">
					<h1 className="text-2xl font-semibold text-foreground">
						Property Performance
					</h1>
					<p className="text-muted-foreground">
						Monitor occupancy, revenue, and demand signals across your
						portfolio.
					</p>
				</div>
			</BlurFade>

			{/* Overview Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-primary)"
							colorTo="oklch(from var(--color-primary) l c h / 0.3)"
						/>
						<StatLabel>Total properties</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={metrics.totalProperties} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Building2 />
						</StatIndicator>
						<StatDescription>Tracked in workspace</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Average occupancy</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<NumberTicker
								value={metrics.averageOccupancy}
								duration={1500}
								decimalPlaces={1}
							/>
							<span className="text-lg">%</span>
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatTrend trend="neutral">
							<span className="text-muted-foreground">
								{formatNumber(metrics.occupiedUnits)} of{' '}
								{formatNumber(metrics.totalUnits)} occupied
							</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Best performer</StatLabel>
						<StatValue className="flex items-baseline text-base font-semibold truncate">
							{metrics.bestPerformer ?? '-'}
						</StatValue>
						<StatIndicator variant="icon" color="info">
							<Home />
						</StatIndicator>
						<StatDescription>Highest occupancy rate</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Monthly revenue</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker
								value={metrics.totalRevenue / 100}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<DollarSign />
						</StatIndicator>
						<StatDescription>Combined across properties</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<BlurFade delay={0.6} inView>
					<div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Occupancy & revenue by property
								</h3>
								<p className="text-sm text-muted-foreground">
									Compare current performance across the portfolio
								</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>
						<PropertyOccupancyChart data={performance} />
					</div>
				</BlurFade>

				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Portfolio KPIs</h3>
								<p className="text-sm text-muted-foreground">
									Highlights from unit-level statistics
								</p>
							</div>
							<TrendingUp className="w-5 h-5 text-muted-foreground" />
						</div>
						<div className="space-y-3">
							{unitStats.slice(0, 6).map(stat => (
								<div
									key={stat.label}
									className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
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
						</div>
					</div>
				</BlurFade>
			</div>

			{/* Second Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<BlurFade delay={0.8} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Visitor analytics
								</h3>
								<p className="text-sm text-muted-foreground">
									How prospective tenants engage with listings
								</p>
							</div>
							<Users className="w-5 h-5 text-muted-foreground" />
						</div>
						<VisitorAnalyticsChart data={visitorAnalytics} />
					</div>
				</BlurFade>

				<BlurFade delay={0.9} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Top properties</h3>
								<p className="text-sm text-muted-foreground">
									Key metrics for high-performing assets
								</p>
							</div>
							<Building2 className="w-5 h-5 text-muted-foreground" />
						</div>
						<TopPropertiesTable properties={performance} />
					</div>
				</BlurFade>
			</div>

			{/* Active Units Table */}
			<BlurFade delay={1.0} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">Active units</h3>
							<p className="text-sm text-muted-foreground">
								Recently updated unit information
							</p>
						</div>
						<Home className="w-5 h-5 text-muted-foreground" />
					</div>
					<ActiveUnitsTable units={units} />
				</div>
			</BlurFade>
		</div>
	)
}
