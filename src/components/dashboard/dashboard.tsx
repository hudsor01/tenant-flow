"use client";

/**
 * Portfolio section is driven entirely by the vendored DataTable stack
 * (PortfolioDataTable): filter/sort/page live in nuqs URL params, column
 * visibility + saved presets in dashboard-presets-store, and the grid/table
 * toggle (`viewMode`) is the only piece of state left in dashboard-store.
 */

import type { OnChangeFn, VisibilityState } from "@tanstack/react-table";
import dynamic from "next/dynamic";
import { useCallback } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { useDashboardPresetsStore } from "#stores/dashboard-presets-store";
import { useDashboardViewMode } from "#stores/dashboard-store";
import type { DashboardProps } from "#types/sections/dashboard";
import { KpiBentoRow } from "./components/kpi-bento-row";
import { OccupancyDonutChartSkeleton } from "./components/occupancy-donut-chart-skeleton";
import { PortfolioDataTable } from "./components/portfolio-data-table";
import { PortfolioPresetMenu } from "./components/portfolio-preset-menu";
import { RevenueAreaChartSkeleton } from "./components/revenue-area-chart-skeleton";
import {
	type PortfolioRow,
	type QuickActionType,
	quickActions,
} from "./dashboard-types";

const RevenueAreaChart = dynamic(
	() =>
		import("./components/revenue-area-chart").then(
			(mod) => mod.RevenueAreaChart,
		),
	{ ssr: false, loading: () => <RevenueAreaChartSkeleton /> },
);

const OccupancyDonutChart = dynamic(
	() =>
		import("./components/occupancy-donut-chart").then(
			(mod) => mod.OccupancyDonutChart,
		),
	{ ssr: false, loading: () => <OccupancyDonutChartSkeleton /> },
);

export function Dashboard({
	kpiData,
	monthlyRevenue,
	monthlyRevenue6mo,
	units,
	propertyPerformance,
	onAddProperty,
	onCreateLease,
	onAddTenant,
	onCreateMaintenanceRequest,
}: DashboardProps & {
	onAddProperty?: () => void;
	onCreateLease?: () => void;
	onAddTenant?: () => void;
	onCreateMaintenanceRequest?: () => void;
}) {
	// viewMode is the ONLY store read remaining (DT-07); column visibility is
	// sourced from the persisted presets store (D-3) and forwarded to the table
	// as a controlled prop (B-2).
	const { viewMode, setViewMode } = useDashboardViewMode();
	const columnVisibility = useDashboardPresetsStore(
		(state) => state.columnVisibility,
	);
	const setColumnVisibility = useDashboardPresetsStore(
		(state) => state.setColumnVisibility,
	);

	// Adapt the store's plain setter to TanStack's OnChangeFn (which may pass an
	// updater function) by resolving the updater against the current store value.
	const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = useCallback(
		(updater) => {
			const current = useDashboardPresetsStore.getState().columnVisibility;
			setColumnVisibility(
				typeof updater === "function" ? updater(current) : updater,
			);
		},
		[setColumnVisibility],
	);

	// LOCKED(D-10): inline portfolio-row transform survives Phase 1.
	// The canonical pure transform `transformDashboardData` exists at
	// `#components/dashboard/dashboard-data` (extracted in Phase 1 per the
	// locked decision in `.planning/phases/01-foundation-dedup/01-CONTEXT.md`
	// D-10/D-11/D-12a). Consumer migration is DEFERRED — Phase 3 mounted
	// <KpiBentoRow> but explicitly did NOT do the `dashboard-view.tsx`
	// consumer migration. A future phase will replace this file and consume
	// the canonical `portfolioRows` slice from
	// `transformDashboardData(payload).portfolioRows`. The two transforms
	// operate on different upstream shapes (raw `PropertyPerformance` vs
	// section-typed `PropertyPerformanceItem` re-mapped at `page.tsx`), so
	// the dedup requires that consumer migration. Intentional architectural
	// anchor; see ROADMAP.md for the phase that closes it.
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

			{/* Main Content: Revenue chart (50%) + Occupancy donut (25%) + Quick Actions (25%) */}
			<div
				className="grid grid-cols-1 gap-6 lg:grid-cols-4"
				data-tour="trends-section"
			>
				<RevenueAreaChart
					monthlyRevenue={monthlyRevenue}
					monthlyRevenue6mo={monthlyRevenue6mo}
				/>
				<OccupancyDonutChart units={units} />
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

			{/* Portfolio Overview — driven by the vendored DataTable stack. Filter/
			    sort/page live in nuqs; the toolbar, pagination, and no-results state
			    now live inside PortfolioDataTable. */}
			<div className="flex flex-col gap-3" data-tour="portfolio-section">
				<div className="flex items-center justify-end">
					<PortfolioPresetMenu />
				</div>
				<PortfolioDataTable
					data={portfolioData}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					columnVisibility={columnVisibility}
					onColumnVisibilityChange={handleColumnVisibilityChange}
				/>
			</div>
		</div>
	);
}
