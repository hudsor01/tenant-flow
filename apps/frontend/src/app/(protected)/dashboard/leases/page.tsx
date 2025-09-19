'use client'

import { useLeases, useLeaseStats } from '@/hooks/api/leases'
import type { Database } from '@repo/shared'
import { AlertTriangle, Calendar, Clock, FileText } from 'lucide-react'
import { ChartAreaInteractive } from 'src/components/chart-area-interactive'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import { LoadingSpinner } from 'src/components/ui/loading-spinner'
import { CreateLeaseDialog } from '@/components/leases/create-lease-dialog'
import { LeaseActionButtons } from '@/components/leases/lease-action-buttons'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from 'src/components/ui/table'

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
								<TableHead className="font-semibold">Lease ID</TableHead>
								<TableHead className="font-semibold">Tenant</TableHead>
								<TableHead className="font-semibold">Property & Unit</TableHead>
								<TableHead className="font-semibold">Lease Term</TableHead>
								<TableHead className="font-semibold">Monthly Rent</TableHead>
								<TableHead className="font-semibold">
									Security Deposit
								</TableHead>
								<TableHead className="font-semibold">Status</TableHead>
								<TableHead className="font-semibold">
									Days Until Expiry
								</TableHead>
								<TableHead className="font-semibold">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leasesData.map((lease: Lease) => (
								<TableRow key={lease.id} className="hover:bg-muted/30">
									<TableCell>
										<div className="flex items-center gap-2">
											<FileText className="size-4 text-muted-foreground" />
											<span className="font-medium">{lease.id}</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
												<span className="text-xs font-semibold text-primary">
													{lease.tenantId ? lease.tenantId.slice(0, 2) : 'N/A'}
												</span>
											</div>
											<span className="font-medium">
												{lease.tenantId || 'No Tenant'}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="font-medium">
												{lease.unitId || 'No Unit'}
											</div>
											<Badge variant="outline" className="text-xs">
												{lease.unitId ? `Unit ${lease.unitId}` : 'No Unit'}
											</Badge>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 text-sm">
											<Calendar className="size-3 text-muted-foreground" />
											<div className="space-y-1">
												<div>
													{lease.startDate
														? new Date(lease.startDate).toLocaleDateString()
														: 'No start date'}
												</div>
												<div className="text-muted-foreground">
													to{' '}
													{lease.endDate
														? new Date(lease.endDate).toLocaleDateString()
														: 'No end date'}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell className="font-medium">
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'USD'
										}).format(lease.rentAmount || 0)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'USD'
										}).format(lease.securityDeposit || 0)}
									</TableCell>
									<TableCell>
										{lease.status === 'ACTIVE' && (
											<Badge
												style={{
													backgroundColor: 'var(--chart-1)',
													color: 'hsl(var(--primary-foreground))'
												}}
											>
												Active
											</Badge>
										)}
										{lease.status === 'EXPIRED' && (
											<Badge
												style={{
													backgroundColor: 'var(--chart-5)',
													color: 'hsl(var(--primary-foreground))'
												}}
												className="flex items-center gap-1"
											>
												<AlertTriangle className="size-3" />
												Expired
											</Badge>
										)}
										{lease.status === 'TERMINATED' && (
											<Badge
												style={{
													backgroundColor: 'var(--chart-2)',
													color: 'hsl(var(--primary-foreground))'
												}}
											>
												Terminated
											</Badge>
										)}
										{!lease.status && (
											<Badge variant="outline">No Status</Badge>
										)}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Clock className="size-3 text-muted-foreground" />
											<span className="font-medium text-muted-foreground">
												Calculate in backend
											</span>
										</div>
									</TableCell>
									<TableCell>
										<LeaseActionButtons lease={lease} />
									</TableCell>
								</TableRow>
							))}
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
