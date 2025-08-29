import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { apiClient } from '@repo/shared'
import type { PropertyWithUnits } from '@repo/shared'

// Use Property_WithUnits for components that need computed fields and relations
type Property_ = PropertyWithUnits

// Loading skeleton for property cards
function Property_CardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-48" />
					</div>
					<Skeleton className="h-5 w-16" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-24" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-20" />
					</div>
					<Skeleton className="h-9 w-full" />
				</div>
			</CardContent>
		</Card>
	)
}

// Property_ card component
function Property_Card({ property }: { property: Property_ }) {
	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-lg">
							{property.name}
						</CardTitle>
						<p className="text-muted-foreground flex items-center gap-1 text-sm">
							<i className="i-lucide-map-pin h-3 w-3"  />
							{property.address}
						</p>
					</div>
					<Badge
						className="bg-blue-1 text-blue-8"
						variant="secondary"
					>
						Active
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="flex items-center gap-2">
							<i className="i-lucide-building h-4 w-4"  />
							{property.propertyType?.replace('_', ' ') ||
								'Property_'}
						</span>
						<span className="flex items-center gap-2">
							<i className="i-lucide-users h-4 w-4"  />
							{property.units?.length ?? 0} units
						</span>
					</div>

					{property.description && (
						<p className="text-muted-foreground line-clamp-2 text-sm">
							{property.description}
						</p>
					)}

					<Button asChild className="w-full">
						<Link href={`/properties/${property.id}`}>
							View Details
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

// Stats component
async function Property_StatsComponent() {
	const stats = await apiClient<{
		total: number
		active: number
		inactive: number
		totalUnits: number
		occupiedUnits: number
		vacantUnits: number
		totalRevenue: number
		occupancyRate: number
	}>('/api/properties/stats')

	if (!stats) {
		return (
			<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				{[1, 2, 3].map(i => (
					<Card key={i}>
						<CardContent className="p-4">
							<Skeleton className="mb-2 h-8 w-16" />
							<Skeleton className="h-4 w-24" />
						</CardContent>
					</Card>
				))}
			</div>
		)
	}

	return (
		<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
			<Card>
				<CardContent className="p-4">
					<div className="text-2xl font-bold">{stats.total || 0}</div>
					<p className="text-muted-foreground text-sm">
						Total Properties
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-4">
					<div className="text-2xl font-bold">
						{stats.occupiedUnits + stats.vacantUnits || 0}
					</div>
					<p className="text-muted-foreground text-sm">Total Units</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-4">
					<div className="text-2xl font-bold">
						{stats.occupancyRate || 0}%
					</div>
					<p className="text-muted-foreground text-sm">
						Occupancy Rate
					</p>
				</CardContent>
			</Card>
		</div>
	)
}

// Properties list component
async function PropertiesList() {
  const properties = await apiClient<PropertyWithUnits[]>('/api/properties')

	if (!properties || properties.length === 0) {
		return (
			<Card>
				<CardContent className="p-8 text-center">
					<i className="i-lucide-building text-muted-foreground mx-auto mb-4 h-12 w-12"  />
					<h3 className="mb-2 text-lg font-semibold">
						No properties found
					</h3>
					<p className="text-muted-foreground mb-4">
						Get started by adding your first property.
					</p>
					<Button asChild>
						<Link href="/properties/new">
							<i className="i-lucide-plus mr-2 h-4 w-4"  />
							Add Property_
						</Link>
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{properties.map(property => (
				<Property_Card key={property.id} property={property} />
			))}
		</div>
	)
}

// Main server component
export default function Property_ListServer() {
	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Properties</h1>
					<p className="text-muted-foreground">
						Manage your property portfolio
					</p>
				</div>
				<Button asChild>
					<Link href="/properties/new">
						<i className="i-lucide-plus mr-2 h-4 w-4"  />
						Add Property_
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<Suspense
				fallback={
					<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
						{[1, 2, 3].map(i => (
							<Card key={i}>
								<CardContent className="p-4">
									<Skeleton className="mb-2 h-8 w-16" />
									<Skeleton className="h-4 w-24" />
								</CardContent>
							</Card>
						))}
					</div>
				}
			>
				<Property_StatsComponent />
			</Suspense>

			{/* Properties List */}
			<Suspense
				fallback={
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3, 4, 5, 6].map(i => (
							<Property_CardSkeleton key={i} />
						))}
					</div>
				}
			>
				<PropertiesList />
			</Suspense>
		</div>
	)
}
