'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { CardAction, CardFooter, CardHeader } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
	EmptyMedia
} from '@/components/ui/empty'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { Building, TrendingDown, TrendingUp } from 'lucide-react'

import { propertiesApi } from '@/lib/api-client'

interface Property {
	id: string
	name: string
	address: string
	propertyType?: string
	status?: string
	createdAt: string
}

export function PropertiesTable() {
	const { data: properties, isLoading } = useQuery({
		queryKey: ['properties'],
		queryFn: () => propertiesApi.list()
	})

	if (isLoading) {
		return <div className="animate-pulse">Loading properties...</div>
	}

	const safeProperties = properties || []
	const stats = {
		totalProperties: safeProperties.length,
		occupancyRate: 85.5,
		totalUnits: safeProperties.length
	}

	return (
		<div className="space-y-8">
			{/* Top Metric Cards Section */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
				{/* Total Properties */}
				<Card>
					<CardHeader>
						<CardDescription>Total Properties</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.totalProperties}
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								<TrendingUp className="w-3 h-3" />
								Portfolio growing
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							Active properties <TrendingUp className="w-4 h-4" />
						</div>
						<div className="text-muted-foreground">
							Properties under management
						</div>
					</CardFooter>
				</Card>

				{/* Occupancy Rate */}
				<Card>
					<CardHeader>
						<CardDescription>Occupancy Rate</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.occupancyRate.toFixed(1)}%
						</CardTitle>
						<CardAction>
							<Badge variant="outline">
								{stats.occupancyRate >= 90 ? (
									<TrendingUp className="w-3 h-3" />
								) : (
									<TrendingDown className="w-3 h-3" />
								)}
								{stats.occupancyRate >= 90 ? 'Excellent' : 'Good'}
							</Badge>
						</CardAction>
					</CardHeader>
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						<div className="flex gap-2 font-medium">
							{stats.occupancyRate >= 90 ? 'Strong performance' : 'Room for improvement'}
							{stats.occupancyRate >= 90 ? (
								<TrendingUp className="w-4 h-4" />
							) : (
								<TrendingDown className="w-4 h-4" />
							)}
						</div>
						<div className="text-muted-foreground">
							{stats.totalUnits} units total
						</div>
					</CardFooter>
				</Card>
			</div>

			{/* Properties Data Table */}
			<Card>
				<CardHeader>
					<CardTitle>Properties Portfolio</CardTitle>
					<CardDescription>
						Manage your property portfolio and track performance
					</CardDescription>
				</CardHeader>
				{safeProperties.length > 0 ? (
					<CardContent>
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
										<TableHead className="font-semibold text-right">
											Created
										</TableHead>
										<TableHead className="font-semibold">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{safeProperties.map((property: Property) => (
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
													{property.status || 'Active'}
												</Badge>
											</TableCell>
											<TableCell className="text-right text-muted-foreground">
												{property.createdAt
													? new Date(property.createdAt).toLocaleDateString()
													: '—'}
											</TableCell>
											<TableCell>
												{/* Actions placeholder - can be implemented later */}
												<span className="text-sm text-muted-foreground">
													Actions
												</span>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				) : (
					<CardContent>
						<Empty>
							<EmptyHeader>
								 <EmptyMedia variant="icon">
									<Building />
								 </EmptyMedia>
								<EmptyTitle>No properties found</EmptyTitle>
								<EmptyDescription>
									Get started by adding your first property
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<p>Create property button will go here</p>
							</EmptyContent>
						</Empty>
					</CardContent>
				)}
			</Card>
		</div>
	)
}
