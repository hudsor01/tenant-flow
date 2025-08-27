import React, { useMemo, useCallback } from 'react'
import { motion } from '@/lib/lazy-motion'
import PropertyCard from './property-card'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Property = Database['public']['Tables']['Property']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']

// Define local interface for component needs
interface PropertyWithDetails extends Property {
	units?: Unit[]
	totalUnits?: number
	occupiedUnits?: number
}

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
	const handleEdit = useCallback(
		(property: PropertyWithDetails) => {
			if ('id' in property) {
				const maybeId = property.id
				if (typeof maybeId === 'string') {
					onEdit?.(property as Property)
				}
			}
		},
		[onEdit]
	)

	const handleView = useCallback(
		(property: PropertyWithDetails) => {
			if ('id' in property) {
				const maybeId = property.id
				if (typeof maybeId === 'string') {
					onView?.(property as Property)
				}
			}
		},
		[onView]
	)

	// Use CSS Grid with responsive columns
	const gridClasses = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3'

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
			<div className={`${gridClasses} gap-6`}>
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
				Showing first 50 of {properties.length} properties. Use filters
				to narrow results.
			</div>
			<div
				className={`${gridClasses} gap-6`}
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
