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

import {
	buildKpiTileConfigs,
	KpiBentoRow,
} from "#components/dashboard/components/kpi-bento-row";
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
		window: { start_date: "2026-10-03", end_date: "2026-11-02" },
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
	revenue: { monthly: 14250, yearly: 171000 },
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

	it("declares the kpi-bento container with a utility, not an inline style", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const grid = screen.getByRole("list");
		expect(grid.classList.contains("@container/kpi-bento")).toBe(true);
		expect(grid.getAttribute("style")).toBeNull();
	});

	// A container query matches ancestors only, so a `@…/kpi-bento:` variant on
	// the element that declares `@container/kpi-bento` can never apply (66.2-39
	// F6). Checked on the loaded grid and on its skeleton twin.
	it.each([
		["loaded", false],
		["loading", true],
	] as const)(
		"never queries kpi-bento on the %s grid that declares it",
		(_state, isLoading) => {
			const { container } = render(
				<KpiBentoRow
					isLoading={isLoading}
					stats={mockStats}
					metricTrends={mockTrends}
					timeSeries={mockTimeSeries}
				/>,
			);
			const declaring = Array.from(
				container.querySelectorAll<HTMLElement>("[class]"),
			).filter((el) => el.classList.contains("@container/kpi-bento"));
			expect(declaring).toHaveLength(1);
			const selfQueries = Array.from(declaring[0]?.classList ?? []).filter(
				(c) => /^@[^/]+\/kpi-bento:/.test(c),
			);
			expect(selfQueries).toEqual([]);
		},
	);

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
		// The first tile is the active leases' rent: scheduled (66.2-39 part P).
		expect(labels).toEqual([
			"Scheduled Rent",
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

	it("Scheduled Rent aria-label matches buildTileAriaLabel template", () => {
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
			"Scheduled Rent: $14,250. This month. Up 12 percent vs. 30 days ago.",
		);
	});

	// The narrated label sits on the Stat div; a role-less div cannot be
	// named, so the tile is a named group (66.2-39).
	it("exposes each tile's narrated label on a named group", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		expect(
			screen.getByRole("group", {
				name: "Scheduled Rent: $14,250. This month. Up 12 percent vs. 30 days ago.",
			}),
		).toBeInTheDocument();
	});

	it("reduced-motion renders KPI tiles without BlurFade wrappers", () => {
		stubMatchMedia(true);
		const { container } = render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		expect(container.querySelectorAll('[data-slot="blur-fade"]')).toHaveLength(
			0,
		);
		expect(screen.getAllByRole("listitem")).toHaveLength(6);
	});

	it("default motion wraps each KPI tile in one BlurFade inside its listitem", () => {
		stubMatchMedia(false);
		const { container } = render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const wrappers = container.querySelectorAll('[data-slot="blur-fade"]');
		expect(wrappers).toHaveLength(6);
		for (const wrapper of wrappers) {
			expect(wrapper.parentElement?.getAttribute("role")).toBe("listitem");
		}
		expect(screen.getAllByRole("listitem")).toHaveLength(6);
	});

	// CP-4 follow-up: a narrow tile used to split "$" from "7,500" because the
	// prefix and the ticker were separate inline boxes in the stat's 1fr/auto
	// grid row. The label and the value now share one wrapping row and the
	// value never breaks, so a value that does not fit beside its label drops
	// below it whole.
	it("puts each label and its non-wrapping value in one wrapping row", () => {
		stubMatchMedia(true);
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
		for (const item of items) {
			const stat = item.querySelector('[data-slot="stat"]');
			const row = stat?.querySelector(':scope > [data-slot="kpi-heading"]');
			expect(row, "heading row is a direct child of the stat").not.toBeNull();
			const rowTokens = row?.className.split(/\s+/) ?? [];
			for (const token of [
				"col-span-2",
				"flex",
				"flex-wrap",
				"justify-between",
				"gap-x-4",
				"gap-y-1",
			]) {
				expect(rowTokens).toContain(token);
			}
			const children = Array.from(row?.children ?? []);
			expect(children.map((child) => child.getAttribute("data-slot"))).toEqual([
				"stat-label",
				"stat-value",
			]);
			expect(children[1]?.className.split(/\s+/)).toContain(
				"whitespace-nowrap",
			);
		}
		const revenueValue = items[0]?.querySelector('[data-slot="stat-value"]');
		expect(revenueValue?.textContent).toBe("$14,250");
		// The ticker formats the dollars itself (66.2-39): a separate "$" box
		// put a negative value's sign after the symbol ("$-250").
		expect(revenueValue?.children).toHaveLength(1);
		const ticker = revenueValue?.firstElementChild;
		expect(ticker?.textContent).toBe("$14,250");
		// Under reduced motion too, the "$" is its own span outside the digits'
		// tracking-wider, so it keeps the stat's tight tracking (66.2-39 fix
		// round 3, F51; VD-71).
		const parts = [...(ticker?.children ?? [])];
		expect(parts.map((part) => part.textContent)).toEqual(["", "$", "14,250"]);
		const symbol = parts.find((part) => part.textContent === "$");
		const digits = parts.find((part) => part.textContent === "14,250");
		expect(symbol?.className.split(/\s+/) ?? []).not.toContain(
			"tracking-wider",
		);
		expect(digits?.className.split(/\s+/)).toContain("tracking-wider");
		const occupancyValue = items[1]?.querySelector('[data-slot="stat-value"]');
		expect(occupancyValue?.textContent).toBe("87%");
	});

	// A tile's no-prior copy is what its chip says with no earlier figure, and
	// only a percent chip has that branch: a points chip always states its
	// change, a trendless tile shows no chip (66.2-39 fix round 3, F44).
	it("carries no-prior copy exactly where a chip can show it", () => {
		if (!mockTrends || !mockTimeSeries) throw new Error("fixtures unset");
		const tiles = buildKpiTileConfigs(mockStats, mockTrends, mockTimeSeries);
		expect(tiles).toHaveLength(6);
		for (const tile of tiles) {
			const canShow = tile.trend !== null && tile.trendUnit === "percent";
			expect(
				{ id: tile.id, hasCopy: tile.noPriorText !== "" },
				tile.id,
			).toEqual({ id: tile.id, hasCopy: canShow });
		}
	});

	it("states the window each chip computes, never 'last month'", () => {
		const { container } = render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={mockTrends}
				timeSeries={mockTimeSeries}
			/>,
		);
		const chips = [...container.querySelectorAll("[data-slot=stat-trend]")].map(
			(chip) => chip.textContent,
		);
		expect(chips).toEqual([
			"+12%vs. 30 days ago",
			"+10.0 ptsvs. 30 days ago",
			"\u22128%vs. 30 days ago",
		]);
		expect(container.textContent).not.toContain("last month");
	});

	it("shows occupancy's change in percentage points, as the overview tile does", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={{
					...mockTrends,
					occupancyRate: makeTrend({
						current: 75,
						previous: 100,
						change: -25,
						percentChange: -25,
						trend: "down",
					}),
				}}
				timeSeries={mockTimeSeries}
			/>,
		);
		const chip = screen
			.getAllByRole("listitem")[1]
			?.querySelector("[data-slot=stat-trend]");
		expect(chip?.textContent).toBe("\u221225.0 ptsvs. 30 days ago");
	});

	it("says there was no prior figure when percentChange is null", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={{
					...mockTrends,
					monthlyRevenue: makeTrend({ previous: 0, percentChange: null }),
					openMaintenance: makeTrend({ previous: 0, percentChange: null }),
				}}
				timeSeries={mockTimeSeries}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		expect(items[0]?.querySelector("[data-slot=stat-trend]")?.textContent).toBe(
			"No rent scheduled 30 days ago",
		);
		expect(items[3]?.querySelector("[data-slot=stat-trend]")?.textContent).toBe(
			"None open 30 days ago",
		);
		expect(items[0]?.textContent).not.toContain("0%");
	});

	it("says the change is unavailable when the server states no window", () => {
		render(
			<KpiBentoRow
				isLoading={false}
				stats={mockStats}
				metricTrends={{
					occupancyRate: makeTrend({ window: null }),
					activeTenants: makeTrend({ window: null }),
					monthlyRevenue: makeTrend({ window: null }),
					openMaintenance: makeTrend({ window: null }),
				}}
				timeSeries={mockTimeSeries}
			/>,
		);
		const chips = screen
			.getAllByRole("listitem")
			.map((item) => item.querySelector("[data-slot=stat-trend]")?.textContent)
			.filter((text) => text !== undefined);
		expect(chips).toEqual([
			"Change unavailable",
			"Change unavailable",
			"Change unavailable",
		]);
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
		expect(trend?.className).toMatch(/(?:^|\s)text-warning-text!(?:\s|$)/);
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
