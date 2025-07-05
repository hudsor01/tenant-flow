import React, { useMemo } from 'react'
import { useVirtualList, useMemoizedFn } from 'ahooks'
import { motion } from 'framer-motion'
import PropertyCard from './PropertyCard'
import type { Property } from '@/types/entities'
import type { PropertyWithUnits } from '@/types/relationships'

interface VirtualizedPropertiesListProps {
	properties: PropertyWithUnits[]
	onEdit?: (property: Property) => void
	onView?: (property: Property) => void
	itemHeight?: number
	containerHeight?: number
}

export default function VirtualizedPropertiesList({
	properties,
	onEdit,
	onView,
	itemHeight = 320, // Approximate height of PropertyCard
	containerHeight = 600
}: VirtualizedPropertiesListProps) {
	// Memoized handlers to prevent unnecessary re-renders
	const handleEdit = useMemoizedFn((property: PropertyWithUnits) => {
		onEdit?.(property as Property)
	})

	const handleView = useMemoizedFn((property: PropertyWithUnits) => {
		onView?.(property as Property)
	})

	// Calculate columns based on screen size (responsive)
	const columns = useMemo(() => {
		if (typeof window === 'undefined') return 1
		const width = window.innerWidth
		if (width >= 1024) return 3 // lg: 3 columns
		if (width >= 768) return 2 // md: 2 columns
		return 1 // sm: 1 column
	}, [])

	// Group properties into rows for virtualization
	const rows = useMemo(() => {
		const grouped: PropertyWithUnits[][] = []
		for (let i = 0; i < properties.length; i += columns) {
			grouped.push(properties.slice(i, i + columns))
		}
		return grouped
	}, [properties, columns])

	// Virtual list setup
	const [containerRef, list] = useVirtualList(rows, {
		itemHeight,
		overscan: 3 // Render 3 extra items outside viewport for smooth scrolling
	})

	// Early return for small lists (virtualization not needed)
	if (properties.length <= 20) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{properties.map((property, index) => (
					<motion.div
						key={property.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: index * 0.05 }}
					>
						<PropertyCard
							property={property}
							onEdit={handleEdit}
							onView={handleView}
						/>
					</motion.div>
				))}
			</div>
		)
	}

	return (
		<div
			ref={containerRef}
			style={{ height: containerHeight }}
			className="overflow-auto"
		>
			<div style={{ height: list.totalHeight }}>
				{list.map(({ data: row, index }) => (
					<div
						key={index}
						style={{
							position: 'absolute',
							top: index * itemHeight,
							width: '100%',
							height: itemHeight
						}}
						className="grid grid-cols-1 gap-6 px-1 md:grid-cols-2 lg:grid-cols-3"
					>
						{row.map(property => (
							<motion.div
								key={property.id}
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3 }}
								className="h-full"
							>
								<PropertyCard
									property={property}
									onEdit={handleEdit}
									onView={handleView}
								/>
							</motion.div>
						))}
					</div>
				))}
			</div>
		</div>
	)
}

// Performance optimizations memo wrapper
export const VirtualizedPropertiesListMemo = React.memo(
	VirtualizedPropertiesList
)
