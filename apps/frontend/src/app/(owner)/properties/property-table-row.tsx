'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { usePropertyImages } from '#hooks/api/use-properties'
import { useUnitsByProperty } from '#hooks/api/use-unit'
import type { Property } from '@repo/shared/types/core'
import { Building2, Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface PropertyTableRowProps {
	property: Property
}

function formatPropertyType(type: string | null): string {
	if (!type) return 'Other'
	const labels: Record<string, string> = {
		single_family: 'Single Family',
		multi_family: 'Multi-Family',
		multi_unit: 'Multi-Unit',
		condo: 'Condo',
		townhouse: 'Townhouse',
		apartment: 'Apartment',
		commercial: 'Commercial'
	}
	return labels[type] ?? type
}

export function PropertyTableRow({ property }: PropertyTableRowProps) {
	const isActive = property.status === 'active'
	const { data: images } = usePropertyImages(property.id)
	const { data: unitsResponse } = useUnitsByProperty(property.id)
	const primaryImage = images?.[0]
	const units = unitsResponse ?? []
	const unitCount = units.length

	return (
		<div className="flex items-center gap-4 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
			{/* Property Image Thumbnail */}
			{primaryImage ? (
				<div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
					<Image
						src={primaryImage.image_url}
						alt={property.name ?? 'Property'}
						fill
						className="object-cover"
						sizes="64px"
					/>
				</div>
			) : (
				<div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center">
					<Building2 className="size-6 text-muted-foreground" />
				</div>
			)}

			{/* Property Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<h3 className="font-medium truncate">
						{property.name ?? 'Unnamed Property'}
					</h3>
					<Badge
						variant={isActive ? 'default' : 'secondary'}
						className="text-xs"
					>
						{property.status}
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground truncate">
					{property.address_line1}, {property.city}, {property.state}
				</p>
			</div>

			{/* Stats (hidden on small screens) */}
			<div className="hidden sm:flex items-center gap-6 text-sm">
				<div className="text-center">
					<p className="font-medium">{unitCount}</p>
					<p className="text-xs text-muted-foreground">Units</p>
				</div>
				<div className="text-center min-w-[80px]">
					<p className="font-medium">
						{formatPropertyType(property.property_type)}
					</p>
					<p className="text-xs text-muted-foreground">Type</p>
				</div>
			</div>

			{/* Actions Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem asChild>
						<Link href={`/properties/${property.id}`}>
							<Eye className="mr-2 h-4 w-4" />
							View Details
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={`/properties/${property.id}/edit`}>
							<Edit className="mr-2 h-4 w-4" />
							Edit
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem className="text-destructive">
						<Trash2 className="mr-2 h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
