/**
 * Pin the Phase 3 KpiBentoRow contract (03-UI-SPEC § 13.2).
 *
 * - 6 tiles in D-01 order
 * - Sparklines on tiles 0 + 1 only
 * - Properties + Units omit `<StatTrend>` (D-04)
 * - `metricTrends.<field> === null` → omit the trend chip (D-09 honesty)
 * - Skeleton ↔ tile-grid branch render is mutually exclusive
 * - aria-label matches buildTileAriaLabel template
 * - Reduced-motion bypasses BlurFade wrapping
 * - Down-trend warning override class applied
 * - Sparkline-data-too-thin guard (length < 2 → no sparkline)
 * - NaN occupancy guard (renders 0%, does not crash)
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock KpiSparkline since it's dynamically imported with ssr:false and uses recharts.
vi.mock("#components/dashboard/components/kpi-sparkline", () => ({
	KpiSparkline: ({ ariaLabel }: { ariaLabel: string }) => (
		<div role="img" aria-label={ariaLabel} data-testid="sparkline-mock" />
	),
}));

import { KpiBentoRow } from "#components/dashboard/components/kpi-bento-row";
import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";
import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics";
import type { DashboardStats } from "#types/stats";

function makeTrend(overrides: Partial<MetricTrend> = {}): MetricTrend {
	return {
		current: 100,
		previous: 90,
		change: 10,
		percentChange: 12,
		trend: "up",
		...overrides,
	};
}

const sparklineData: TimeSeriesDataPoint[] = Array.from(
	{ length: 30 },
	(_, i) => ({
		date: `2026-04-${String(i + 1).padStart(2, "0")}`,
		value: 1000 + i * 50,
	}),
);

const mockStats: DashboardStats = {
	properties: {
		total: 12,
		occupied: 9,
		vacant: 3,
		occupancyRate: 75,
		totalMonthlyRent: 130500,
		averageRent: 1500,
	},
	tenants: {
		total: 30,
		active: 28,
		inactive: 2,
		newThisMonth: 1,
	},
	units: {
		total: 100,
		occupied: 87,
		vacant: 10,
		maintenance: 3,
		available: 10,
		averageRent: 1500,
		occupancyRate: 87,
		occupancyChange: 0,
		totalPotentialRent: 150000,
		totalActualRent: 130500,
	},
	leases: {
		total: 100,
		active: 87,
		expired: 8,
		expiringSoon: 3,
	},
	maintenance: {
		total: 22,
		open: 4,
		inProgress: 6,
		completed: 12,
		completedToday: 1,
		avgResolutionTime: 2.4,
		byPriority: { low: 4, medium: 12, high: 4, emergency: 2 },
	},
	revenue: { monthly: 14250, yearly: 171000, growth: 3 },
};

const mockTrends: KpiBentoRowProps["metricTrends"] = {
	occupancyRate: makeTrend({ trend: "stable", percentChange: 0 }),
	activeTenants: makeTrend({ trend: "up", percentChange: 6 }),
	monthlyRevenue: makeTrend({ trend: "up", percentChange: 12 }),
	openMaintenance: makeTrend({ trend: "down", percentChange: -8 }),
};

const mockTimeSeries: KpiBentoRowProps["timeSeries"] = {
	occupancyRate: sparklineData,
	monthlyRevenue: sparklineData,
};

function stubMatchMedia(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((media: string) => ({
			matches,
			media,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
			onchange: null,
		})),
	);
}

describe("KpiBentoRow", () => {
	beforeEach(() => {
		stubMatchMedia(false);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders 6 tiles in D-01 order", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(6);
		const labels = items.map(
			(item) => item.querySelector("[data-slot=stat-label]")?.textContent,
		);
		expect(labels).toEqual([
			"Revenue",
			"Occupancy",
			"Active leases",
			"Open maintenance",
			"Properties",
			"Units",
		]);
	});

	it("renders sparklines on tiles 0+1 only", async () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		// KpiSparkline is loaded via next/dynamic; the mocked module resolves on a
		// microtask after the initial (loading-skeleton) render, so wait for it.
		const sparklineImgs = await screen.findAllByRole("img");
		expect(sparklineImgs).toHaveLength(2);
		const items = screen.getAllByRole("listitem");
		expect(items[0]?.querySelector("[role=img]")).not.toBeNull();
		expect(items[1]?.querySelector("[role=img]")).not.toBeNull();
		expect(items[2]?.querySelector("[role=img]")).toBeNull();
		expect(items[3]?.querySelector("[role=img]")).toBeNull();
		expect(items[4]?.querySelector("[role=img]")).toBeNull();
		expect(items[5]?.querySelector("[role=img]")).toBeNull();
	});

	it("Properties + Units omit StatTrend", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		// CR-02 cycle-1 fix: Active leases tile now omits the trend chip
		// (no `active_leases` RPC signal). Properties + Units stay omitted.
		expect(items[2]?.querySelector("[data-slot=stat-trend]")).toBeNull();
		expect(items[4]?.querySelector("[data-slot=stat-trend]")).toBeNull();
		expect(items[5]?.querySelector("[data-slot=stat-trend]")).toBeNull();
		expect(items[0]?.querySelector("[data-slot=stat-trend]")).not.toBeNull();
		expect(items[1]?.querySelector("[data-slot=stat-trend]")).not.toBeNull();
		expect(items[3]?.querySelector("[data-slot=stat-trend]")).not.toBeNull();
	});

	it("metricTrends.monthlyRevenue === null omits the Revenue trend chip", () => {
		const trends: KpiBentoRowProps["metricTrends"] = {
			...mockTrends,
			monthlyRevenue: null,
		};
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={trends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		expect(items[0]?.querySelector("[data-slot=stat-trend]")).toBeNull();
		expect(items[1]?.querySelector("[data-slot=stat-trend]")).not.toBeNull();
	});

	it("loading state renders skeleton, hides loaded-tiles section", () => {
		const { rerender } = render(
			<KpiBentoRow
				isLoading={true}
				stats={null}
				metricTrends={null}
				timeSeries={null}
			/>,
		);
		expect(screen.queryByTestId("kpi-bento-row")).toBeNull();
		const loadingSection = screen.getByTestId("kpi-bento-row-loading");
		expect(loadingSection.getAttribute("aria-busy")).toBe("true");
		// IN-03 cycle-1 fix: scope the presentation query to the loading
		// grid — `screen.getAllByRole` is unscoped and would catch any
		// stray decorative element elsewhere in the render tree.
		const skeletons = within(loadingSection).getAllByRole("presentation");
		expect(skeletons).toHaveLength(6);

		rerender(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		expect(screen.queryByTestId("kpi-bento-row-loading")).toBeNull();
		expect(screen.queryByTestId("kpi-bento-row")).not.toBeNull();
	});

	it("Revenue aria-label matches buildTileAriaLabel template", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const revenueItem = screen.getAllByRole("listitem")[0];
		const stat = revenueItem?.querySelector("[aria-label]");
		expect(stat?.getAttribute("aria-label")).toBe(
			// WR-04 cycle-1 fix: "this month" now lives in spokenDescription
			// (symmetric with the other tiles), not baked into spokenValue.
			"Revenue: $14,250. This month. Up 12 percent vs. last month.",
		);
	});

	it("reduced-motion bypasses BlurFade wrapping", () => {
		stubMatchMedia(true);
		const { container } = render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		expect(
			container.querySelector("[class*=will-change-transform]"),
		).toBeNull();
		expect(screen.getAllByRole("listitem")).toHaveLength(6);
	});

	it("down-trend override class applied to Open Maintenance StatTrend", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		const trend = items[3]?.querySelector("[data-slot=stat-trend]");
		expect(trend?.className).toMatch(/!text-warning-text/);
	});

	it("sparkline-data-too-thin guard: data length 1 → no sparkline", async () => {
		const thinTimeSeries: KpiBentoRowProps["timeSeries"] = {
			occupancyRate: sparklineData,
			monthlyRevenue: [{ date: "2026-05-01", value: 1000 }],
		};
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={thinTimeSeries}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		// KpiSparkline is loaded via next/dynamic; wait for the mocked module to
		// resolve before asserting the thin-data guard suppressed tile 0's sparkline.
		await waitFor(() => {
			expect(items[1]?.querySelector("[role=img]")).not.toBeNull();
		});
		expect(items[0]?.querySelector("[role=img]")).toBeNull();
	});

	it("NaN occupancy guard renders 0% and does not crash", () => {
		const nanStats: DashboardStats = {
			...mockStats,
			units: { ...mockStats.units, occupancyRate: Number.NaN },
		};
		expect(() =>
			render(
				<KpiBentoRow
					isLoading={false}
					stats={nanStats}
					metricTrends={mockTrends}
					timeSeries={mockTimeSeries}
				/>,
			),
		).not.toThrow();
		const items = screen.getAllByRole("listitem");
		const occupancyValue = items[1]?.querySelector("[data-slot=stat-value]");
		expect(occupancyValue?.textContent).toMatch(/0/);
		expect(occupancyValue?.textContent).toMatch(/%/);
	});
});
