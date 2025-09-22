'use client'

import { ChartAreaInteractive } from '@/components/charts/chart-area-interactive'
import { CreateLeaseDialog } from '@/components/leases/create-lease-dialog'
import { LeaseActionButtons } from '@/components/leases/lease-action-buttons'
import { LoadingSpinner } from '@/components/magicui/loading-spinner'
import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useLeases, useLeaseStats } from '@/hooks/api/leases'
import type { Database } from '@repo/shared'
import { AlertTriangle, FileText } from 'lucide-react'


type Lease = Database['public']['Tables']['Lease']['Row']

export default function LeasesPage() {
	const { data: leases, isLoading: leasesLoading } = useLeases()
	const { data: leaseStats, isLoading: statsLoading } = useLeaseStats()

	// Loading state
	if (leasesLoading || statsLoading) {
		return (
			<div className="flex items-center justify-center h-32">
				<LoadingSpinner variant="primary" />
			</div>
		)
	}

	// Fallback to empty array/object if no data
	const leasesData = leases || []
	const statsData = leaseStats || {
		totalLeases: 0,
		activeLeases: 0,
		totalMonthlyRent: 0,
		averageRent: 0
	}

	// All calculations now done in database - no frontend business logic!

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Lease Metrics Cards */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-4">
				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Total Leases
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-4)' }}
						/>
					</div>
					<div className="text-2xl font-bold">{statsData.totalLeases}</div>
					<p className="text-xs text-muted-foreground mt-1">All agreements</p>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Active Leases
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-1)' }}
						/>
					</div>
					<div className="text-2xl font-bold">{statsData.activeLeases}</div>
					<div className="text-xs mt-1" style={{ color: 'var(--chart-1)' }}>
						Currently active
					</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Expiring Soon
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-5)' }}
						/>
					</div>
					<div
						className="text-2xl font-bold"
						style={{ color: 'var(--chart-5)' }}
					>
						0
					</div>
					<div className="text-xs mt-1 text-muted-foreground">
						Within 60 days
					</div>
				</div>

				<div className="p-4 rounded-lg border bg-card shadow-sm">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Monthly Revenue
						</h3>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--chart-3)' }}
						/>
					</div>
					<div
						className="text-2xl font-bold"
						style={{ color: 'var(--chart-3)' }}
					>
						{new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD',
							maximumFractionDigits: 0
						}).format(statsData.totalMonthlyRent)}
					</div>
					<div className="text-xs mt-1 text-muted-foreground">
						From all leases
					</div>
				</div>
			</div>

			{/* Leases Content */}
			<div className="px-4 lg:px-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gradient-authority mb-2">
							Lease Management
						</h1>
						<p className="text-muted-foreground">
							Track lease agreements, renewals, and expirations
						</p>
					</div>

					<CreateLeaseDialog />
				</div>

				{/* Interactive Chart */}
				<ChartAreaInteractive className="mb-6" />

				{/* Leases Table */}
				<div className="rounded-md border bg-card shadow-sm">
					<Table>
						<TableHeader className="bg-muted/50">
							<TableRow>
								<TableHead className="font-semibold">Tenant</TableHead>
								<TableHead className="font-semibold">Property</TableHead>
								<TableHead className="font-semibold">Unit</TableHead>
								<TableHead className="font-semibold">Rent</TableHead>
								<TableHead className="font-semibold">Term</TableHead>
								<TableHead className="font-semibold">Status</TableHead>
								<TableHead className="font-semibold">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leasesData.length > 0 ? (
								leasesData.map((lease: Lease) => (
									<TableRow key={lease.id} className="hover:bg-muted/30">
										<TableCell className="font-medium">
											{lease.tenantId || 'No Tenant'}
										</TableCell>
										<TableCell>{lease.propertyId || 'No Property'}</TableCell>
										<TableCell>
											{lease.unitId ? `Unit ${lease.unitId}` : 'No Unit'}
										</TableCell>
										<TableCell>
											{new Intl.NumberFormat('en-US', {
												style: 'currency',
												currency: 'USD'
											}).format(lease.rentAmount || 0)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{lease.startDate
												? new Date(lease.startDate).toLocaleDateString()
												: 'No date'}{' '}
											-{' '}
											{lease.endDate
												? new Date(lease.endDate).toLocaleDateString()
												: 'No date'}
										</TableCell>
										<TableCell>
											<span
												className={`px-2 py-1 rounded-full text-xs ${
													lease.status === 'ACTIVE'
														? 'bg-[var(--color-system-green-10)] text-[var(--color-system-green)]'
														: lease.status === 'EXPIRED'
															? 'bg-[var(--color-system-red-10)] text-[var(--color-system-red)]'
															: lease.status === 'TERMINATED'
																? 'bg-[var(--color-fill-tertiary)] text-[var(--color-label-secondary)]'
																: 'bg-[var(--color-fill-secondary)] text-[var(--color-label-tertiary)]'
												}`}
											>
												{lease.status || 'No Status'}
											</span>
										</TableCell>
										<TableCell>
											<LeaseActionButtons lease={lease} />
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										<div className="flex flex-col items-center gap-2">
											<FileText className="size-12 text-muted-foreground/50" />
											<p className="text-muted-foreground">No leases found.</p>
											<CreateLeaseDialog />
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				{/* Upcoming Actions */}
				<div className="mt-6 p-4 rounded-lg border bg-card/50">
					<h3 className="font-semibold mb-3 flex items-center gap-2">
						<AlertTriangle className="size-4 text-accent" />
						Upcoming Actions Required
					</h3>
					<div className="space-y-2 text-sm">
						<div className="flex items-center justify-between p-2 rounded bg-accent/10 border border-accent/20">
							<span>
								Michael Chen's lease expires in 30 days - Contact for renewal
							</span>
							<Button size="sm" variant="outline">
								Contact
							</Button>
						</div>
						<div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20">
							<span>David Kim has renewal pending - Review and process</span>
							<Button size="sm" variant="outline">
								Process
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
