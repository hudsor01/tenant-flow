'use client'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useTenants, useTenantStats } from '@/hooks/api/tenants'
import { formatCurrency } from '@/lib/utils'
import type { TenantWithLeaseInfo } from '@repo/shared'
import { CreditCard, TrendingUp, Users } from 'lucide-react'

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
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
							<Users className="size-5 text-blue-600" />
						</div>
						<h3 className="font-semibold">Total Tenants</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{statsData.totalTenants ?? 0}
					</div>
					<p className="text-muted-foreground text-sm">All registered</p>
				</Card>

				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
							<CreditCard className="size-5 text-green-600" />
						</div>
						<h3 className="font-semibold">Current Payments</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{statsData.currentPayments ?? 0}
					</div>
					<div className="flex items-center gap-1 text-sm text-green-600">
						<TrendingUp className="size-4" />
						<span>Up to date</span>
					</div>
				</Card>

				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
							<CreditCard className="size-5 text-orange-600" />
						</div>
						<h3 className="font-semibold">Late Payments</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{statsData.latePayments ?? 0}
					</div>
					<p className="text-muted-foreground text-sm">Need attention</p>
				</Card>

				<Card className="p-6 border shadow-sm">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
							<TrendingUp className="size-5 text-purple-600" />
						</div>
						<h3 className="font-semibold">Avg Monthly Rent</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{formatCurrency(statsData.avgRent ?? 0)}
					</div>
					<p className="text-muted-foreground text-sm">Per tenant average</p>
				</Card>
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
									<TableCell>
										{tenant.property?.name || 'No property'}
									</TableCell>
									<TableCell>{tenant.unit?.unitNumber || 'No unit'}</TableCell>
									<TableCell>
										{tenant.monthlyRent
											? `$${tenant.monthlyRent.toLocaleString()}`
											: 'N/A'}
									</TableCell>
									<TableCell>
										<span
											className={`px-2 py-1 rounded-full text-xs ${
												tenant.leaseStatus === 'active'
													? 'bg-green-100 text-green-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
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
