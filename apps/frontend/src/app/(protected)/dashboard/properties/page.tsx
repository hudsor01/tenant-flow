import { CreatePropertyDialog } from '@/components/properties/create-property-dialog'
import { PropertyEditViewButtons } from '@/components/properties/edit-button'
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
	EmptyIcon,
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
import { getPropertiesPageData } from '@/lib/api/dashboard-server'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import type { PropertyWithUnits } from '@repo/shared/types/relations'
import { Building, TrendingDown, TrendingUp } from 'lucide-react'

export default async function PropertiesPage() {
	const { properties, stats } = await getPropertiesPageData()

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
						{/* Total Properties */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Total Properties</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.totalProperties ?? 0}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										Portfolio growing
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Active properties <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Properties under management
								</div>
							</CardFooter>
						</Card>

						{/* Occupancy Rate */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Occupancy Rate</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{(stats.occupancyRate ?? 0).toFixed(1)}%
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{stats.occupancyRate >= 90 ? (
											<TrendingUp />
										) : (
											<TrendingDown />
										)}
										{stats.occupancyRate >= 90 ? 'Excellent' : 'Good'}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									{stats.occupancyRate >= 90 ? (
										<>
											Strong performance <TrendingUp className="size-4" />
										</>
									) : (
										<>
											Room for improvement <TrendingDown className="size-4" />
										</>
									)}
								</div>
								<div className="text-muted-foreground">
									{stats.occupiedUnits ?? 0} of {stats.totalUnits ?? 0} units
									occupied
								</div>
							</CardFooter>
						</Card>

						{/* Monthly Revenue */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Monthly Revenue</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{formatCurrency(stats.totalRevenue ?? 0)}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										<TrendingUp />
										{formatPercentage(5.2)}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Trending up <TrendingUp className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Total rent from all units
								</div>
							</CardFooter>
						</Card>

						{/* Vacant Units */}
						<Card className="@container/card">
							<CardHeader>
								<CardDescription>Vacant Units</CardDescription>
								<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
									{stats.vacantUnits ?? 0}
								</CardTitle>
								<CardAction>
									<Badge variant="outline">
										{stats.vacantUnits === 0 ? (
											<TrendingUp />
										) : (
											<TrendingDown />
										)}
										{stats.vacantUnits === 0 ? 'Fully leased' : 'Available'}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5 text-sm">
								<div className="line-clamp-1 flex gap-2 font-medium">
									Units available{' '}
									{stats.vacantUnits > 0 ? (
										<TrendingDown className="size-4" />
									) : (
										<TrendingUp className="size-4" />
									)}
								</div>
								<div className="text-muted-foreground">Ready for lease</div>
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
					{/* Properties Data Table */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
							<div className="space-y-1">
								<CardTitle>Properties Portfolio</CardTitle>
								<CardDescription>
									Manage your property portfolio and track performance
								</CardDescription>
							</div>
							{properties?.length > 0 && <CreatePropertyDialog />}
						</CardHeader>
						{properties?.length > 0 ? (
							<div className="px-6 pb-6">
								<div className="rounded-md border">
									<Table>
										<TableHeader className="bg-muted/50">
											<TableRow>
												<TableHead className="font-semibold">
													Property Name
												</TableHead>
												<TableHead className="font-semibold">Address</TableHead>
												<TableHead className="font-semibold">Type</TableHead>
												<TableHead className="font-semibold">Status</TableHead>
												<TableHead className="font-semibold">Units</TableHead>
												<TableHead className="font-semibold text-right">
													Created
												</TableHead>
												<TableHead className="font-semibold">Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{properties.map((property: PropertyWithUnits) => (
												<TableRow
													key={property.id}
													className="hover:bg-muted/30"
												>
													<TableCell className="font-medium">
														{property.name}
													</TableCell>
													<TableCell className="text-muted-foreground">
														{property.address}
													</TableCell>
													<TableCell>
														<Badge variant="outline" className="capitalize">
															{property.propertyType
																?.toLowerCase()
																.replace('_', ' ')}
														</Badge>
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
													<TableCell>
														<div className="flex items-center gap-2">
															<span className="font-medium">
																{property.occupiedUnits}/{property.totalUnits}
															</span>
															<Badge variant="secondary" className="text-xs">
																{property.occupancyRate?.toFixed(0) ?? '0'}%
															</Badge>
														</div>
													</TableCell>
													<TableCell className="text-right text-muted-foreground">
														{property.createdAt
															? new Date(
																	property.createdAt
																).toLocaleDateString()
															: '—'}
													</TableCell>
													<TableCell>
														<PropertyEditViewButtons property={property} />
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
										<EmptyIcon variant="icon">
											<Building />
										</EmptyIcon>
										<EmptyTitle>No properties found</EmptyTitle>
										<EmptyDescription>
											Get started by adding your first property
										</EmptyDescription>
									</EmptyHeader>
									<EmptyContent>
										<CreatePropertyDialog />
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
								Common property management tasks
							</CardDescription>
						</CardHeader>
						<div className="p-6 pt-0">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<CreatePropertyDialog />
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	)
}
