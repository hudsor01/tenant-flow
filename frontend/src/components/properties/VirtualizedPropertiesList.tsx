import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useVirtualList, useMemoizedFn } from 'ahooks'
import { motion } from 'framer-motion'
import PropertyCard from './PropertyCard'
import type { Property } from '@/types/entities'
import type { PropertyWithDetails } from '@/types/api'

interface VirtualizedPropertiesListProps {
	properties: PropertyWithDetails[]
	onEdit?: (property: Property) => void
	onView?: (property: Property) => void
	itemHeight?: number
	containerHeight?: number
}

export default function VirtualizedPropertiesList({
	properties,
	onEdit,
	onView,
	itemHeight = 320,
	containerHeight = 600
}: VirtualizedPropertiesListProps) {
	const handleEdit = useMemoizedFn((property: PropertyWithDetails) => {
		onEdit?.(property as Property)
	})

	const handleView = useMemoizedFn((property: PropertyWithDetails) => {
		onView?.(property as Property)
	})

	const [columns, setColumns] = useState(1)

	useEffect(() => {
		const handleResize = () => {
			const width = window.innerWidth
			if (width >= 1024) setColumns(3)
			else if (width >= 768) setColumns(2)
			else setColumns(1)
		}
		handleResize()
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	const gridClasses = useMemo(() => {
		if (columns === 3) return 'grid-cols-3'
		if (columns === 2) return 'grid-cols-2'
		return 'grid-cols-1'
	}, [columns])

	const rows = useMemo(() => {
		const grouped: PropertyWithDetails[][] = []
		for (let i = 0; i < properties.length; i += columns) {
			grouped.push(properties.slice(i, i + columns))
		}
		return grouped
	}, [properties, columns])

	const containerRef = useRef<HTMLDivElement>(null)
	const wrapperRef = useRef<HTMLDivElement>(null)

	// Pass the refs to the hook via the options object.
	// The hook now only returns the list of items to render.
	const list = useVirtualList(rows, {
		containerTarget: containerRef,
		wrapperTarget: wrapperRef,
		itemHeight,
		overscan: 3
	})

	// Early return for small lists
	if (properties.length <= 20) {
		return (
			<div className={`grid ${gridClasses} gap-6`}>
				{properties.map((property, index) => (
					<motion.div
						key={property.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: index * 0.05 }}
					>
						<PropertyCard
							property={property}
							onEdit={() => handleEdit(property)}
							onView={() => handleView(property)}
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
			className="overflow-y-auto"
		>
			{/* The wrapper div is what the hook uses to calculate total height */}
			<div ref={wrapperRef}>
				{/* The list returned by the hook is now a simple array */}
				{Array.isArray(list) &&
					(list as { index: number; data: PropertyWithDetails[] }[]).map(({ data: row, index }) => (
						<div
							key={index}
							style={{
								height: itemHeight
							}}
							className={`grid ${gridClasses} gap-6 px-1`}
						>
							{row.map((property: PropertyWithDetails) => (
								<motion.div
									key={property.id}
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.3 }}
									className="h-full"
								>
									<PropertyCard
										property={property}
										onEdit={() => handleEdit(property)}
										onView={() => handleView(property)}
									/>
								</motion.div>
							))}
						</div>
					))}
			</div>
		</div>
	)
}

export const VirtualizedPropertiesListMemo = React.memo(
	VirtualizedPropertiesList
)