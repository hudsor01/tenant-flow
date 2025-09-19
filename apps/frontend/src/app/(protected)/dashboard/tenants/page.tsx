'use client'

import { useTenants, useTenantStats } from '@/hooks/api/tenants'
import { formatCurrency } from '@/lib/utils'
import type { TenantWithLeaseInfo } from '@repo/shared'
import {
	CreditCard,
	TrendingUp,
	Users
} from 'lucide-react'

import { AddTenantDialog } from '@/components/tenants/add-tenant-dialog'
import { TenantActionButtons } from '@/components/tenants/tenant-action-buttons'




export default function TenantsPage() {
	const { data: tenants, isLoading: tenantsLoading } = useTenants()
	const { data: stats, isLoading: statsLoading } = useTenantStats()

	// Loading state
	if (tenantsLoading || statsLoading) {
		return (
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-center h-32">
					<LoadingSpinner variant="primary" />
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

					<AddTenantDialog />
				</div>

				{/* Interactive Chart */}
				<ChartAreaInteractive className="mb-6" />

				{/* Tenants Table */}
				<div className="rounded-md border bg-card shadow-sm">
					<Table>
						<TableHeader className="bg-muted/50">
							<TableRow>
								<TableHead className="font-semibold">Name</TableHead>
								<TableHead className="font-semibold">Email</TableHead>
								<TableHead className="font-semibold">Property</TableHead>
								<TableHead className="font-semibold">Unit</TableHead>
								<TableHead className="font-semibold">Rent</TableHead>
								<TableHead className="font-semibold">Status</TableHead>
								<TableHead className="font-semibold">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tenantsData.map((tenant: TenantWithLeaseInfo) => (
								<TableRow key={tenant.id} className="hover:bg-muted/30">
									<TableCell className="font-medium">{tenant.name}</TableCell>
									<TableCell>{tenant.email}</TableCell>
									<TableCell>{tenant.property?.name || 'No property'}</TableCell>
									<TableCell>{tenant.unit?.unitNumber || 'No unit'}</TableCell>
									<TableCell>
										{tenant.monthlyRent ? `$${tenant.monthlyRent.toLocaleString()}` : 'N/A'}
									</TableCell>
									<TableCell>
										<span className={`px-2 py-1 rounded-full text-xs ${
											tenant.leaseStatus === 'active'
												? 'bg-green-100 text-green-800'
												: 'bg-gray-100 text-gray-800'
										}`}>
											{tenant.leaseStatus || 'No lease'}
										</span>
									</TableCell>
									<TableCell>
										<TenantActionButtons tenant={tenant} />
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
