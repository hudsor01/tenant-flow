'use client'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { Loader } from '@/components/magicui/loader'
import { MetricsCard } from '@/components/metrics-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useTenants, useTenantStats } from '@/hooks/api/tenants'
import type { TenantWithLeaseInfo } from '@repo/shared'
import { formatCurrency } from '@/lib/utils'
import {
	Calendar,
	CreditCard,
	Mail,
	Phone,
	TrendingUp,
	Users
} from 'lucide-react'

export default function TenantsPage() {
	const { data: tenants, isLoading: tenantsLoading } = useTenants()
	const { data: stats, isLoading: statsLoading } = useTenantStats()

	// Loading state
	if (tenantsLoading || statsLoading) {
		return (
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-center h-32">
					<Loader />
				</div>
			</div>
		)
	}

	// Fallback to empty array/object if no data
	const tenantsData = tenants || []
	const statsData = stats || {
		totalTenants: 0,
		activeTenants: 0,
		currentPayments: 0,
		latePayments: 0,
		totalRent: 0,
		avgRent: 0,
		recentAdditions: 0,
		withContactInfo: 0
	}

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Tenant Metrics Cards - Using DB-calculated stats */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-4">
				<MetricsCard
					title="Total Tenants"
					value={statsData.totalTenants ?? 0}
					description="All registered"
					icon={Users}
					colorVariant="property"
				/>

				<MetricsCard
					title="Current Payments"
					value={statsData.currentPayments ?? 0}
					status="Up to date"
					statusIcon={TrendingUp}
					icon={CreditCard}
					colorVariant="success"
				/>

				<MetricsCard
					title="Late Payments"
					value={statsData.latePayments ?? 0}
					description="Need attention"
					icon={CreditCard}
					colorVariant="warning"
				/>

				<MetricsCard
					title="Avg Monthly Rent"
					value={formatCurrency(statsData.avgRent ?? 0)}
					description="Per tenant average"
					icon={TrendingUp}
					colorVariant="revenue"
				/>
			</div>

			{/* Tenants Content */}
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gradient-primary mb-2">
							Tenant Management
						</h1>
						<p className="text-muted-foreground">
							Manage tenant information, leases, and communications
						</p>
					</div>

					<Button
						className="flex items-center gap-2"
						style={{ backgroundColor: 'var(--chart-2)' }}
					>
						<Users className="size-4" />
						Add Tenant
					</Button>
				</div>

				{/* Interactive Chart */}
				<ChartAreaInteractive className="mb-6" />

				{/* Tenants Table */}
				<div className="rounded-md border bg-card shadow-sm">
					<Table>
						<TableHeader className="bg-muted/50">
							<TableRow>
								<TableHead className="font-semibold">Tenant</TableHead>
								<TableHead className="font-semibold">Contact</TableHead>
								<TableHead className="font-semibold">Unit</TableHead>
								<TableHead className="font-semibold">Property</TableHead>
								<TableHead className="font-semibold">Monthly Rent</TableHead>
								<TableHead className="font-semibold">Lease Period</TableHead>
								<TableHead className="font-semibold">Status</TableHead>
								<TableHead className="font-semibold">Payment</TableHead>
								<TableHead className="font-semibold">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
                        {tenantsData.map((tenant: TenantWithLeaseInfo) => (
								<TableRow key={tenant.id} className="hover:bg-muted/30">
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
												<span className="text-xs font-semibold text-primary">
													{tenant.name
														.split(' ')
														.map((n: string) => n[0])
														.join('')}
												</span>
											</div>
											<div>
												<div className="font-medium">{tenant.name}</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="flex items-center gap-2 text-sm">
												<Mail className="size-3 text-muted-foreground" />
												<span className="text-muted-foreground">
													{tenant.email}
												</span>
											</div>
											<div className="flex items-center gap-2 text-sm">
												<Phone className="size-3 text-muted-foreground" />
												<span className="text-muted-foreground">
													{tenant.phone}
												</span>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="font-medium">
											{tenant.unitDisplay}
										</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{tenant.propertyDisplay}
									</TableCell>
									<TableCell className="font-medium">
										{formatCurrency(tenant.monthlyRent)}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 text-sm text-muted-foreground">
											<Calendar className="size-3" />
											<span>
												{tenant.leaseStart
													? new Date(tenant.leaseStart).toLocaleDateString()
													: '—'}
												{' - '}
												{tenant.leaseEnd
													? new Date(tenant.leaseEnd).toLocaleDateString()
													: '—'}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge
											style={{
												backgroundColor:
													(tenant as { status?: string }).status === 'active'
														? 'var(--chart-1)'
														: 'var(--chart-5)',
												color: 'white'
											}}
											className="capitalize"
										>
											{(tenant as { status?: string }).status === 'notice_given'
												? 'Notice Given'
												: ((tenant as { status?: string }).status ?? 'Unknown')}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge
											style={{
												backgroundColor:
													tenant.paymentStatus === 'current'
														? 'var(--chart-1)'
														: 'var(--chart-10)',
												color: 'white'
											}}
											className="capitalize flex items-center gap-1"
										>
											<CreditCard className="size-3" />
											{tenant.paymentStatus}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Button variant="outline" size="sm">
												Edit
											</Button>
											<Button variant="outline" size="sm">
												View
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	)
}
