/**
 * The first commit of every `useReducedMotion` consumer under
 * `prefers-reduced-motion: reduce`, with the REAL hook (66.2-39 fix round 4,
 * G16).
 *
 * The consumers' own test files mock the hook, so none of them can see which
 * branch a fresh mount commits first. Here `window.matchMedia` reports
 * `reduce` and a `Profiler` reads the DOM at every commit, before any passive
 * effect runs: the first commit is what the browser can paint first. While
 * the hook set its value from an effect, every fresh mount committed the
 * motion-on branch first: the dashboard tiles read "$0" and "0%" and the
 * collection rate "0%", and Chrome painted that frame (measured in the fix
 * round 4 Part 4 Chrome probe).
 *
 * The two charts mount their Recharts tree one animation frame late
 * (ChartContainer's mount gate), so their first committed series is read from
 * every commit that holds it. NumberTicker counts from `startValue`; a caller
 * that wants its figure on the first frame passes the value as `startValue`
 * under reduced motion, as KpiBentoRow does.
 */

import { render, screen } from "@testing-library/react";
import { Profiler, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";
import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics";
import type { DashboardStats } from "#types/stats";

const { useCollectionRateMock } = vi.hoisted(() => ({
	useCollectionRateMock: vi.fn(),
}));

vi.mock("#hooks/api/use-owner-dashboard-financial", () => ({
	useCollectionRate: useCollectionRateMock,
}));

// KpiSparkline loads through next/dynamic; its chart is not under test here.
vi.mock("#components/dashboard/components/kpi-sparkline", () => ({
	KpiSparkline: () => null,
}));

import { KpiBentoRow } from "#components/dashboard/components/kpi-bento-row";
import { OccupancyDonutChart } from "#components/dashboard/components/occupancy-donut-chart";
import { RevenueAreaChart } from "#components/dashboard/components/revenue-area-chart";
import { CollectionRateKpi } from "#components/ledger/collection-rate-kpi";
import { NumberTicker } from "#components/ui/number-ticker";

function stubReducedMotion(reduce: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((media: string) => ({
			matches: reduce && media.includes("prefers-reduced-motion"),
			media,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	);
}

/** Renders `ui` inside a Profiler that records `read()` at every commit. */
function recordCommits(read: () => string) {
	const commits: string[] = [];
	const wrap = (ui: ReactNode) => (
		<Profiler id="first-commit" onRender={() => commits.push(read())}>
			{ui}
		</Profiler>
	);
	return { commits, wrap };
}

function trend(overrides: Partial<MetricTrend> = {}): MetricTrend {
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

const series: TimeSeriesDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
	date: `2026-04-${String(i + 1).padStart(2, "0")}`,
	value: 1000 + i * 50,
}));

const stats: DashboardStats = {
	properties: {
		total: 12,
		occupied: 9,
		vacant: 3,
		occupancyRate: 75,
		totalMonthlyRent: 130500,
		averageRent: 1500,
	},
	tenants: { total: 30, active: 28, inactive: 2, newThisMonth: 1 },
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
	leases: { total: 100, active: 87, expired: 8, expiringSoon: 3 },
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

const metricTrends: KpiBentoRowProps["metricTrends"] = {
	occupancyRate: trend({ trend: "stable", percentChange: 0 }),
	activeTenants: trend({ percentChange: 6 }),
	monthlyRevenue: trend({ percentChange: 12 }),
	openMaintenance: trend({ trend: "down", percentChange: -8 }),
};

const timeSeries: KpiBentoRowProps["timeSeries"] = {
	occupancyRate: series,
	monthlyRevenue: series,
};

/** The first two tiles' figures, or "(skeleton)" before the tiles exist. */
function readTiles(): string {
	const values = [
		...document.querySelectorAll(
			'[data-testid="kpi-bento-row"] [data-slot="stat-value"]',
		),
	].map((value) => value.textContent);
	return values.length > 0 ? values.slice(0, 2).join(" | ") : "(skeleton)";
}

beforeEach(() => {
	stubReducedMotion(true);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useReducedMotion consumers commit the reduced branch first", () => {
	it("KpiBentoRow: the tiles' first commit after the skeleton holds their figures", () => {
		const { commits, wrap } = recordCommits(readTiles);
		const { rerender } = render(
			wrap(
				<KpiBentoRow
					isLoading
					stats={null}
					metricTrends={null}
					timeSeries={null}
				/>,
			),
		);
		rerender(
			wrap(
				<KpiBentoRow
					isLoading={false}
					stats={stats}
					metricTrends={metricTrends}
					timeSeries={timeSeries}
				/>,
			),
		);

		const tileCommits = commits.filter((commit) => commit !== "(skeleton)");
		expect(tileCommits[0]).toBe("$14,250 | 87%");
		expect(new Set(tileCommits)).toEqual(new Set(["$14,250 | 87%"]));
	});

	it("KpiBentoRow: a row mounted with its data commits no BlurFade and its figures first", () => {
		const { commits, wrap } = recordCommits(
			() =>
				`${document.querySelectorAll('[data-slot="blur-fade"]').length} ${readTiles()}`,
		);
		render(
			wrap(
				<KpiBentoRow
					isLoading={false}
					stats={stats}
					metricTrends={metricTrends}
					timeSeries={timeSeries}
				/>,
			),
		);

		expect(commits[0]).toBe("0 $14,250 | 87%");
		expect(new Set(commits)).toEqual(new Set(["0 $14,250 | 87%"]));
	});

	it("CollectionRateKpi: the first commit prints the rate, not a ticker at 0", () => {
		useCollectionRateMock.mockReturnValue({
			data: { scheduled: 2000, collected: 1900, rate: 95 },
			isPending: false,
			isError: false,
		});
		const { commits, wrap } = recordCommits(
			() =>
				document.querySelector('[data-testid="collection-rate-kpi"]')
					?.textContent ?? "(none)",
		);
		render(wrap(<CollectionRateKpi />));

		expect(commits[0]).toContain("95%");
		expect(commits.some((commit) => commit.includes("Collection rate0%"))).toBe(
			false,
		);
	});

	it("RevenueAreaChart: every commit that holds the series holds it static", async () => {
		const { commits, wrap } = recordCommits(
			() =>
				document
					.querySelector('[data-testid="area"]')
					?.getAttribute("data-is-animation-active") ?? "(none)",
		);
		render(
			wrap(
				<RevenueAreaChart
					monthlyRevenue={[
						{ date: "2026-05-22T00:00:00.000Z", value: 12345 },
						{ date: "2026-05-23T00:00:00.000Z", value: 13000 },
					]}
					monthlyRevenue6mo={[]}
				/>,
			),
		);
		await screen.findByTestId("area");

		const withSeries = commits.filter((commit) => commit !== "(none)");
		expect(withSeries.length).toBeGreaterThan(0);
		expect(new Set(withSeries)).toEqual(new Set(["false"]));
	});

	it("OccupancyDonutChart: every commit that holds the pie holds it static", async () => {
		const { commits, wrap } = recordCommits(
			() =>
				document
					.querySelector('[data-testid="pie"]')
					?.getAttribute("data-is-animation-active") ?? "(none)",
		);
		render(
			wrap(
				<OccupancyDonutChart units={{ total: 10, occupied: 7, vacant: 3 }} />,
			),
		);
		await screen.findByTestId("pie");

		const withPie = commits.filter((commit) => commit !== "(none)");
		expect(withPie.length).toBeGreaterThan(0);
		expect(new Set(withPie)).toEqual(new Set(["false"]));
	});

	it("NumberTicker: started at its value, it commits the value first and schedules no frame", () => {
		const raf = vi.spyOn(globalThis, "requestAnimationFrame");
		const { commits, wrap } = recordCommits(
			() => document.querySelector("[data-probe]")?.textContent ?? "(none)",
		);
		render(wrap(<NumberTicker data-probe value={42} startValue={42} />));

		expect(commits[0]).toBe("42");
		expect(new Set(commits)).toEqual(new Set(["42"]));
		expect(raf).not.toHaveBeenCalled();
		raf.mockRestore();
	});
});
