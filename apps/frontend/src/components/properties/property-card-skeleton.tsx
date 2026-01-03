'use client'

import type { CSSProperties } from 'react'

import { Card, CardContent, CardHeader } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { cn } from '#lib/utils'

interface PropertyCardSkeletonProps {
	className?: string
	style?: CSSProperties
}

/**
 * PropertyCardSkeleton - Loading placeholder that matches the PropertyCard layout
 * Prevents layout shift and provides visual feedback during data loading
 */
export function PropertyCardSkeleton({
	className,
	style
}: PropertyCardSkeletonProps) {
	return (
		<Card
			className={cn(
				'card-standard overflow-hidden animate-in fade-in slide-in-from-bottom-4',
				className
			)}
			style={style}
			data-testid="property-card-skeleton"
		>
			{/* Property Image Skeleton */}
			<Skeleton className="aspect-video w-full rounded-none" />

			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-2 flex-1 min-w-0">
						{/* Title Skeleton */}
						<Skeleton className="h-6 w-3/4" />
						{/* Address Skeleton */}
						<div className="flex items-center gap-1.5">
							<Skeleton className="size-3.5 rounded" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
					{/* Menu Button Skeleton */}
					<Skeleton className="size-9 rounded-md" />
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Key Metrics Row Skeleton */}
				<div className="grid grid-cols-3 gap-3">
					{/* Occupancy Skeleton */}
					<div className="flex items-center gap-2">
						<Skeleton className="size-8 rounded-lg" />
						<div className="flex-1 min-w-0 space-y-1">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="h-5 w-10" />
						</div>
					</div>

					{/* Revenue Skeleton */}
					<div className="flex items-center gap-2">
						<Skeleton className="size-8 rounded-lg" />
						<div className="flex-1 min-w-0 space-y-1">
							<Skeleton className="h-3 w-14" />
							<Skeleton className="h-5 w-12" />
						</div>
					</div>

					{/* Units Skeleton */}
					<div className="flex items-center gap-2">
						<Skeleton className="size-8 rounded-lg" />
						<div className="flex-1 min-w-0 space-y-1">
							<Skeleton className="h-3 w-10" />
							<Skeleton className="h-5 w-8" />
						</div>
					</div>
				</div>

				{/* View Details Button Skeleton */}
				<Skeleton className="h-9 w-full rounded-md" />
			</CardContent>
		</Card>
	)
}

/**
 * PropertyGridSkeleton - Loading placeholder for the entire property grid
 * Shows multiple skeleton cards with staggered animation delays
 */
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="property-grid">
			{Array.from({ length: count }).map((_, index) => (
				<PropertyCardSkeleton
					key={index}
					style={{ animationDelay: `${index * 75}ms` }}
				/>
			))}
		</div>
	)
}
