import React, { useMemo } from 'react'
import { useVirtualList, useMemoizedFn } from 'ahooks'
import { motion } from 'framer-motion'
import TenantCard from './TenantCard'
import type { TenantWithDetails } from '@/types/relationships'

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
	onEdit,
	itemHeight = 280, // Approximate height of TenantCard
	containerHeight = 600
}: VirtualizedTenantsListProps) {
	// Memoized handlers to prevent unnecessary re-renders
	const handleViewDetails = useMemoizedFn((tenant: TenantWithDetails) => {
		onViewDetails?.(tenant)
	})

	const handleEdit = useMemoizedFn((tenant: TenantWithDetails) => {
		onEdit?.(tenant)
	})

	// Calculate columns based on screen size (responsive)
	const columns = useMemo(() => {
		if (typeof window === 'undefined') return 1
		const width = window.innerWidth
		if (width >= 1024) return 3 // lg: 3 columns
		if (width >= 768) return 2 // md: 2 columns
		return 1 // sm: 1 column
	}, [])

	// Group tenants into rows for virtualization
	const rows = useMemo(() => {
		const grouped: TenantWithDetails[][] = []
		for (let i = 0; i < tenants.length; i += columns) {
			grouped.push(tenants.slice(i, i + columns))
		}
		return grouped
	}, [tenants, columns])

	// Virtual list setup
	const [containerRef, list] = useVirtualList(rows, {
		itemHeight,
		overscan: 3 // Render 3 extra items outside viewport for smooth scrolling
	})

	// Early return for small lists (virtualization not needed)
	if (tenants.length <= 20) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{tenants.map((tenant, index) => (
					<motion.div
						key={tenant.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: index * 0.05 }}
					>
						<TenantCard
							tenant={tenant}
							onViewDetails={handleViewDetails}
							onEdit={handleEdit}
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
						{row.map(tenant => (
							<motion.div
								key={tenant.id}
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3 }}
								className="h-full"
							>
								<TenantCard
									tenant={tenant}
									onViewDetails={handleViewDetails}
									onEdit={handleEdit}
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
export const VirtualizedTenantsListMemo = React.memo(VirtualizedTenantsList)
