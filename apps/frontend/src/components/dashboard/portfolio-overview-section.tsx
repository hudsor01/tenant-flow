'use client'

import { useEffect, useMemo, useState } from 'react'
import {
	ChevronLeft,
	ChevronRight,
	LayoutGrid,
	List,
	Search,
	X
} from 'lucide-react'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { Skeleton } from '#components/ui/skeleton'
import Link from 'next/link'
import { formatCents } from '#lib/formatters/currency'
import type { PropertyPerformance } from '@repo/shared/types/core'

type LeaseStatus = 'active' | 'expiring' | 'vacant'

type PortfolioRow = {
	id: string
	property: string
	address: string
	units: { occupied: number; total: number }
	tenant: string | null
	leaseStatus: LeaseStatus
	rent: number
}

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
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
		'asc'
	)
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

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
						!row.property.toLowerCase().includes(query) &&
						!row.address.toLowerCase().includes(query)
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

	// Pagination
	const totalPages = Math.ceil(filteredData.length / itemsPerPage)
	const paginatedData = filteredData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

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

	const SortIndicator = ({ field }: { field: string }) => {
		if (sortField !== field) return null
		return (
			<span className="ml-1 text-xs">
				{sortDirection === 'asc' ? '↑' : '↓'}
			</span>
		)
	}

	const getStatusBadge = (status: LeaseStatus) => {
		const styles = {
			active:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			expiring:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			vacant:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
		}
		const labels = {
			active: 'Active',
			expiring: 'Expiring',
			vacant: 'Vacant'
		}
		return (
			<span
				className={`text-xs font-medium px-2 py-0.5 rounded ${styles[status]}`}
			>
				{labels[status]}
			</span>
		)
	}

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
			{/* Toolbar */}
			<div className="px-4 py-3 border-b border-border flex items-center gap-3">
				{/* Search */}
				<div className="relative w-64">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search properties..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="pl-9 h-9"
					/>
				</div>

				{/* Filters + View Toggle */}
				<div className="flex items-center gap-3 ml-auto">
					{(searchQuery || statusFilter !== 'all') && (
						<button
							onClick={clearFilters}
							className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
						>
							<X className="h-3 w-3" />
							Clear
						</button>
					)}

					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-[140px] h-9">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="expiring">Expiring</SelectItem>
							<SelectItem value="vacant">Vacant</SelectItem>
						</SelectContent>
					</Select>

					{/* View Toggle - using view-toggle utility for consistent styling */}
					<div className="view-toggle" role="group" aria-label="View mode">
						<button
							onClick={() => setViewMode('grid')}
							className="view-toggle-button"
							data-active={viewMode === 'grid'}
							aria-pressed={viewMode === 'grid'}
						>
							<LayoutGrid className="w-4 h-4" aria-hidden="true" />
							<span className="hidden sm:inline">Grid</span>
						</button>
						<button
							onClick={() => setViewMode('table')}
							className="view-toggle-button"
							data-active={viewMode === 'table'}
							aria-pressed={viewMode === 'table'}
						>
							<List className="w-4 h-4" aria-hidden="true" />
							<span className="hidden sm:inline">Table</span>
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			{viewMode === 'table' ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead
								className="cursor-pointer hover:bg-muted/50"
								onClick={() => handleSort('property')}
							>
								Property
								<SortIndicator field="property" />
							</TableHead>
							<TableHead
								className="cursor-pointer hover:bg-muted/50"
								onClick={() => handleSort('units')}
							>
								Units
								<SortIndicator field="units" />
							</TableHead>
							<TableHead
								className="cursor-pointer hover:bg-muted/50 hidden md:table-cell"
								onClick={() => handleSort('status')}
							>
								Status
								<SortIndicator field="status" />
							</TableHead>
							<TableHead
								className="text-right cursor-pointer hover:bg-muted/50"
								onClick={() => handleSort('rent')}
							>
								Monthly Rent
								<SortIndicator field="rent" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedData.map(row => (
							<TableRow key={row.id} className="group">
								<TableCell>
									<Link
										href={`/properties/${row.id}`}
										className="hover:underline"
									>
										<div className="font-medium">{row.property}</div>
										<div className="text-xs text-muted-foreground">
											{row.address}
										</div>
									</Link>
								</TableCell>
								<TableCell>
									<span className="tabular-nums">
										{row.units.occupied}/{row.units.total}
									</span>
									<span className="ml-1 text-xs text-muted-foreground">
										occupied
									</span>
								</TableCell>
								<TableCell className="hidden md:table-cell">
									{getStatusBadge(row.leaseStatus)}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{formatCents(row.rent)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				/* Grid View - Using @container queries for responsive layout */
				<div className="@container p-4">
					<div className="grid gap-4 grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
						{paginatedData.map(row => (
							<Link
								key={row.id}
								href={`/properties/${row.id}`}
								className="border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm transition-all duration-fast group"
							>
								<div className="flex items-start justify-between gap-2 mb-3">
									<div className="min-w-0">
										<div className="font-medium text-foreground truncate">
											{row.property}
										</div>
										<div className="text-xs text-muted-foreground truncate">
											{row.address}
										</div>
									</div>
									{getStatusBadge(row.leaseStatus)}
								</div>
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<div className="text-muted-foreground text-xs font-medium">
											Units
										</div>
										<div className="tabular-nums text-foreground">
											{row.units.occupied}/{row.units.total}
										</div>
									</div>
									<div>
										<div className="text-muted-foreground text-xs font-medium">
											Rent
										</div>
										<div className="tabular-nums text-foreground">
											{formatCents(row.rent)}
										</div>
									</div>
									<div>
										<div className="text-muted-foreground text-xs font-medium">
											Tenants
										</div>
										<div className="text-foreground">{row.tenant || '—'}</div>
									</div>
									<div>
										<div className="text-muted-foreground text-xs font-medium">
											Status
										</div>
										<div className="text-foreground capitalize">
											{row.leaseStatus}
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			)}

			{/* Pagination */}
			{filteredData.length > 0 && totalPages > 1 && (
				<div className="px-4 py-3 border-t border-border flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						Showing {(currentPage - 1) * itemsPerPage + 1}–
						{Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
						{filteredData.length}
					</span>
					<div className="flex items-center gap-1">
						<button
							onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						{Array.from(
							{ length: Math.min(totalPages, 5) },
							(_, i) => i + 1
						).map(page => (
							<button
								key={page}
								onClick={() => setCurrentPage(page)}
								className={`min-w-8 h-8 px-2 text-sm font-medium rounded-md transition-colors ${
									page === currentPage
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-muted text-muted-foreground'
								}`}
							>
								{page}
							</button>
						))}
						<button
							onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}

			{/* Empty state */}
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
