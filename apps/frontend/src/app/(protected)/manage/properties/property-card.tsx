import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import type { Property } from '@repo/shared/types/core'
import {
	Building2,
	MapPin,
	MoreHorizontal,
	PencilIcon,
	Trash2
} from 'lucide-react'
import Link from 'next/link'

import { usePropertyImages } from '#hooks/api/use-properties'

interface PropertyCardProps {
	property: Property
	onDelete?: (id: string) => void
}

export function PropertyCard({ property, onDelete }: PropertyCardProps) {
	const { data: images } = usePropertyImages(property.id)
	const primaryImage = images?.[0]

	// Map database status enum to UI variants
	const statusVariant =
		property.status === 'ACTIVE'
			? 'default'
			: property.status === 'UNDER_CONTRACT'
				? 'secondary'
				: 'outline'

	const statusLabel =
		property.status === 'ACTIVE'
			? 'active'
			: property.status === 'INACTIVE'
				? 'inactive'
				: property.status === 'UNDER_CONTRACT'
					? 'under contract'
					: 'sold'

	return (
		<Card className="overflow-hidden group hover:shadow-lg transition-shadow" data-testid="property-card">
			{/* Property Image - displays primary image or placeholder */}
			<div className="relative aspect-video w-full overflow-hidden bg-muted">
				{primaryImage ? (
					<img
						src={primaryImage.image_url}
						alt={property.name}
						className="object-cover w-full h-full"
						loading="lazy"
					/>
				) : (
					<div className="flex items-center justify-center h-full">
						<Building2 className="size-16 text-muted-foreground" />
					</div>
				)}

				{/* Status Badge Overlay */}
				<div className="absolute top-3 right-3">
					<Badge variant={statusVariant} className="shadow-sm capitalize">
						{statusLabel}
					</Badge>
				</div>
			</div>

			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-1 flex-1 min-w-0">
						<CardTitle className="text-lg truncate">{property.name}</CardTitle>
						<CardDescription className="flex items-center gap-1.5 text-sm">
							<MapPin className="size-3.5 shrink-0" />
							<span className="truncate">{property.address_line1}</span>
						</CardDescription>
					</div>

					{/* Actions Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-11 shrink-0">
								<MoreHorizontal className="size-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link href={`/manage/properties/${property.id}`}>
									View Details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href={`/manage/properties/${property.id}/edit`}>
									<PencilIcon className="size-4 mr-2" />
									Edit
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => onDelete?.(property.id)}
							>
								<Trash2 className="size-4 mr-2" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Property Type and Location */}
				<div className="flex items-center justify-between text-sm">
					<div>
						<p className="text-muted-foreground">Type:</p>
						<p className="font-medium capitalize">
							{property.property_type?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
						</p>
					</div>
					<div className="text-right">
						<p className="text-muted-foreground">Location:</p>
						<p className="font-medium">
							{property.city}, {property.state}
						</p>
					</div>
				</div>

				{/* View Details Button */}
				<Button asChild className="w-full" variant="default">
					<Link href={`/manage/properties/${property.id}`}>View Details</Link>
				</Button>
			</CardContent>
		</Card>
	)
}