'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Tables } from '@repo/shared/types/supabase'
import { Building, Calendar, DollarSign, Edit, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

type Property = Tables<'property'>

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
						{property.address}, {property.city}, {property.state}{' '}
						{property.zipCode}
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
							{property.propertyType?.toLowerCase().replace('_', ' ')}
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
							<Badge
						className="bg-[var(--chart-1)] text-[oklch(var(--primary-foreground))]"
					>
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
							{property.createdAt
								? new Date(property.createdAt).toLocaleDateString()
								: 'Unknown'}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Property Details */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{property.description && (
							<div>
								<h4 className="font-medium mb-2">Description</h4>
								<p className="text-sm text-muted-foreground">
									{property.description}
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Property Image */}
				{property.imageUrl && (
					<Card>
						<CardHeader>
							<CardTitle>Property Image</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="aspect-video rounded-lg bg-muted overflow-hidden">
								<Image
									src={property.imageUrl!}
									alt={property.name}
									fill
									className="object-cover"
									priority
									placeholder="blur"
									blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
								/>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}
