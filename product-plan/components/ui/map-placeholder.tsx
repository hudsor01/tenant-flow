'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Static map image of Dallas-Fort Worth Metroplex from OpenStreetMap
// This is a free, no-API-key-required static image
const DFW_MAP_IMAGE = 'https://tile.openstreetmap.org/10/237/395.png'

// Higher quality options - using multiple tiles stitched or a static export
// Using a Wikimedia Commons map image of DFW area
const DFW_STATIC_MAP =
	'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Dallas-Fort_Worth_MMA.png/1200px-Dallas-Fort_Worth_MMA.png'

export interface MapPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Alt text for the image */
	alt?: string
	/** Aspect ratio class */
	aspectRatio?: 'video' | 'square' | 'wide'
	/** Custom static map URL (defaults to DFW) */
	staticMapUrl?: string
}

const aspectRatioClasses = {
	video: 'aspect-video',
	square: 'aspect-square',
	wide: 'aspect-[21/9]'
}

export function MapPlaceholder({
	alt = 'Dallas-Fort Worth area map',
	aspectRatio = 'video',
	staticMapUrl = DFW_STATIC_MAP,
	className,
	...props
}: MapPlaceholderProps) {
	const [imageError, setImageError] = React.useState(false)

	return (
		<div
			className={cn(
				'relative overflow-hidden bg-muted',
				aspectRatioClasses[aspectRatio],
				className
			)}
			{...props}
		>
			{!imageError ? (
				<img
					src={staticMapUrl}
					alt={alt}
					className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-40"
					onError={() => setImageError(true)}
				/>
			) : (
				// Fallback gradient if image fails to load
				<div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
			)}

			{/* Subtle overlay for better text contrast */}
			<div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
		</div>
	)
}
