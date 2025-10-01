import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import { TrendingUp, Users } from 'lucide-react'

import { CreateTenantDialog } from '@/components/tenants/create-dialog'
import { TenantEditViewButtons } from '@/components/tenants/edit-button'
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
import { getTenantsPageData } from '@/lib/api/dashboard-server'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export default async function TenantsPage() {
	const { tenants, stats } = await getTenantsPageData()

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
						{/* Total Tenants */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Total Tenants</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.totalTenants || 0}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										{stats.activeTenants || 0} active
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Strong tenant retention <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									All registered tenants
								</div>
							</CardFooter>
						</Card>

						{/* Current Payments */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Current Payments %</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.currentPayments}%
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										On time
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Good standing <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Payment compliance rate
								</div>
							</CardFooter>
						</Card>

						{/* Active Leases */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Active Leases</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.activeTenants || 0}
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
									Healthy occupancy <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Tenants with active leases
								</div>
							</CardFooter>
						</Card>

						{/* Average Rent */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Avg Rent</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{formatCurrency(stats.avgRent || 0)}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										{formatPercentage(3.5)}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Market rate <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">Average per tenant</div>
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
					{/* Tenants Data Table */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
							<div className="space-y-1">
								<CardTitle>Tenant Directory</CardTitle>
								<CardDescription>
									Manage your tenants and track lease information
								</CardDescription>
							</div>
							<CreateTenantDialog />
						</CardHeader>
						<div className="px-6 pb-6">
							<div className="rounded-md border">
								<Table>
									<TableHeader className="bg-muted/50">
										<TableRow>
											<TableHead className="font-semibold">Name</TableHead>
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
														<TableCell>{propertyName}</TableCell>
														<TableCell>
															{rentAmount > 0
																? formatCurrency(rentAmount)
																: '—'}
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
															<TenantEditViewButtons tenant={tenant} />
														</TableCell>
													</TableRow>
												)
											})
										) : (
											<TableRow>
												<TableCell colSpan={8} className="h-96">
													<div className="flex flex-col items-center justify-center gap-4 text-center">
														<Users className="size-12 text-muted-foreground" />
														<div className="space-y-2">
															<h3 className="text-lg font-semibold">
																No tenants found
															</h3>
															<p className="text-sm text-muted-foreground">
																Get started by adding your first tenant
															</p>
														</div>
														<CreateTenantDialog />
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
							<CardDescription>Common tenant management tasks</CardDescription>
						</CardHeader>
						<div className="p-6 pt-0">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<CreateTenantDialog />
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	)
}
