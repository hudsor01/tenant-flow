'use client'

import { useProperties } from '@/hooks/api/use-properties'
import { Property_ListLoading } from './property-list-loading'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { BlurFade } from '@/components/magicui'
import { getStaggerDelay } from '@/lib/animations/constants'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

import Link from 'next/link'
import type { PropertyWithUnits } from '@repo/shared'
import { createPropertiesActions, createActionColumn } from '@/components/data-table/data-table-action-factory'
import { Plus , Home , Users , Building , MapPin } from 'lucide-react'
// Create actions components using consolidated factory
const PropertiesActions = createPropertiesActions
const PropertiesDropdownActions = createActionColumn({
	entity: 'property',
	basePath: '/properties',
	variant: 'dropdown'
})

// Use relation type that includes units for property data table
interface Property_RowProps {
  property: PropertyWithUnits
  onView?: (property: PropertyWithUnits) => void
  onEdit?: (property: PropertyWithUnits) => void
}

function Property_Row({ property, onView: _onView, onEdit: _onEdit }: Property_RowProps) {
	// NO CALCULATIONS - Use backend-provided metrics
	const totalUnits = property.totalUnits
	const occupiedUnits = property.occupiedUnits
	const occupancyRate = property.occupancyRate

	return (
		<TableRow className="hover:bg-accent/50">
			<TableCell
				className="cursor-pointer"
				onClick={() => _onView?.(property)}
			>
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
						<Building className="text-primary h-5 w-5" />
					</div>
					<div className="space-y-1">
						<p className="font-medium leading-none">
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
					{property.propertyType || 'ACTIVE'}
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
				<PropertiesActions item={property} />
			</TableCell>
		</TableRow>
	)
}

interface Property_CardProps {
  property: PropertyWithUnits
  onView?: (property: PropertyWithUnits) => void
  onEdit?: (property: PropertyWithUnits) => void
}

function Property_Card({ property, onView: _onView, onEdit: _onEdit }: Property_CardProps) {
	// NO CALCULATIONS - Use backend-provided metrics  
	const totalUnits = property.totalUnits
	const occupiedUnits = property.occupiedUnits
	const occupancyRate = property.occupancyRate

	return (
		<Card className="transition-all hover:shadow-md">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
							<Building className="text-primary h-5 w-5" />
						</div>
						<div className="space-y-1">
							<CardTitle className="text-base leading-none">
								{property.name}
							</CardTitle>
							<div className="text-muted-foreground flex items-center gap-1 text-sm">
								<MapPin className="h-3 w-3" />
								{property.address}
							</div>
						</div>
					</div>
					<PropertiesDropdownActions item={property} />
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-3">
					<div className="flex items-center gap-4">
						<Badge variant="secondary" className="capitalize">
							{property.propertyType || 'ACTIVE'}
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
							<Home className="text-muted-foreground h-3 w-3" />
							<span className="text-muted-foreground">
								Units:
							</span>
							<span className="font-medium">{totalUnits}</span>
						</div>
						<div className="flex items-center gap-1">
							<Users className="text-muted-foreground h-3 w-3" />
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

// Moved to separate pure component - use Property_ListLoading instead

// Filter properties based on search and type criteria
function filterProperties(
  properties: PropertyWithUnits[] | undefined,
	searchQuery: string,
	_propertyType: string
): PropertyWithUnits[] {
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

		// Since propertyType field doesn't exist, always match for now
		const matchesType = true

		return matchesSearch && matchesType
	})
}

interface PropertiesTableUIProps {
  properties: PropertyWithUnits[]
	hasFilters: boolean
  onViewProperty_?: (property: PropertyWithUnits) => void
  onEditProperty_?: (property: PropertyWithUnits) => void
}

function PropertiesTableUI({
	properties,
	hasFilters,
	onViewProperty_,
	onEditProperty_
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
						<Building className="text-muted-foreground/50 mb-4 h-16 w-16" />
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
									Add First Property_
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
								Add Property_
							</span>
							<span className="sm:hidden">Add</span>
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{/* Mobile Card View */}
				<div className="space-y-4 md:hidden">
          {properties.map((property: PropertyWithUnits, index: number) => (
						<BlurFade key={property.id} delay={getStaggerDelay(index, 'MEDIUM_STAGGER')}>
							<Property_Card
								property={property}
								onView={onViewProperty_}
								onEdit={onEditProperty_}
							/>
						</BlurFade>
					))}
				</div>

				{/* Desktop Table View */}
				<div className="hidden md:block">
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Property_</TableHead>
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
                    {properties.map((property: PropertyWithUnits, index: number) => (
									<BlurFade key={property.id} delay={getStaggerDelay(index, 'FAST_STAGGER')}>
										<Property_Row
											property={property}
											onView={onViewProperty_}
											onEdit={onEditProperty_}
										/>
									</BlurFade>
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
	onViewProperty_?: (property: PropertyWithUnits) => void
	onEditProperty_?: (property: PropertyWithUnits) => void
}

export function PropertiesDataTable({
	searchQuery = '',
	propertyType = '',
	onViewProperty_,
	onEditProperty_
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
					<Property_ListLoading />
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
			onViewProperty_={onViewProperty_}
			onEditProperty_={onEditProperty_}
		/>
	)
}
