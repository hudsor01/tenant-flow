import React, { useMemo, useCallback } from 'react'
import { motion } from '@/lib/lazy-motion'
import Property_Card from './property-card'
import type { Database, PropertyWithUnits } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Property_ = Database['public']['Tables']['Property']['Row']

// Define local interface for component needs
type Property_WithDetails = PropertyWithUnits

interface VirtualizedPropertiesListProps {
	properties: Property_WithDetails[]
	onEdit?: (property: Property_) => void
	onView?: (property: Property_) => void
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
		(property: Property_WithDetails) => {
			if ('id' in property) {
				const maybeId = property.id
				if (typeof maybeId === 'string') {
					onEdit?.(property as Property_)
				}
			}
		},
		[onEdit]
	)

	const handleView = useCallback(
		(property: Property_WithDetails) => {
			if ('id' in property) {
				const maybeId = property.id
				if (typeof maybeId === 'string') {
					onView?.(property as Property_)
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
						<Property_Card
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
			<div className="mb-4 text-sm text-gray-6">
				Showing first 50 of {properties.length} properties. Use filters
				to narrow _results.
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
						<Property_Card
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
