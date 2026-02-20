'use client'

import { useEffect, useMemo, useState } from 'react'
import { Skeleton } from '#components/ui/skeleton'
import Link from 'next/link'
import type { PropertyPerformance } from '@repo/shared/types/core'
import type { LeaseStatus, PortfolioRow } from './portfolio-types'
import { PortfolioToolbar } from './portfolio-toolbar'
import { PortfolioTableView } from './portfolio-table-view'
import { PortfolioGridView } from './portfolio-grid-view'
import { PortfolioPagination } from './portfolio-pagination'

const ITEMS_PER_PAGE = 10

interface PortfolioOverviewSectionProps {
	properties?: PropertyPerformance[]
	isLoading?: boolean
}

/**
 * Portfolio Overview Section
 * Aligned with design-os Dashboard.tsx portfolio table patterns:
 * - View toggle with proper segmented control styling
 * - Container queries for responsive grid cards
 * - Consistent touch targets (44px minimum)
 * - Improved sort indicators
 */

export function PortfolioOverviewSection({
	properties = [],
	isLoading
}: PortfolioOverviewSectionProps) {
	const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [sortField, setSortField] = useState<string>('property')
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
	const [currentPage, setCurrentPage] = useState(1)

	// Transform properties into portfolio rows
	const portfolioData: PortfolioRow[] = useMemo(() => {
		return properties.map(prop => {
			const totalUnits = prop.totalUnits ?? 0
			const occupiedUnits = prop.occupiedUnits ?? 0
			const occupancyRate = prop.occupancyRate ?? 0

			return {
				id: prop.property_id,
				property: prop.property || 'Unnamed Property',
				address: prop.address_line1 || '',
				units: { occupied: occupiedUnits, total: totalUnits },
				tenant: occupiedUnits > 0 ? `${occupiedUnits} tenants` : null,
				leaseStatus: (occupancyRate === 100
					? 'active'
					: occupancyRate >= 80
						? 'expiring'
						: 'vacant') as LeaseStatus,
				rent: prop.monthlyRevenue ?? 0
			}
		})
	}, [properties])

	// Filter and sort data
	const filteredData = useMemo(() => {
		return portfolioData
			.filter(row => {
				if (searchQuery) {
					const query = searchQuery.toLowerCase()
					if (
						!(row.property ?? '').toLowerCase().includes(query) &&
						!(row.address ?? '').toLowerCase().includes(query)
					) {
						return false
					}
				}
				if (statusFilter !== 'all' && row.leaseStatus !== statusFilter) {
					return false
				}
				return true
			})
			.sort((a, b) => {
				let comparison = 0
				switch (sortField) {
					case 'property':
						comparison = a.property.localeCompare(b.property)
						break
					case 'rent':
						comparison = a.rent - b.rent
						break
					case 'units':
						comparison = a.units.occupied - b.units.occupied
						break
					case 'status':
						comparison = a.leaseStatus.localeCompare(b.leaseStatus)
						break
				}
				return sortDirection === 'asc' ? comparison : -comparison
			})
	}, [portfolioData, searchQuery, statusFilter, sortField, sortDirection])

	// Reset page when filters change
	useEffect(() => {
		setCurrentPage(1)
	}, [searchQuery, statusFilter])

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortDirection('asc')
		}
	}

	const clearFilters = () => {
		setSearchQuery('')
		setStatusFilter('all')
	}

	const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
	const paginatedData = filteredData.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	)

	if (isLoading) {
		return (
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div className="px-4 py-3 border-b border-border flex items-center gap-3">
					<Skeleton className="h-9 w-64" />
					<div className="ml-auto flex items-center gap-3">
						<Skeleton className="h-9 w-32" />
						<Skeleton className="h-9 w-24" />
					</div>
				</div>
				<div className="p-4 space-y-3">
					{[1, 2, 3, 4, 5].map(i => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="bg-card border border-border rounded-lg overflow-hidden">
			<PortfolioToolbar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
				onClearFilters={clearFilters}
			/>

			{viewMode === 'table' ? (
				<PortfolioTableView
					rows={paginatedData}
					sortField={sortField}
					sortDirection={sortDirection}
					onSort={handleSort}
				/>
			) : (
				<PortfolioGridView rows={paginatedData} />
			)}

			<PortfolioPagination
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={filteredData.length}
				itemsPerPage={ITEMS_PER_PAGE}
				onPageChange={setCurrentPage}
			/>

			{filteredData.length === 0 && portfolioData.length > 0 && (
				<div className="text-center py-12">
					<p className="text-muted-foreground">
						No properties match your filters
					</p>
					<button
						onClick={clearFilters}
						className="mt-3 text-sm text-primary hover:underline"
					>
						Clear filters
					</button>
				</div>
			)}

			{portfolioData.length === 0 && (
				<div className="text-center py-12">
					<p className="text-muted-foreground">No properties yet</p>
					<Link
						href="/properties/new"
						className="mt-3 text-sm text-primary hover:underline block"
					>
						Add your first property
					</Link>
				</div>
			)}
		</div>
	)
}
