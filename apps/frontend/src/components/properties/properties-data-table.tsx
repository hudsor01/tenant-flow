'use client'

import { useProperties } from '@/hooks/api/use-properties'
import { PropertyListLoading } from './property-list-loading'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'
// Unused UI components removed: Skeleton, Alert, AlertDescription, AlertTitle
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import type { Property } from '@repo/shared'

interface PropertyRowProps {
	property: Property
	onView?: (property: Property) => void
	onEdit?: (property: Property) => void
}

function PropertyRow({ property, onView, onEdit }: PropertyRowProps) {
	const totalUnits = property.units?.length ?? 0
	const occupiedUnits =
		property.units?.filter(unit => unit.status === 'OCCUPIED').length ?? 0
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
						<i className="i-lucide-building-2 inline-block text-primary h-5 w-5"  />
					</div>
					<div className="space-y-1">
						<p className="font-medium leading-none">
							{property.name}
						</p>
						<div className="text-muted-foreground flex items-center gap-1 text-sm">
							<i className="i-lucide-map-pin inline-block h-3 w-3"  />
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
					<i className="i-lucide-home inline-block text-muted-foreground h-3 w-3"  />
					{totalUnits}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1">
					<i className="i-lucide-users inline-block text-muted-foreground h-3 w-3"  />
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
						onClick={(e: React.MouseEvent) => {
							e.stopPropagation()
							onView?.(property)
						}}
						aria-label={`View ${property.name}`}
					>
						<i className="i-lucide-eye inline-block h-4 w-4"  />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={(e: React.MouseEvent) => {
							e.stopPropagation()
							onEdit?.(property)
						}}
						aria-label={`Edit ${property.name}`}
					>
						<i className="i-lucide-edit-3 inline-block h-4 w-4"  />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	)
}

interface PropertyCardProps {
	property: Property
	onView?: (property: Property) => void
	onEdit?: (property: Property) => void
}

function PropertyCard({ property, onView, onEdit }: PropertyCardProps) {
	const totalUnits = property.units?.length ?? 0
	const occupiedUnits =
		property.units?.filter(unit => unit.status === 'OCCUPIED').length ?? 0
	const occupancyRate =
		totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

	return (
		<Card className="transition-all hover:shadow-md">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
							<i className="i-lucide-building-2 inline-block text-primary h-5 w-5"  />
						</div>
						<div className="space-y-1">
							<CardTitle className="text-base leading-none">
								{property.name}
							</CardTitle>
							<div className="text-muted-foreground flex items-center gap-1 text-sm">
								<i className="i-lucide-map-pin inline-block h-3 w-3"  />
								{property.address}
							</div>
						</div>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0"
							>
								<i className="i-lucide-more-horizontal inline-block h-4 w-4"  />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => onView?.(property)}
							>
								<i className="i-lucide-eye inline-block mr-2 h-4 w-4"  />
								View Details
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => onEdit?.(property)}
							>
								<i className="i-lucide-edit-3 inline-block mr-2 h-4 w-4"  />
								Edit Property
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-3">
					<div className="flex items-center gap-4">
						<Badge variant="secondary" className="capitalize">
							{property.propertyType.replace('_', ' ')}
						</Badge>
						<Badge
							variant={
								occupancyRate >= 90
									? 'default'
									: occupancyRate >= 70
										? 'secondary'
										: 'destructive'
							}
						>
							{occupancyRate}% occupied
						</Badge>
					</div>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="flex items-center gap-1">
							<i className="i-lucide-home inline-block text-muted-foreground h-3 w-3"  />
							<span className="text-muted-foreground">
								Units:
							</span>
							<span className="font-medium">{totalUnits}</span>
						</div>
						<div className="flex items-center gap-1">
							<i className="i-lucide-users inline-block text-muted-foreground h-3 w-3"  />
							<span className="text-muted-foreground">
								Tenants:
							</span>
							<span className="font-medium">{occupiedUnits}</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

// Moved to separate pure component - use PropertyListLoading instead

// Filter properties based on search and type criteria
function filterProperties(
	properties: Property[] | undefined,
	searchQuery: string,
	propertyType: string
): Property[] {
	if (!properties) {
		return []
	}

	return properties.filter(property => {
		const matchesSearch =
			searchQuery === '' ||
			property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			property.address
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			property.city?.toLowerCase().includes(searchQuery.toLowerCase())

		const matchesType =
			propertyType === '' || property.propertyType === propertyType

		return matchesSearch && matchesType
	})
}

interface PropertiesTableUIProps {
	properties: Property[]
	hasFilters: boolean
	onViewProperty?: (property: Property) => void
	onEditProperty?: (property: Property) => void
}

function PropertiesTableUI({
	properties,
	hasFilters,
	onViewProperty,
	onEditProperty
}: PropertiesTableUIProps) {
	if (!properties.length) {
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
						<i className="i-lucide-building-2 inline-block text-muted-foreground/50 mb-4 h-16 w-16"  />
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
							<span className="hidden sm:inline">
								Add Property
							</span>
							<span className="sm:hidden">Add</span>
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{/* Mobile Card View */}
				<div className="space-y-4 md:hidden">
					{properties.map((property: Property) => (
						<PropertyCard
							key={property.id}
							property={property}
							onView={onViewProperty}
							onEdit={onEditProperty}
						/>
					))}
				</div>

				{/* Desktop Table View */}
				<div className="hidden md:block">
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
								{properties.map((property: Property) => (
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
				</div>

				{properties.length > 10 && (
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
}: PropertiesDataTableProps) {
	const { data: properties, isLoading, error } = useProperties()

	// Loading state
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
					<PropertyListLoading />
				</CardContent>
			</Card>
		)
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	// Filter properties
	const filteredProperties = filterProperties(
		properties,
		searchQuery,
		propertyType
	)
	const hasFilters = searchQuery !== '' || propertyType !== ''

	return (
		<PropertiesTableUI
			properties={filteredProperties}
			hasFilters={hasFilters}
			onViewProperty={onViewProperty}
			onEditProperty={onEditProperty}
		/>
	)
}
