import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '#components/ui/tooltip'
import type { Property } from '@repo/shared/types/core'
import {
	ArrowDownRight,
	ArrowUpRight,
	Building2,
	DollarSign,
	Eye,
	Home,
	MapPin,
	PencilIcon,
	Trash2,
	TrendingUp,
	Users
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { usePropertyImages } from '#hooks/api/use-properties'
import { useUnitsByProperty } from '#hooks/api/use-unit'

interface PropertyCardProps {
	property: Property
	onDelete?: (id: string) => void
	/** Animation delay for staggered loading effect (in ms) */
	animationDelay?: number
	/** Custom class name */
	className?: string
	/** Tab index for keyboard navigation */
	tabIndex?: number
	/** Revenue trend percentage from analytics (positive = up, negative = down) */
	trendPercentage?: number | undefined
}

import { cn } from '#lib/utils'
import { memo, useCallback } from 'react'

export const PropertyCard = memo(function PropertyCard({
	property,
	onDelete,
	animationDelay = 0,
	className,
	tabIndex = 0,
	trendPercentage = 0
}: PropertyCardProps) {
	const router = useRouter()
	const { data: images } = usePropertyImages(property.id)
	const { data: unitsResponse } = useUnitsByProperty(property.id)
	const primaryImage = images?.[0]
	const units = unitsResponse ?? []

	// Calculate property metrics from units
	const totalUnits = units.length
	const occupiedUnits = units.filter(unit => unit.status === 'occupied').length
	const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
	const monthlyRevenue = units
		.filter(unit => unit.status === 'occupied')
		.reduce((sum, unit) => sum + (unit.rent_amount || 0), 0)

	// Revenue change from property performance analytics (passed via prop)
	const revenueChange = trendPercentage

	// High performer status (90%+ occupancy)
	const isHighPerformer = occupancyRate >= 90

	// Handle keyboard navigation - Enter/Space to view details
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				// Don't navigate if focus is on an interactive element inside the card
				const target = e.target as HTMLElement
				if (
					target.tagName === 'BUTTON' ||
					target.tagName === 'A' ||
					target.closest('button') ||
					target.closest('a')
				) {
					return
				}
				e.preventDefault()
				router.push(`/properties/${property.id}`)
			}
		},
		[router, property.id]
	)

	return (
		<Card
			className={cn(
				'card-standard overflow-hidden group',
				'hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5',
				'transition-all duration-300 ease-out',
				'animate-in fade-in slide-in-from-bottom-4',
				// Focus styles for keyboard navigation
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
				'focus-visible:border-primary/30 focus-visible:shadow-lg',
				'cursor-pointer',
				className
			)}
			style={{ animationDelay: `${animationDelay}ms` }}
			data-testid="property-card"
			tabIndex={tabIndex}
			role="article"
			aria-label={`Property: ${property.name}, ${property.address_line1}`}
			onKeyDown={handleKeyDown}
		>
			{/* Property Image - displays primary image or placeholder */}
			<div className="relative aspect-video w-full overflow-hidden bg-muted">
				{primaryImage ? (
					<Image
						src={primaryImage.image_url}
						alt={property.name}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
					/>
				) : (
					<div className="flex-center h-full bg-muted">
						<Building2 className="size-16 text-muted-foreground" />
					</div>
				)}
				{/* Top Performer Badge - shows for 90%+ occupancy */}
				{isHighPerformer && (
					<Badge className="absolute top-2 left-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md">
						<TrendingUp className="h-3 w-3 mr-1" />
						Top Performer
					</Badge>
				)}
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

					{/* Visible Action Buttons - always visible for better CRUD discoverability */}
					<div className="flex items-center gap-1 shrink-0">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									asChild
									className={cn(
										'size-8 text-muted-foreground hover:text-foreground',
										'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
										'transition-all duration-200'
									)}
								>
									<Link
										href={`/properties/${property.id}`}
										aria-label={`View ${property.name}`}
									>
										<Eye className="size-4" />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent>View Details</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									asChild
									className={cn(
										'size-8 text-muted-foreground hover:text-primary',
										'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
										'transition-all duration-200'
									)}
								>
									<Link
										href={`/properties/${property.id}/edit`}
										aria-label={`Edit ${property.name}`}
									>
										<PencilIcon className="size-4" />
									</Link>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Edit Property</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => onDelete?.(property.id)}
									className={cn(
										'size-8 text-muted-foreground hover:text-destructive',
										'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
										'transition-all duration-200'
									)}
									aria-label={`Delete ${property.name}`}
								>
									<Trash2 className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Delete Property</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Key Metrics Row */}
				<div className="grid grid-cols-3 gap-3">
					{/* Occupancy Rate */}
					<div className="flex items-center gap-2 group/metric">
						<div className="icon-container-sm bg-primary/10 text-primary transition-transform duration-200 group-hover/metric:scale-105">
							<Users className="size-3.5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-muted-foreground">Occupancy</p>
							<p className="text-lg font-medium leading-none">
								{occupancyRate.toFixed(0)}%
							</p>
						</div>
					</div>

					{/* Monthly Revenue */}
					<div className="flex items-center gap-2 group/metric">
						<div className="icon-container-sm bg-success/10 text-success transition-transform duration-200 group-hover/metric:scale-105">
							<DollarSign className="size-3.5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-muted-foreground">Revenue</p>
							<div className="flex items-center gap-1">
								<p className="text-lg font-medium leading-none truncate">
									${(monthlyRevenue / 1000).toFixed(1)}k
								</p>
								{revenueChange !== 0 && (
									<span
										className={cn(
											'flex items-center text-xs transition-transform duration-300',
											revenueChange > 0
												? 'text-success animate-in slide-in-from-bottom-1'
												: 'text-destructive animate-in slide-in-from-top-1'
										)}
									>
										{revenueChange > 0 ? (
											<ArrowUpRight className="size-3" />
										) : (
											<ArrowDownRight className="size-3" />
										)}
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Units */}
					<div className="flex items-center gap-2 group/metric">
						<div className="icon-container-sm bg-info/10 text-info transition-transform duration-200 group-hover/metric:scale-105">
							<Home className="size-3.5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-muted-foreground">Units</p>
							<p className="text-lg font-medium leading-none">
								{occupiedUnits}/{totalUnits}
							</p>
						</div>
					</div>
				</div>

				{/* View Details Button */}
				<Button
					asChild
					className={cn(
						'w-full touch-card sm:min-h-0',
						'transition-all duration-200 hover:shadow-md',
						'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
					)}
					variant="default"
					size="sm"
				>
					<Link
						href={`/properties/${property.id}`}
						aria-label={`View details for ${property.name}`}
					>
						View Details
					</Link>
				</Button>
			</CardContent>
		</Card>
	)
})

PropertyCard.displayName = 'PropertyCard'
