'use client'

import Image from 'next/image'
import { Building2, MapPin, Home, DollarSign, Eye } from 'lucide-react'
import { Checkbox } from '#components/ui/checkbox'
import { cn } from '#lib/utils'
import type { PropertyItem } from './types'

/**
 * Format currency amount from cents to display string
 */
function formatCurrencyCompact(amountInCents: number): string {
	const amount = amountInCents / 100
	if (amount >= 1000) {
		return `$${Math.round(amount / 1000)}K`
	}
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount)
}

export interface PropertyCardProps {
	property: PropertyItem
	isSelected?: boolean
	onSelect?: (id: string) => void
	onView?: () => void
}

/**
 * PropertyCard - Grid view card for displaying property information
 *
 * Features:
 * - Property image with fallback
 * - Selection checkbox for bulk actions
 * - Unit occupancy stats
 * - Monthly revenue display
 * - View details button
 */
export function PropertyCard({
	property,
	isSelected,
	onSelect,
	onView
}: PropertyCardProps) {
	return (
		<div
			data-testid="property-card"
			className={cn(
				'bg-card border rounded-sm overflow-hidden',
				'hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1',
				'transition-all duration-300 group',
				isSelected && 'border-primary ring-2 ring-primary/20'
			)}
		>
			{/* Property Image */}
			<div className="h-44 relative overflow-hidden">
				{property.imageUrl ? (
					<Image
						src={property.imageUrl}
						alt={property.name}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
					/>
				) : (
					<div className="flex items-center justify-center h-full bg-muted">
						<Building2 className="w-16 h-16 text-muted-foreground" />
					</div>
				)}
				{/* Selection checkbox */}
				{onSelect && (
					<div className="absolute top-2 right-2">
						<Checkbox
							checked={isSelected ?? false}
							onCheckedChange={() => onSelect(property.id)}
							className="bg-background/80 border-border"
							aria-label={`Select ${property.name}`}
						/>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-4">
				<h3 className="font-semibold text-foreground mb-1 truncate">
					{property.name}
				</h3>
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
					<MapPin className="w-3.5 h-3.5 shrink-0" />
					<span className="truncate">
						{property.addressLine1}, {property.city}
					</span>
				</div>

				{/* Stats Row */}
				<div className="flex items-center justify-between text-xs border-t border-border pt-4">
					<div className="text-center">
						<p className="text-muted-foreground mb-1">Units</p>
						<div className="flex items-center justify-center gap-1">
							<Home className="w-3.5 h-3.5 text-primary" />
							<span className="font-semibold text-foreground">
								{property.occupiedUnits}/{property.totalUnits}
							</span>
						</div>
					</div>
					<div className="w-px h-8 bg-border" />
					<div className="text-center">
						<p className="text-muted-foreground mb-1">Occupancy</p>
						<span className="font-semibold text-foreground">
							{property.occupancyRate.toFixed(0)}%
						</span>
					</div>
					<div className="w-px h-8 bg-border" />
					<div className="text-center">
						<p className="text-muted-foreground mb-1">Revenue</p>
						<div className="flex items-center justify-center gap-1">
							<DollarSign className="w-3.5 h-3.5 text-emerald-600" />
							<span className="font-semibold text-foreground">
								{formatCurrencyCompact(property.monthlyRevenue)}
							</span>
						</div>
					</div>
				</div>

				{/* View Button */}
				<button
					onClick={onView}
					className="w-full mt-4 py-2.5 text-sm font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary rounded-sm transition-all duration-200 flex items-center justify-center gap-2 group/btn min-h-11"
					aria-label={`View details for ${property.name}`}
				>
					<Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
					View Details
				</button>
			</div>
		</div>
	)
}
