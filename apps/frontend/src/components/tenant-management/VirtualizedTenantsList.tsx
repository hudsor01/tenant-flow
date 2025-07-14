import React, { useMemo, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import TenantCard from './TenantCard'
import type { TenantWithDetails } from '@/types/api'

interface VirtualizedTenantsListProps {
	tenants: TenantWithDetails[]
	onViewDetails?: (tenant: TenantWithDetails) => void
	onEdit?: (tenant: TenantWithDetails) => void
	itemHeight?: number
	containerHeight?: number
}

export default function VirtualizedTenantsList({
	tenants,
	onViewDetails,
	onEdit: _onEdit,
	itemHeight = 280, // Approximate height of TenantCard
	containerHeight = 600
}: VirtualizedTenantsListProps) {
	// Memoized handlers to prevent unnecessary re-renders
	const handleViewDetails = useCallback((tenant: TenantWithDetails) => {
		onViewDetails?.(tenant)
	}, [onViewDetails])

	// handleEdit removed as it's not currently used in the component

	// For large lists, paginate. For small lists, show all
	const shouldVirtualize = tenants.length > 50
	const displayedTenants = useMemo(() => {
		if (shouldVirtualize) {
			// For very large lists, show first 50 items
			return tenants.slice(0, 50)
		}
		return tenants
	}, [tenants, shouldVirtualize])

	// Return simple grid for all cases
	if (!shouldVirtualize) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{displayedTenants.map((tenant, index) => (
					<motion.div
						key={tenant.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: index * 0.05 }}
					>
						<TenantCard
							tenant={tenant}
							onViewDetails={handleViewDetails}
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
				Showing first 50 of {tenants.length} tenants. Use filters to narrow results.
			</div>
			<div 
				className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
				style={{ maxHeight: containerHeight, overflow: 'auto' }}
			>
				{displayedTenants.map((tenant, index) => (
					<motion.div
						key={tenant.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: index * 0.02 }}
					>
						<TenantCard
							tenant={tenant}
							onViewDetails={handleViewDetails}
						/>
					</motion.div>
				))}
			</div>
		</div>
	)
}

// Performance optimizations memo wrapper
export const VirtualizedTenantsListMemo = React.memo(VirtualizedTenantsList)
