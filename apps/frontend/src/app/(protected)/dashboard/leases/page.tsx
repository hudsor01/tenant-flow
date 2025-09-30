import { MetricsCard } from '@/components/charts/metrics-card'
import { ChartAreaInteractive } from '@/components/dashboard-01/chart-area-interactive'
import { CreateLeaseDialog } from '@/components/leases/create-lease-dialog'
import { LeaseActionButtons } from '@/components/leases/lease-action-buttons'
import { Badge } from '@/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getLeasesPageData } from '@/lib/api/dashboard-server'
import { cn } from '@/lib/utils'
import type { Database } from '@repo/shared/types/supabase-generated'
import { Clock, DollarSign, FileCheck, FileText } from 'lucide-react'

type Lease = Database['public']['Tables']['Lease']['Row']

const getLeaseStatusStyles = (status: string) => {
	const styles = {
		ACTIVE:
			'bg-[var(--color-system-green-10)] text-[var(--color-system-green)] border-[var(--color-system-green)]',
		EXPIRED:
			'bg-[var(--color-system-red-10)] text-[var(--color-system-red)] border-[var(--color-system-red)]',
		TERMINATED:
			'bg-[var(--color-fill-tertiary)] text-[var(--color-label-secondary)] border-[var(--color-border-secondary)]',
		PENDING:
			'bg-[var(--color-system-yellow-10)] text-[var(--color-system-yellow)] border-[var(--color-system-yellow)]'
	}
	return (
		styles[status as keyof typeof styles] ||
		'bg-[var(--color-fill-secondary)] text-[var(--color-label-tertiary)] border-[var(--color-border-secondary)]'
	)
}

export default async function LeasesPage() {
	// Fetch data server-side with stats
	const { leases, stats } = await getLeasesPageData()

	// All calculations done in database - no frontend business logic!

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Lease Metrics Cards */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-4">
				<MetricsCard
					title="Total Leases"
					value={stats.totalLeases}
					description="All agreements"
					icon={FileText}
					colorVariant="info"
				/>

				<MetricsCard
					title="Active Leases"
					value={stats.activeLeases}
					description="Currently active"
					icon={FileCheck}
					colorVariant="success"
				/>

				<MetricsCard
					title="Expiring Soon"
					value="0"
					description="Within 60 days"
					icon={Clock}
					colorVariant="warning"
				/>

				<MetricsCard
					title="Monthly Revenue"
					value={new Intl.NumberFormat('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0
					}).format(stats.totalMonthlyRent)}
					description="From all leases"
					icon={DollarSign}
					colorVariant="revenue"
				/>
			</div>

			{/* Content Section */}
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
							{leases.length > 0 ? (
								leases.map((lease: Lease) => (
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
											<Badge
												variant="outline"
												className={cn(
													getLeaseStatusStyles(lease.status || 'UNKNOWN')
												)}
											>
												{lease.status || 'Unknown'}
											</Badge>
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
			</div>
		</div>
	)
}
