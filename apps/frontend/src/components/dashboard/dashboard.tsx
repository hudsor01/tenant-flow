'use client'

/**
 * Uses Zustand store for state management (useDashboardStore).
 * See stores/dashboard-store.ts for state structure.
 */

import type { DashboardProps } from '@repo/shared/types/sections/dashboard'
import {
	formatDashboardCurrency,
	quickActions,
	type PortfolioRow,
	type QuickActionType
} from './dashboard-types'
import { RevenueOverviewChart } from './components/revenue-overview-chart'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { PortfolioToolbar } from './components/portfolio-toolbar'
import { PortfolioTable } from './components/portfolio-table'
import { PortfolioGrid } from './components/portfolio-grid'
import { PortfolioPagination } from './components/portfolio-pagination'
import {
	useDashboardStore,
	type DashboardSortField,
	type DashboardStatusFilter
} from '#stores/dashboard-store'

export function Dashboard({
	metrics,
	revenueTrend,
	propertyPerformance,
	onAddProperty,
	onCreateLease,
	onInviteTenant,
	onRecordPayment,
	onCreateMaintenanceRequest
}: DashboardProps & {
	onAddProperty?: () => void
	onCreateLease?: () => void
	onInviteTenant?: () => void
	onRecordPayment?: () => void
	onCreateMaintenanceRequest?: () => void
}) {
	// Get state and actions from Zustand store
	const {
		viewMode,
		setViewMode,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		sortField,
		sortDirection,
		handleSort,
		currentPage,
		setCurrentPage,
		itemsPerPage,
		clearFilters
	} = useDashboardStore()

	// Transform property performance into portfolio overview rows
	const portfolioData: PortfolioRow[] = propertyPerformance.map(prop => ({
		id: prop.id,
		property: prop.name,
		address: prop.address,
		units: { occupied: prop.occupiedUnits, total: prop.totalUnits },
		tenant: prop.occupiedUnits > 0 ? `${prop.occupiedUnits} tenants` : null,
		leaseStatus:
			prop.occupancyRate === 100
				? 'active'
				: prop.occupancyRate >= 80
					? 'expiring'
					: 'vacant',
		leaseEnd: null,
		rent: prop.monthlyRevenue,
		maintenanceOpen: 0 // Not in current API response
	}))

	// Filter and sort data
	const filteredData = portfolioData
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

	// Pagination
	const totalPages = Math.ceil(filteredData.length / itemsPerPage)
	const paginatedData = filteredData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	const handleAction = (action: QuickActionType) => {
		switch (action) {
			case 'addProperty':
				onAddProperty?.()
				break
			case 'createLease':
				onCreateLease?.()
				break
			case 'inviteTenant':
				onInviteTenant?.()
				break
			case 'recordPayment':
				onRecordPayment?.()
				break
			case 'createRequest':
				onCreateMaintenanceRequest?.()
				break
		}
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div data-testid="dashboard-stats">
				<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
				<p className="text-sm text-muted-foreground">
					{metrics.occupiedUnits} of {metrics.totalUnits} units occupied ·{' '}
					{formatDashboardCurrency(metrics.totalRevenue)} this month
				</p>
			</div>

			{/* Main Content: Chart (75%) + Quick Actions (25%) */}
			<div className="grid gap-6 lg:grid-cols-4" data-tour="trends-section">
				<RevenueOverviewChart revenueTrend={revenueTrend} />
				<Card data-tour="quick-actions">
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Common tasks</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						{quickActions.map(action => (
							<button
								key={action.action}
								className="flex h-auto items-center gap-3 p-3 text-left border border-border rounded-lg hover:bg-muted/50 transition-colors"
								onClick={() => handleAction(action.action)}
							>
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
									<action.icon className="h-4 w-4" />
								</div>
								<div>
									<div className="text-sm font-medium">{action.title}</div>
									<div className="text-xs text-muted-foreground">
										{action.description}
									</div>
								</div>
							</button>
						))}
					</CardContent>
				</Card>
			</div>

			{/* Portfolio Overview */}
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<PortfolioToolbar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					statusFilter={statusFilter}
					onStatusFilterChange={value =>
						setStatusFilter(value as DashboardStatusFilter)
					}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					onClearFilters={clearFilters}
				/>

				{viewMode === 'table' ? (
					<PortfolioTable
						data={paginatedData}
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={field => handleSort(field as DashboardSortField)}
					/>
				) : (
					<PortfolioGrid data={paginatedData} />
				)}

				<PortfolioPagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredData.length}
					itemsPerPage={itemsPerPage}
					onPageChange={setCurrentPage}
				/>

				{/* No results */}
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
			</div>
		</div>
	)
}
