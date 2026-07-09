/**
 * Owner dashboard query-key factory. Hierarchical keys keyed off the
 * "owner-dashboard" root enable targeted cache invalidation (e.g.
 * `queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })`).
 *
 * Lives in `query-keys/` per CLAUDE.md "Query Key Factories" — extracted
 * from `use-owner-dashboard.ts` during Phase 4 cycle-1 review to bring the
 * hook file under the 300-line cap.
 *
 * Only leaves with live consumers are included (per cycle-5 dead-code
 * pruning): `all` (invalidation sites), `analytics.stats()` (1 site),
 * `analytics.pageData()` (DASHBOARD_BASE_QUERY_OPTIONS), and
 * `financial.chartData()` (dashboardFinancialQueries). New keys should be
 * added when (not before) their first consumer lands.
 */
export const ownerDashboardKeys = {
	all: ["owner-dashboard"] as const,

	analytics: {
		all: () => [...ownerDashboardKeys.all, "analytics"] as const,
		stats: () => [...ownerDashboardKeys.analytics.all(), "stats"] as const,
		pageData: () =>
			[...ownerDashboardKeys.analytics.all(), "page-data"] as const,
	},

	financial: {
		all: () => [...ownerDashboardKeys.all, "financial"] as const,
		chartData: (year: number, timeRange: string, months: number) =>
			[
				...ownerDashboardKeys.financial.all(),
				"revenue-trends",
				year,
				timeRange,
				months,
			] as const,
	},
};
