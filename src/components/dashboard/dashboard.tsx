"use client";

/**
 * Uses Zustand store for state management (useDashboardStore).
 * See stores/dashboard-store.ts for state structure.
 */

import dynamic from "next/dynamic";
import { ChartLoadingSkeleton } from "#components/shared/chart-loading-skeleton";
import type { DashboardProps } from "#types/sections/dashboard";
import {
	type PortfolioRow,
	type QuickActionType,
	quickActions,
} from "./dashboard-types";

const RevenueOverviewChart = dynamic(
	() =>
		import("./components/revenue-overview-chart").then(
			(mod) => mod.RevenueOverviewChart,
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import {
	type DashboardSortField,
	type DashboardStatusFilter,
	useDashboardStore,
} from "#stores/dashboard-store";
import { KpiBentoRow } from "./components/kpi-bento-row";
import { PortfolioGrid } from "./components/portfolio-grid";
import { PortfolioPagination } from "./components/portfolio-pagination";
import { PortfolioTable } from "./components/portfolio-table";
import { PortfolioToolbar } from "./components/portfolio-toolbar";

export function Dashboard({
	kpiData,
	revenueTrend,
	propertyPerformance,
	onAddProperty,
	onCreateLease,
	onAddTenant,
	onRecordPayment,
	onCreateMaintenanceRequest,
}: DashboardProps & {
	onAddProperty?: () => void;
	onCreateLease?: () => void;
	onAddTenant?: () => void;
	onRecordPayment?: () => void;
	onCreateMaintenanceRequest?: () => void;
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
		clearFilters,
	} = useDashboardStore();

	// LOCKED(D-10): inline portfolio-row transform survives Phase 1.
	// The canonical pure transform `transformDashboardData` exists at
	// `#components/dashboard/dashboard-data` (extracted in Phase 1 per the
	// locked decision in `.planning/phases/01-foundation-dedup/01-CONTEXT.md`
	// D-10/D-11/D-12a). Consumer migration is Phase 3 scope: the new
	// `dashboard-view.tsx` will replace this file and consume the canonical
	// `portfolioRows` slice from `transformDashboardData(payload).portfolioRows`.
	// The two transforms operate on different upstream shapes
	// (raw `PropertyPerformance` vs section-typed `PropertyPerformanceItem`
	// re-mapped at `page.tsx`), so the dedup requires the Phase-3 consumer
	// migration — not a Phase-1 rewrite. Intentional architectural anchor.
	const portfolioData: PortfolioRow[] = propertyPerformance.map((prop) => ({
		id: prop.id,
		property: prop.name,
		address: prop.address,
		units: { occupied: prop.occupiedUnits, total: prop.totalUnits },
		tenant: prop.occupiedUnits > 0 ? `${prop.occupiedUnits} tenants` : null,
		leaseStatus:
			prop.occupancyRate === 100
				? "active"
				: prop.occupancyRate >= 80
					? "expiring"
					: "vacant",
		leaseEnd: null,
		rent: prop.monthlyRevenue,
		maintenanceOpen: prop.openMaintenance,
	}));

	// Filter and sort data
	const filteredData = portfolioData
		.filter((row) => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				if (
					!(row.property ?? "").toLowerCase().includes(query) &&
					!(row.address ?? "").toLowerCase().includes(query)
				) {
					return false;
				}
			}
			if (statusFilter !== "all" && row.leaseStatus !== statusFilter) {
				return false;
			}
			return true;
		})
		.sort((a, b) => {
			let comparison = 0;
			switch (sortField) {
				case "property":
					comparison = a.property.localeCompare(b.property);
					break;
				case "rent":
					comparison = a.rent - b.rent;
					break;
				case "units":
					comparison = a.units.occupied - b.units.occupied;
					break;
				case "status":
					comparison = a.leaseStatus.localeCompare(b.leaseStatus);
					break;
			}
			return sortDirection === "asc" ? comparison : -comparison;
		});

	// Pagination
	const totalPages = Math.ceil(filteredData.length / itemsPerPage);
	const paginatedData = filteredData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	const handleAction = (action: QuickActionType) => {
		switch (action) {
			case "addProperty":
				onAddProperty?.();
				break;
			case "createLease":
				onCreateLease?.();
				break;
			case "addTenant":
				onAddTenant?.();
				break;
			case "recordPayment":
				onRecordPayment?.();
				break;
			case "createRequest":
				onCreateMaintenanceRequest?.();
				break;
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div data-testid="dashboard-stats">
				<h1 className="typography-h1">Dashboard</h1>
				<KpiBentoRow {...kpiData} />
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
						{quickActions.map((action) => (
							<button
								type="button"
								key={action.action}
								className="flex h-auto items-center gap-3 p-3 text-left border border-border rounded-lg hover:bg-muted/50 transition-colors"
								onClick={() => handleAction(action.action)}
							>
								<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
									<action.icon aria-hidden="true" className="size-4" />
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
					onStatusFilterChange={(value) =>
						setStatusFilter(value as DashboardStatusFilter)
					}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					onClearFilters={clearFilters}
				/>

				{viewMode === "table" ? (
					<PortfolioTable
						data={paginatedData}
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={(field) => handleSort(field as DashboardSortField)}
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
							type="button"
							onClick={clearFilters}
							className="mt-3 text-sm text-primary hover:underline"
						>
							Clear filters
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
