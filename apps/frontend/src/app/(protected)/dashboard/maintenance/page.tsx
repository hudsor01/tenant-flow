import { MaintenanceActionButtons } from '@/components/maintenance/action-buttons'
import { CreateMaintenanceDialog } from '@/components/maintenance/create-maintenance-dialog'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '@/components/ui/empty'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getMaintenancePageData } from '@/lib/api/dashboard-server'
import { statusClasses } from '@/lib/design-system'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, Wrench } from 'lucide-react'

export default async function MaintenancePage() {
	const { data: maintenanceData, stats } = await getMaintenancePageData()

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
						{/* Pending Requests */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Pending Requests</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.open}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{stats.open > 0 ? <TrendingDown /> : <TrendingUp />}
										{stats.open > 0 ? 'Needs attention' : 'All clear'}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									{stats.open > 0 ? (
										<>
											Action required <TrendingDown className="size-4" />
										</>
									) : (
										<>
											No pending items <TrendingUp className="size-4" />
										</>
									)}
								</div>
								<div className="text-muted-foreground">Awaiting assignment</div>
							</CardFooter>
						</Card>

						{/* In Progress */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>In Progress</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.inProgress}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										Active work
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Being resolved <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Currently being worked on
								</div>
							</CardFooter>
						</Card>

						{/* Total Cost */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Total Cost</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{formatCurrency(stats.totalCost)}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										This month
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Monthly expenses <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">Maintenance costs</div>
							</CardFooter>
						</Card>

						{/* Avg Response Time */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Avg Response</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.avgResponseTimeHours > 0
										? `${stats.avgResponseTimeHours.toFixed(1)}h`
										: 'N/A'}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{stats.avgResponseTimeHours < 24 ? (
											<TrendingUp />
										) : (
											<TrendingDown />
										)}
										{stats.avgResponseTimeHours < 24
											? 'Fast'
											: 'Needs improvement'}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									{stats.avgResponseTimeHours < 24 ? (
										<>
											Quick response <TrendingUp className="size-4" />
										</>
									) : (
										<>
											Could be faster <TrendingDown className="size-4" />
										</>
									)}
								</div>
								<div className="text-muted-foreground">
									Average response time
								</div>
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
					{/* Maintenance Data Table */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
							<div className="space-y-1">
								<CardTitle>Active Maintenance Requests</CardTitle>
								<CardDescription>
									Track and manage all property maintenance requests
								</CardDescription>
							</div>
							{maintenanceData.length > 0 && <CreateMaintenanceDialog />}
						</CardHeader>
						{maintenanceData.length > 0 ? (
							<div className="px-6 pb-6">
								<div className="rounded-md border">
									<Table>
										<TableHeader className="bg-muted/50">
											<TableRow>
												<TableHead className="font-semibold">ID</TableHead>
												<TableHead className="font-semibold">
													Property
												</TableHead>
												<TableHead className="font-semibold">Unit</TableHead>
												<TableHead className="font-semibold">
													Category
												</TableHead>
												<TableHead className="font-semibold">
													Priority
												</TableHead>
												<TableHead className="font-semibold">Status</TableHead>
												<TableHead className="font-semibold">Created</TableHead>
												<TableHead className="font-semibold">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{maintenanceData.map(request => (
												<TableRow
													key={request.id}
													className="hover:bg-muted/30"
												>
													<TableCell className="font-medium">
														{request.id}
													</TableCell>
													<TableCell>
														{request.property?.name || 'No Property'}
													</TableCell>
													<TableCell>
														{request.unitId
															? `Unit ${request.unitId}`
															: 'No Unit'}
													</TableCell>
													<TableCell>
														{request.category || 'No Category'}
													</TableCell>
													<TableCell>
														{request.priority || 'No Priority'}
													</TableCell>
													<TableCell>
														<Badge
															variant="outline"
															className={statusClasses(
																request.status || 'UNKNOWN'
															)}
														>
															{request.status || 'Unknown'}
														</Badge>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{request.createdAt
															? new Date(request.createdAt).toLocaleDateString()
															: 'No date'}
													</TableCell>
													<TableCell>
														<MaintenanceActionButtons maintenance={request} />
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						) : (
							<CardContent>
								<Empty>
									<EmptyHeader>
										<EmptyMedia variant="icon">
											<Wrench />
										</EmptyMedia>
										<EmptyTitle>No maintenance requests found</EmptyTitle>
										<EmptyDescription>
											Get started by creating your first maintenance request
										</EmptyDescription>
									</EmptyHeader>
									<EmptyContent>
										<CreateMaintenanceDialog />
									</EmptyContent>
								</Empty>
							</CardContent>
						)}
					</Card>

					{/* Quick Actions Section - Matching Dashboard */}
					<Card>
						<CardHeader>
							<CardTitle>Quick Actions</CardTitle>
							<CardDescription>
								Common maintenance management tasks
							</CardDescription>
						</CardHeader>
						<div className="p-6 pt-0">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<CreateMaintenanceDialog />
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	)
}
