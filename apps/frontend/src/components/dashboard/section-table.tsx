'use client'

import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useRecentProperties } from '@/hooks/api/use-properties'
import { cn } from '@/lib/utils'
import type { Database } from '@repo/shared/types/supabase-generated'
import { Building2, MapPin } from 'lucide-react'

type PropertyType = Database['public']['Enums']['PropertyType']
type PropertyStatus = Database['public']['Enums']['PropertyStatus']

// Format property type for display
const formatPropertyType = (type: PropertyType): string => {
	const typeMap: Record<PropertyType, string> = {
		SINGLE_FAMILY: 'Single Family',
		MULTI_UNIT: 'Multi-Unit',
		APARTMENT: 'Apartment',
		COMMERCIAL: 'Commercial',
		CONDO: 'Condominium',
		TOWNHOUSE: 'Townhouse',
		OTHER: 'Other'
	}
	return typeMap[type] || type
}

// Format property status for display
const formatPropertyStatus = (status: PropertyStatus): string => {
	const statusMap: Record<PropertyStatus, string> = {
		ACTIVE: 'Active',
		INACTIVE: 'Inactive',
		UNDER_CONTRACT: 'Under Contract',
		SOLD: 'Sold'
	}
	return statusMap[status] || status
}

export function SectionTable() {
	const { data: properties, isLoading, error } = useRecentProperties()

	// useRecentProperties may return either an array or a paginated object
	// (e.g. { data: Property[] }). Normalize to an array for rendering.
	const propertiesList = Array.isArray(properties)
		? properties
		: (properties?.data ?? [])

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Recent Properties
					</CardTitle>
					<CardDescription>
						Overview of your most recently added properties
					</CardDescription>
				</CardHeader>
				<CardContent className="p-3 sm:p-6">
					<div className="flex items-center justify-center py-8">
						<Spinner className="h-6 w-6 animate-spin" />
						<span className="ml-2 text-muted-foreground text-sm">
							Loading properties...
						</span>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Recent Properties
					</CardTitle>
					<CardDescription>
						Overview of your most recently added properties
					</CardDescription>
				</CardHeader>
				<CardContent className="p-3 sm:p-6">
					<div className="text-center py-8">
						<p className="text-sm text-muted-foreground">
							Failed to load properties
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (!propertiesList || propertiesList.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Recent Properties
					</CardTitle>
					<CardDescription>
						Overview of your most recently added properties
					</CardDescription>
				</CardHeader>
				<CardContent className="p-3 sm:p-6">
					<div className="text-center py-8">
						<p className="text-sm text-muted-foreground">
							No properties yet. Add your first property to get started.
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Building2 className="h-5 w-5" />
					Recent Properties
				</CardTitle>
				<CardDescription>
					Overview of your most recently added properties
				</CardDescription>
			</CardHeader>
			<CardContent className="p-3 sm:p-6">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-[140px]">Property</TableHead>
								<TableHead className="hidden sm:table-cell">Type</TableHead>
								<TableHead className="hidden md:table-cell">Location</TableHead>
								<TableHead className="text-center min-w-[80px]">
									Status
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{propertiesList.map(property => (
								<TableRow key={property.id}>
									<TableCell className="font-medium">
										<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
											<div className="flex items-center gap-2">
												<Building2 className="h-4 w-4 text-muted-foreground" />
												<span className="font-medium">{property.name}</span>
											</div>
											<div className="flex items-center gap-3 text-xs text-muted-foreground sm:hidden">
												<span>{formatPropertyType(property.propertyType)}</span>
												<span className="flex items-center gap-1">
													<MapPin className="h-3 w-3" />
													{property.city}, {property.state}
												</span>
											</div>
										</div>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										{formatPropertyType(property.propertyType)}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<div className="flex items-center gap-1">
											<MapPin className="h-3 w-3 text-muted-foreground" />
											{property.city}, {property.state}
										</div>
									</TableCell>
									<TableCell className="text-center">
										<Badge
											variant={
												property.status === 'ACTIVE' ? 'default' : 'secondary'
											}
											className={cn(
												'rounded-full border border-transparent px-3 py-1 font-medium',
												property.status === 'ACTIVE'
													? 'bg-[var(--color-system-green-10)] text-[var(--color-system-green)] hover:bg-[var(--color-system-green-15)]'
													: property.status === 'UNDER_CONTRACT'
														? 'bg-[var(--color-system-blue-10)] text-[var(--color-system-blue)] hover:bg-[var(--color-system-blue-15)]'
														: property.status === 'SOLD'
															? 'bg-[var(--color-system-purple-10)] text-[var(--color-system-purple)] hover:bg-[var(--color-system-purple-15)]'
															: 'bg-[var(--color-system-gray-10)] text-[var(--color-label-tertiary)] hover:bg-[var(--color-system-gray-15)]'
											)}
										>
											{formatPropertyStatus(property.status)}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}
