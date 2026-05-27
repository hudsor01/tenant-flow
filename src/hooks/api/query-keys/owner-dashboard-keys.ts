/**
 * Owner dashboard query-key factory. Hierarchical keys keyed off the
 * "owner-dashboard" root enable targeted cache invalidation (e.g.
 * `queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })`).
 *
 * Lives in `query-keys/` per CLAUDE.md "Query Key Factories" — extracted
 * from `use-owner-dashboard.ts` during Phase 4 cycle-1 review to bring the
 * hook file under the 300-line cap.
 */
export const ownerDashboardKeys = {
	all: ["owner-dashboard"] as const,

	// Analytics section
	analytics: {
		all: () => [...ownerDashboardKeys.all, "analytics"] as const,
		stats: () => [...ownerDashboardKeys.analytics.all(), "stats"] as const,
		activity: () =>
			[...ownerDashboardKeys.analytics.all(), "activity"] as const,
		pageData: () =>
			[...ownerDashboardKeys.analytics.all(), "page-data"] as const,
	},

	// Properties section
	properties: {
		all: () => [...ownerDashboardKeys.all, "properties"] as const,
		performance: () =>
			[...ownerDashboardKeys.properties.all(), "performance"] as const,
	},

	// Financial section
	financial: {
		all: () => [...ownerDashboardKeys.all, "financial"] as const,
		billingInsights: () =>
			[...ownerDashboardKeys.financial.all(), "billing-insights"] as const,
		revenueTrends: (year: number) =>
			[...ownerDashboardKeys.financial.all(), "revenue-trends", year] as const,
		chartData: (year: number, timeRange: string, months: number) =>
			[
				...ownerDashboardKeys.financial.all(),
				"revenue-trends",
				year,
				timeRange,
				months,
			] as const,
	},

	// Maintenance section
	maintenance: {
		all: () => [...ownerDashboardKeys.all, "maintenance"] as const,
		analytics: () =>
			[...ownerDashboardKeys.maintenance.all(), "analytics"] as const,
	},

	// Tenants section
	tenants: {
		all: () => [...ownerDashboardKeys.all, "tenants"] as const,
		occupancyTrends: () =>
			[...ownerDashboardKeys.tenants.all(), "occupancy-trends"] as const,
	},
};
