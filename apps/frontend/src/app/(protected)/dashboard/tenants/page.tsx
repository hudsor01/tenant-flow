import type { TenantWithLeaseInfo } from '@repo/shared'
import {
	CreditCard,
	TrendingUp,
	Users,
	MoreVertical,
	Eye,
	Edit3,
	Mail,
	Phone,
	Trash2,
	Plus
} from 'lucide-react'

// Server API
import { getTenantsPageData } from '@/lib/api/dashboard-server'

// UI Components
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

// Custom Components
import { ChartAreaInteractive } from '@/components/charts/chart-area-interactive'
import { MetricsCard } from '@/components/charts/metrics-card'
import { formatCurrency } from '@/lib/utils'

export default async function TenantsPage() {
	// Fetch data server-side WITH PRE-CALCULATED STATS
	// NO CLIENT-SIDE CALCULATIONS - all metrics from backend
	const { tenants, stats } = await getTenantsPageData()

	return (
		<div className="dashboard-root dashboard-main flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Tenant Metrics Cards - Using DB-calculated stats */}
			<div className="dashboard-section dashboard-cards-container grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
				<MetricsCard
					title="Total Tenants"
					value={stats.totalTenants || 0}
					description="All registered"
					icon={Users}
					colorVariant="primary"
				/>

				<MetricsCard
					title="Current Payments"
					value={`${stats.currentPayments}%`}
					description={`${stats.currentPayments} on time`}
					status="Good standing"
					statusIcon={TrendingUp}
					icon={CreditCard}
					colorVariant="success"
				/>

				<MetricsCard
					title="Active Leases"
					value={stats.activeTenants || 0}
					description="Currently active"
					icon={TrendingUp}
					colorVariant="success"
				/>

				<MetricsCard
					title="Average Rent"
					value={formatCurrency(stats.avgRent || 0)}
					description="Per tenant"
					icon={CreditCard}
					colorVariant="revenue"
				/>
			</div>

			{/* Tenants Content */}
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gradient-primary mb-2">
							Tenants Management
						</h1>
						<p className="text-muted-foreground">
							Manage your tenants and track lease information
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
						Add Tenant
					</Button>
				</div>

				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold">Tenant Directory</h2>
							<p className="text-muted-foreground mt-1">
								{tenants.length} tenants in your portfolio
							</p>
						</div>
					</div>

					{/* Interactive Chart */}
					<ChartAreaInteractive className="mb-6" />

					<div className="rounded-md border bg-card shadow-sm">
						<Table className="dashboard-table">
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableHead className="font-semibold">
										Name
									</TableHead>
									<TableHead className="font-semibold">Email</TableHead>
									<TableHead className="font-semibold">Phone</TableHead>
									<TableHead className="font-semibold">Property</TableHead>
									<TableHead className="font-semibold">Rent</TableHead>
									<TableHead className="font-semibold">Status</TableHead>
									<TableHead className="font-semibold text-right">
										Joined
									</TableHead>
									<TableHead className="font-semibold">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tenants?.length ? (
									tenants.map((tenant: TenantWithLeaseInfo) => {
										// All metrics come pre-calculated from backend
										// NO CLIENT-SIDE CALCULATIONS
										const propertyName = tenant.property?.name || '—'
										const rentAmount = tenant.currentLease?.rentAmount || 0

										return (
											<TableRow
												key={tenant.id}
												className="hover:bg-muted/30"
											>
												<TableCell className="font-medium">
													{tenant.name}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{tenant.email}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{tenant.phone || '—'}
												</TableCell>
												<TableCell>
													{propertyName}
												</TableCell>
												<TableCell>
													{rentAmount > 0 ? formatCurrency(rentAmount) : '—'}
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
												<TableCell className="text-right text-muted-foreground">
													{tenant.createdAt
														? new Date(
																tenant.createdAt
															).toLocaleDateString()
														: '—'}
												</TableCell>
												<TableCell>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="size-8"
															>
																<MoreVertical className="size-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem>
																<Eye className="size-4 mr-2" />
																View Details
															</DropdownMenuItem>
															<DropdownMenuItem>
																<Edit3 className="size-4 mr-2" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem>
																<Mail className="size-4 mr-2" />
																Send Email
															</DropdownMenuItem>
															<DropdownMenuItem>
																<Phone className="size-4 mr-2" />
																Call
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem className="text-destructive">
																<Trash2 className="size-4 mr-2" />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										)
									})
								) : (
									<TableRow>
										<TableCell colSpan={8} className="h-24 text-center">
											<div className="flex flex-col items-center gap-2">
												<Users className="size-12 text-muted-foreground/50" />
												<p className="text-muted-foreground">
													No tenants found.
												</p>
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
													Add First Tenant
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