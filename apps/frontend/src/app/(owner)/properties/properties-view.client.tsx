'use client'

import { PullToRefresh } from '#components/ui/pull-to-refresh'
import { ViewSwitcher, type ViewType } from '#components/view-switcher'
import { useIsMobile } from '#hooks/use-mobile'
import { usePreferencesStore } from '#providers/preferences-provider'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { PropertiesGridClient } from './properties-grid.client'
import { PropertiesTableClient } from './properties-table.client'
import { MobilePropertiesTable } from './properties-table.mobile'
import type { Property } from '@repo/shared/types/core'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Search, SearchX, X } from 'lucide-react'
import { Button } from '#components/ui/button'
import {
	PROPERTY_STATUS,
	PROPERTY_TYPES
} from '@repo/shared/constants/status-types'
import { useDebounce } from '#hooks/use-debounce'
import {
	Empty,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'

interface PropertiesViewClientProps {
	properties: Property[]
}

/**
 * Properties view switcher - handles grid/table toggle, search, filters, and mobile layout
 * Receives data from parent to avoid duplicate fetching
 */
export function PropertiesViewClient({
	properties
}: PropertiesViewClientProps) {
	const isMobile = useIsMobile()
	const queryClient = useQueryClient()
	const viewPreferences = usePreferencesStore(state => state.viewPreferences)
	const setViewPreference = usePreferencesStore(
		state => state.setViewPreference
	)
	const currentView = viewPreferences?.properties ?? 'grid'

	// Filter state
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [typeFilter, setTypeFilter] = useState<string>('all')

	// Debounce search for performance
	const debouncedSearch = useDebounce(searchQuery, 300)

	const handleRefresh = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: propertyQueries.all() })
	}, [queryClient])

	const handleViewChange = (view: ViewType) => {
		if (view === 'grid' || view === 'table') {
			setViewPreference('properties', view)
		}
	}

	const handleClearSearch = () => {
		setSearchQuery('')
	}

	const handleClearFilters = () => {
		setSearchQuery('')
		setStatusFilter('all')
		setTypeFilter('all')
	}

	// Filter properties based on search and filters
	const filteredProperties = useMemo(() => {
		return properties.filter(property => {
			// Search filter
			if (debouncedSearch) {
				const searchLower = debouncedSearch.toLowerCase()
				const matchesSearch =
					property.address_line1?.toLowerCase().includes(searchLower) ||
					property.city?.toLowerCase().includes(searchLower) ||
					property.state?.toLowerCase().includes(searchLower) ||
					property.name?.toLowerCase().includes(searchLower)

				if (!matchesSearch) return false
			}

			// Status filter
			if (statusFilter !== 'all' && property.status !== statusFilter) {
				return false
			}

			// Type filter
			if (typeFilter !== 'all' && property.property_type !== typeFilter) {
				return false
			}

			return true
		})
	}, [properties, debouncedSearch, statusFilter, typeFilter])

	const hasActiveFilters =
		searchQuery || statusFilter !== 'all' || typeFilter !== 'all'

	// Check if we have no results due to filters (not empty portfolio)
	const hasNoFilterResults =
		hasActiveFilters && filteredProperties.length === 0 && properties.length > 0

	if (isMobile) {
		return (
			<div className="space-y-4">
				<div className="flex-between">
					<h2 className="text-xl font-semibold">Portfolio</h2>
				</div>
				<PullToRefresh onRefresh={handleRefresh}>
					<MobilePropertiesTable initialProperties={filteredProperties} />
				</PullToRefresh>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex-between">
				<h2 className="text-xl font-semibold">Portfolio</h2>
				<ViewSwitcher
					currentView={currentView}
					availableViews={['grid', 'table']}
					onViewChange={handleViewChange}
					ariaLabel="Switch properties view"
				/>
			</div>

			{/* Search and Filter Controls */}
			<div className="flex-between gap-3 flex-wrap">
				{/* Search Input */}
				<div className="relative flex-1 min-w-[200px] sm:min-w-[240px] max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
					<Input
						type="search"
						placeholder="Search properties..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="pl-9 pr-9 touch-card sm:min-h-0 transition-all duration-200 focus:shadow-md"
						aria-label="Search properties"
					/>
					{searchQuery && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearSearch}
							className="absolute right-1 top-1/2 -translate-y-1/2 size-7 sm:size-7 touch-card min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 hover:bg-muted"
							aria-label="Clear search"
						>
							<X className="size-3.5" />
						</Button>
					)}
				</div>

				{/* Filter Controls */}
				<div className="flex items-center gap-2 flex-wrap">
					{/* Status Filter */}
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger
							className="min-w-[140px] touch-card sm:min-h-0 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
							aria-label="Filter by status"
						>
							<SelectValue placeholder="All Statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value={PROPERTY_STATUS.ACTIVE}>Active</SelectItem>
							<SelectItem value={PROPERTY_STATUS.INACTIVE}>Inactive</SelectItem>
							<SelectItem value={PROPERTY_STATUS.UNDER_CONTRACT}>
								Under Contract
							</SelectItem>
							<SelectItem value={PROPERTY_STATUS.SOLD}>Sold</SelectItem>
						</SelectContent>
					</Select>

					{/* Type Filter */}
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger
							className="min-w-[160px] touch-card sm:min-h-0 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
							aria-label="Filter by property type"
						>
							<SelectValue placeholder="All Types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							<SelectItem value={PROPERTY_TYPES.SINGLE_FAMILY}>
								Single Family
							</SelectItem>
							<SelectItem value={PROPERTY_TYPES.MULTI_UNIT}>
								Multi Unit
							</SelectItem>
							<SelectItem value={PROPERTY_TYPES.APARTMENT}>
								Apartment
							</SelectItem>
							<SelectItem value={PROPERTY_TYPES.CONDO}>Condo</SelectItem>
							<SelectItem value={PROPERTY_TYPES.TOWNHOUSE}>
								Townhouse
							</SelectItem>
							<SelectItem value={PROPERTY_TYPES.COMMERCIAL}>
								Commercial
							</SelectItem>
							<SelectItem value={PROPERTY_TYPES.OTHER}>Other</SelectItem>
						</SelectContent>
					</Select>

					{/* Clear Filters Button */}
					{hasActiveFilters && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleClearFilters}
							className="gap-1.5 touch-card sm:min-h-0 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
						>
							<X className="size-3.5" />
							Clear
						</Button>
					)}
				</div>
			</div>

			{/* Results Count */}
			{hasActiveFilters && !hasNoFilterResults && (
				<div className="text-sm text-muted-foreground">
					Showing {filteredProperties.length} of {properties.length} properties
				</div>
			)}

			{/* Empty state for filtered results */}
			{hasNoFilterResults ? (
				<Empty className="py-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
					<EmptyMedia
						variant="icon"
						className="bg-muted text-muted-foreground size-14 rounded-xl"
					>
						<SearchX className="size-7" />
					</EmptyMedia>
					<EmptyTitle className="text-xl">No matching properties</EmptyTitle>
					<EmptyDescription className="max-w-md">
						We couldn&apos;t find any properties matching your search criteria.
						Try adjusting your filters or search terms.
					</EmptyDescription>
					<div className="flex flex-col items-center gap-3 mt-2">
						<Button
							variant="outline"
							onClick={handleClearFilters}
							size="lg"
							className="min-h-12 px-6 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
						>
							<X className="size-4 mr-2" />
							Clear All Filters
						</Button>
						<p className="text-xs text-muted-foreground">
							Showing 0 of {properties.length} properties
						</p>
					</div>
				</Empty>
			) : currentView === 'grid' ? (
				<PropertiesGridClient data={filteredProperties} />
			) : (
				<PropertiesTableClient initialProperties={filteredProperties} />
			)}
		</div>
	)
}
