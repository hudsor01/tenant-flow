import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
	const handleEdit = useCallback((property: PropertyWithDetails) => {
		onEdit?.(property as Property)
	}, [onEdit])

	const handleView = useCallback((property: PropertyWithDetails) => {
		onView?.(property as Property)
	}, [onView])

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

	// For large lists, paginate. For small lists, show all
	const shouldVirtualize = properties.length > 50
	const displayedProperties = useMemo(() => {
		if (shouldVirtualize) {
			// For very large lists, show first 50 items
			return properties.slice(0, 50)
		}
		return properties
	}, [properties, shouldVirtualize])

	// Return simple grid for all cases
	if (!shouldVirtualize) {
		return (
			<div className={`grid ${gridClasses} gap-6`}>
				{displayedProperties.map((property, index) => (
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

	// For large lists, show simplified grid with pagination notice
	return (
		<div className="w-full">
			<div className="mb-4 text-sm text-gray-600">
				Showing first 50 of {properties.length} properties. Use filters to narrow results.
			</div>
			<div 
				className={`grid ${gridClasses} gap-6`}
				style={{ maxHeight: containerHeight, overflow: 'auto' }}
			>
				{displayedProperties.map((property, index) => (
					<motion.div
						key={property.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: index * 0.02 }}
					>
						<PropertyCard
							property={property}
							onEdit={() => handleEdit(property)}
							onView={() => handleView(property)}
						/>
					</motion.div>
				))}
			</div>
		</div>
	)
}

export const VirtualizedPropertiesListMemo = React.memo(
	VirtualizedPropertiesList
)