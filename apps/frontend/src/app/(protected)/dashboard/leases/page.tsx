import { CreateLeaseDialog } from '@/components/leases/create-lease-dialog'
import { LeaseActionButtons } from '@/components/leases/lease-action-buttons'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getLeasesPageData } from '@/lib/api/dashboard-server'
import { statusClasses } from '@/lib/design-system'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import type { Database } from '@repo/shared/types/supabase-generated'
import { FileText, TrendingDown, TrendingUp } from 'lucide-react'

type Lease = Database['public']['Tables']['Lease']['Row']

export default async function LeasesPage() {
	const { leases, stats } = await getLeasesPageData()

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			{/* Top Metric Cards Section - Matching Dashboard */}
			<div
				className="border-b bg-background"
				style={{
					padding: 'var(--dashboard-content-padding)',
					borderColor: 'var(--color-fill-tertiary)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px]"
					style={{
						paddingTop: 'var(--spacing-4)',
						paddingBottom: 'var(--spacing-4)'
					}}
				>
					<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
						{/* Total Leases */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Total Leases</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.totalLeases}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										All agreements
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Portfolio growing <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									All lease agreements
								</div>
							</CardFooter>
						</Card>

						{/* Active Leases */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Active Leases</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.activeLeases}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										Currently active
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Strong performance <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Active lease agreements
								</div>
							</CardFooter>
						</Card>

						{/* Expiring Soon */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Expiring Soon</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.expiringLeases}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{stats.expiringLeases > 0 ? (
											<TrendingDown />
										) : (
											<TrendingUp />
										)}
										Within 60 days
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									{stats.expiringLeases > 0 ? (
										<>
											Action needed <TrendingDown className="size-4" />
										</>
									) : (
										<>
											All current <TrendingUp className="size-4" />
										</>
									)}
								</div>
								<div className="text-muted-foreground">
									Requiring renewal attention
								</div>
							</CardFooter>
						</Card>

						{/* Monthly Revenue */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Monthly Revenue</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{formatCurrency(stats.totalMonthlyRent)}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										{formatPercentage(4.2)}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Trending up <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">From all leases</div>
							</CardFooter>
						</Card>
					</div>
				</div>
			</div>

			{/* Main Content Section - Matching Dashboard */}
			<div
				className="flex-1"
				style={{
					padding: 'var(--dashboard-content-padding)',
					paddingTop: 'var(--dashboard-section-gap)',
					paddingBottom: 'var(--dashboard-section-gap)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px] space-y-8"
					style={
						{
							'--space-y': 'var(--dashboard-section-gap)'
						} as React.CSSProperties
					}
				>
					{/* Leases Data Table */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
							<div className="space-y-1">
								<CardTitle>Lease Agreements</CardTitle>
								<CardDescription>
									Track lease agreements, renewals, and expirations
								</CardDescription>
							</div>
							<CreateLeaseDialog />
						</CardHeader>
						<div className="px-6 pb-6">
							<div className="rounded-md border">
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
													<TableCell>
														{lease.propertyId || 'No Property'}
													</TableCell>
													<TableCell>
														{lease.unitId ? `Unit ${lease.unitId}` : 'No Unit'}
													</TableCell>
													<TableCell>
														{formatCurrency(lease.rentAmount || 0)}
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
															className={statusClasses(
																lease.status || 'UNKNOWN'
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
												<TableCell colSpan={7} className="h-96">
													<div className="flex flex-col items-center justify-center gap-4 text-center">
														<FileText className="size-12 text-muted-foreground" />
														<div className="space-y-2">
															<h3 className="text-lg font-semibold">
																No leases found
															</h3>
															<p className="text-sm text-muted-foreground">
																Get started by creating your first lease
																agreement
															</p>
														</div>
														<CreateLeaseDialog />
													</div>
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
						</div>
					</Card>

					{/* Quick Actions Section - Matching Dashboard */}
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
							<CardDescription>Common lease management tasks</CardDescription>
						</CardHeader>
						<div className="p-6 pt-0">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<CreateLeaseDialog />
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	)
}
