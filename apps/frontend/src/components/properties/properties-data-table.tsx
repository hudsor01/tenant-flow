'use client'

import { useProperties } from '@/hooks/api/use-properties'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Building2,
	Eye,
	Edit3,
	Users,
	MapPin,
	Home,
	AlertTriangle,
	Plus
} from 'lucide-react'
import Link from 'next/link'
import type { Property } from '@repo/shared'

interface PropertyRowProps {
	property: Property
	onView?: (property: Property) => void
	onEdit?: (property: Property) => void
}

function PropertyRow({ property, onView, onEdit }: PropertyRowProps) {
	const totalUnits = property.units?.length || 0
	const occupiedUnits =
		property.units?.filter(unit => unit.status === 'OCCUPIED').length || 0
	const occupancyRate =
		totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

	return (
		<TableRow className="hover:bg-accent/50">
			<TableCell
				className="cursor-pointer"
				onClick={() => onView?.(property)}
			>
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
						<Building2 className="text-primary h-5 w-5" />
					</div>
					<div className="space-y-1">
						<p className="leading-none font-medium">
							{property.name}
						</p>
						<div className="text-muted-foreground flex items-center gap-1 text-sm">
							<MapPin className="h-3 w-3" />
							{property.address}
						</div>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<Badge variant="secondary" className="capitalize">
					{property.propertyType}
				</Badge>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1">
					<Home className="text-muted-foreground h-3 w-3" />
					{totalUnits}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1">
					<Users className="text-muted-foreground h-3 w-3" />
					{occupiedUnits}
				</div>
			</TableCell>
			<TableCell>
				<Badge
					variant={
						occupancyRate >= 90
							? 'default'
							: occupancyRate >= 70
								? 'secondary'
								: 'destructive'
					}
				>
					{occupancyRate}%
				</Badge>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={e => {
							e.stopPropagation()
							onView?.(property)
						}}
						aria-label={`View ${property.name}`}
					>
						<Eye className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={e => {
							e.stopPropagation()
							onEdit?.(property)
						}}
						aria-label={`Edit ${property.name}`}
					>
						<Edit3 className="h-4 w-4" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	)
}

function PropertiesTableSkeleton() {
	return (
		<div className="space-y-4">
			{[...Array(5)].map((_, i) => (
				<div key={i} className="flex items-center space-x-4 p-4">
					<Skeleton className="h-10 w-10 rounded-lg" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-[200px]" />
						<Skeleton className="h-3 w-[150px]" />
					</div>
					<Skeleton className="h-6 w-16" />
					<Skeleton className="h-4 w-8" />
					<Skeleton className="h-4 w-8" />
					<Skeleton className="h-6 w-12" />
					<Skeleton className="h-8 w-16" />
				</div>
			))}
		</div>
	)
}

interface PropertiesDataTableProps {
	searchQuery?: string
	propertyType?: string
	onViewProperty?: (property: Property) => void
	onEditProperty?: (property: Property) => void
}

export function PropertiesDataTable({
	searchQuery = '',
	propertyType = '',
	onViewProperty,
	onEditProperty
}: PropertiesDataTableProps = {}) {
	const { data: properties, isLoading, error } = useProperties()

	// Filter properties based on search query and type
	const filteredProperties =
		properties?.filter(property => {
			const matchesSearch =
				searchQuery === '' ||
				property.name
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				property.address
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				property.city?.toLowerCase().includes(searchQuery.toLowerCase())

			const matchesType =
				propertyType === '' || property.propertyType === propertyType

			return matchesSearch && matchesType
		}) || []

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Properties</CardTitle>
					<CardDescription>
						Manage all your rental properties
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PropertiesTableSkeleton />
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Properties</CardTitle>
					<CardDescription>
						Manage all your rental properties
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Error loading properties</AlertTitle>
						<AlertDescription>
							There was a problem loading your properties. Please
							try refreshing the page.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	if (!filteredProperties?.length) {
		const hasFilters = searchQuery !== '' || propertyType !== ''

		return (
			<Card>
				<CardHeader>
					<CardTitle>Properties</CardTitle>
					<CardDescription>
						Manage all your rental properties
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Building2 className="text-muted-foreground/50 mb-4 h-16 w-16" />
						<h3 className="mb-2 text-lg font-medium">
							{hasFilters
								? 'No properties found'
								: 'No properties yet'}
						</h3>
						<p className="text-muted-foreground mb-6 max-w-sm">
							{hasFilters
								? 'Try adjusting your search criteria or filters.'
								: 'Get started by adding your first rental property to the system.'}
						</p>
						{!hasFilters && (
							<Link href="/properties/new">
								<Button>
									<Plus className="mr-2 h-4 w-4" />
									Add First Property
								</Button>
							</Link>
						)}
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Properties</CardTitle>
						<CardDescription>
							Manage all your rental properties
						</CardDescription>
					</div>
					<Link href="/properties/new">
						<Button size="sm">
							<Plus className="mr-2 h-4 w-4" />
							Add Property
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Property</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Units</TableHead>
								<TableHead>Tenants</TableHead>
								<TableHead>Occupancy</TableHead>
								<TableHead className="w-[100px]">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredProperties.map((property: Property) => (
								<PropertyRow
									key={property.id}
									property={property}
									onView={onViewProperty}
									onEdit={onEditProperty}
								/>
							))}
						</TableBody>
					</Table>
				</div>

				{filteredProperties.length > 10 && (
					<div className="flex items-center justify-center pt-4">
						<Button variant="outline" size="sm">
							Load more properties
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
