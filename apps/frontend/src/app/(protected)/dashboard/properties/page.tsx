import type { PropertyWithUnits } from '@repo/shared'
import { Building, DollarSign, Plus, TrendingUp } from 'lucide-react'

// Server API
import { getPropertiesPageData } from '@/lib/api/dashboard-server'

// UI Components
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

// Custom Components
import { MetricsCard } from '@/components/charts/metrics-card'
import { ChartAreaInteractive } from '@/components/dashboard-01/chart-area-interactive'
import { PropertyEditViewButtons } from '@/components/properties/edit-button'

export default async function PropertiesPage({
	searchParams
}: {
	searchParams: Promise<{ status?: string }>
}) {
	const { status } = await searchParams

	// Fetch data server-side WITH PRE-CALCULATED STATS
	// NO CLIENT-SIDE CALCULATIONS - all metrics from backend
	const { properties, stats } = await getPropertiesPageData(status)

	return (
		<div className="dashboard-root dashboard-main flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Properties Metrics Cards */}
			<div className="dashboard-section dashboard-cards-container grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-3">
				<MetricsCard
					title="Total Properties"
					value={stats.totalProperties}
					description="Active portfolio properties"
					icon={Building}
					colorVariant="property"
				/>

				<MetricsCard
					title="Occupancy Rate"
					value={`${(stats.occupancyRate ?? 0).toFixed(1)}%`}
					description={`${stats.occupiedUnits} of ${stats.totalUnits} units occupied`}
					status="Stable occupancy rate"
					statusIcon={TrendingUp}
					icon={TrendingUp}
					colorVariant="success"
				/>

				<MetricsCard
					title="Monthly Revenue"
					value={new Intl.NumberFormat('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0
					}).format(stats.totalRevenue)}
					description="Total rent from all units"
					icon={DollarSign}
					colorVariant="revenue"
				/>
			</div>

			{/* Properties Content */}
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gradient-primary mb-2">
							Properties Portfolio
						</h1>
						<p className="text-muted-foreground">
							Manage your property portfolio and track performance
						</p>
					</div>

					<div className="flex items-center gap-2">
						<Select defaultValue={status ?? 'ALL'}>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="Filter status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All</SelectItem>
								<SelectItem value="ACTIVE">Active</SelectItem>
								<SelectItem value="UNDER_CONTRACT">Under Contract</SelectItem>
								<SelectItem value="SOLD">Sold</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold">Portfolio Overview</h2>
							<p className="text-muted-foreground mt-1">
								{properties.length} properties in your portfolio
							</p>
						</div>
						<Button
							variant="default"
							className="flex items-center gap-2"
							style={{
								background: 'var(--color-primary-brand)',
								color: 'white',
								borderRadius: 'var(--radius-medium)',
								padding: 'var(--spacing-2) var(--spacing-4)',
								transition: 'all var(--duration-quick) var(--ease-smooth)'
							}}
						>
							<Plus className="size-4" />
							New Property
						</Button>
					</div>

					{/* Interactive Chart */}
					<ChartAreaInteractive className="mb-6" />

					<div className="rounded-md border bg-card shadow-sm">
						<Table className="dashboard-table">
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableHead className="font-semibold">Property Name</TableHead>
									<TableHead className="font-semibold">Address</TableHead>
									<TableHead className="font-semibold">Type</TableHead>
									<TableHead className="font-semibold">Status</TableHead>
									<TableHead className="font-semibold">Units</TableHead>
									<TableHead className="font-semibold text-right">
										Created
									</TableHead>
									<TableHead className="font-semibold">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{properties?.length ? (
									properties.map((property: PropertyWithUnits) => {
										// All metrics come pre-calculated from backend
										// NO CLIENT-SIDE CALCULATIONS
										return (
											<TableRow key={property.id} className="hover:bg-muted/30">
												<TableCell className="font-medium">
													{property.name}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{property.address}
												</TableCell>
												<TableCell>
													<Badge variant="outline" className="capitalize">
														{property.propertyType
															?.toLowerCase()
															.replace('_', ' ')}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge
														style={{
															backgroundColor: 'var(--chart-1)',
															color: 'hsl(var(--primary-foreground))'
														}}
													>
														Active
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<span className="font-medium">
															{property.occupiedUnits}/{property.totalUnits}
														</span>
														<Badge variant="secondary" className="text-xs">
															{property.occupancyRate?.toFixed(0) ?? '0'}%
														</Badge>
													</div>
												</TableCell>
												<TableCell className="text-right text-muted-foreground">
													{property.createdAt
														? new Date(property.createdAt).toLocaleDateString()
														: '—'}
												</TableCell>
												<TableCell>
													<PropertyEditViewButtons property={property} />
												</TableCell>
											</TableRow>
										)
									})
								) : (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center">
											<div className="flex flex-col items-center gap-2">
												<Building className="size-12 text-muted-foreground/50" />
												<p className="text-muted-foreground">
													No properties found.
												</p>
												<Button
													variant="default"
													className="flex items-center gap-2"
													style={{
														background: 'var(--color-primary-brand)',
														color: 'white',
														borderRadius: 'var(--radius-medium)',
														padding: 'var(--spacing-2) var(--spacing-4)',
														transition:
															'all var(--duration-quick) var(--ease-smooth)'
													}}
												>
													<Plus className="size-4" />
													New Property
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>
		</div>
	)
}
