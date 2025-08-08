import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import PropertyCard from './property-card'
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns'
import type { Property } from '@repo/shared'
import type { PropertyWithDetails } from '@repo/shared'

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
	containerHeight = 600
}: VirtualizedPropertiesListProps) {
	const handleEdit = useCallback((property: PropertyWithDetails) => {
		onEdit?.(property as unknown as Property)
	}, [onEdit])

	const handleView = useCallback((property: PropertyWithDetails) => {
		onView?.(property as unknown as Property)
	}, [onView])

	// Use custom hook for responsive columns
	const columns = useResponsiveColumns()

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