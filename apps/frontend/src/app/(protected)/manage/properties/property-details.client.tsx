'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { ButtonGroup } from '#components/ui/button-group'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import type { Property } from '@repo/shared/types/core'
import { Building, Calendar, DollarSign, Edit, MapPin } from 'lucide-react'
import Link from 'next/link'
import { PropertyImageGallery } from '#components/properties/property-image-gallery'

interface PropertyDetailsProps {
	property: Property
}

export function PropertyDetails({ property }: PropertyDetailsProps) {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
					<div className="flex items-center gap-2 mt-2 text-muted-foreground">
						<MapPin className="size-4" />
						{property.address_line1}, {property.city}, {property.state}{' '}
						{property.postal_code}
					</div>
				</div>
				<ButtonGroup>
					<Button asChild variant="outline" size="sm">
						<Link href={`/manage/properties/${property.id}/edit`}>
							<Edit className="size-4 mr-2" />
							Edit
						</Link>
					</Button>
				</ButtonGroup>
			</div>

			{/* Property Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Property Type</CardTitle>
						<Building className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold capitalize">
							{property.property_type?.toLowerCase().replace('_', ' ')}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Status</CardTitle>
						<DollarSign className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							<Badge className="bg-(--chart-1) text-[var(--primary-foreground)]">
								{property.status || 'Active'}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Added</CardTitle>
						<Calendar className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-sm">
							{property.created_at
								? new Date(property.created_at).toLocaleDateString()
								: 'Unknown'}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Property Images Gallery */}
			<Card>
				<CardHeader>
					<CardTitle>Property Images</CardTitle>
				</CardHeader>
				<CardContent>
					<PropertyImageGallery propertyId={property.id} editable={false} />
				</CardContent>
			</Card>

			{/* Property Details */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Property details to be added */}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
