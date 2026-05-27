/**
 * Pin the Phase 4 RevenueAreaChart contract (04-UI-SPEC § 2, § 4, § 5, § 6,
 * § 7; 04-CONTEXT.md D-04 / D-07 / D-08 / D-09). The Vitest unit project
 * aliases `recharts` to `src/test/mocks/recharts.tsx`, so each
 * `<Area>`/`<AreaChart>` prop is observable as a `data-*` attribute on the
 * mock — that's how this file asserts `isAnimationActive`, `data-stroke`,
 * and the per-window `data-data` payload without rendering a real SVG.
 *
 * Mock policy: `useReducedMotion` is hoisted (see {@link useReducedMotionMock}
 * below) because the mock variable is referenced inside the `vi.mock()`
 * factory (CLAUDE.md Testing rule — Vitest hoists `vi.mock` to the top of
 * the file, so any captured variable must be hoisted too).
 *
 * Async note: `ChartContainer` defers the inner `<ResponsiveContainer>`
 * mount until the next animation frame (see `src/components/ui/chart.tsx`
 * — the `mounted` state guards the conditional render so Recharts never
 * measures a zero-sized parent). So queries that target the mock subtree
 * (`<area-chart>`, `<area>`) wait via `findBy*` or `waitFor`.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	MonthlyRevenuePoint,
	TimeSeriesDataPoint,
} from "#types/analytics";
import {
	RevenueAreaChart,
	RevenueAreaChartSkeleton,
} from "../revenue-area-chart";

const { useReducedMotionMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn(() => false),
}));
vi.mock("#hooks/use-reduced-motion", () => ({
	useReducedMotion: useReducedMotionMock,
}));

const daily30d: TimeSeriesDataPoint[] = [
	{ date: "2026-05-22T00:00:00.000Z", value: 12345.67 },
	{ date: "2026-05-23T00:00:00.000Z", value: 13000.0 },
	{ date: "2026-05-24T00:00:00.000Z", value: 14250.5 },
	{ date: "2026-05-25T00:00:00.000Z", value: 15100.25 },
	{ date: "2026-05-26T00:00:00.000Z", value: 16500.0 },
];

const monthly6mo: MonthlyRevenuePoint[] = [
	{ month: "2025-12", value: 100000 },
	{ month: "2026-01", value: 105000 },
	{ month: "2026-02", value: 110000 },
	{ month: "2026-03", value: 115000 },
	{ month: "2026-04", value: 120000 },
	{ month: "2026-05", value: 130000 },
];

const emptyDaily: TimeSeriesDataPoint[] = [];
const empty6mo: MonthlyRevenuePoint[] = [];

async function findAreaChartData(): Promise<unknown> {
	const node = await screen.findByTestId("area-chart");
	const raw = node.getAttribute("data-data");
	return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
	useReducedMotionMock.mockReturnValue(false);
});

describe("RevenueAreaChart", () => {
	it("renders Revenue title + 'Last 30 days' description on initial mount", () => {
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		expect(screen.getByText("Revenue")).toBeInTheDocument();
		expect(screen.getByText("Last 30 days")).toBeInTheDocument();
	});

	it("renders Tabs with both 30d and 6mo triggers", () => {
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		expect(screen.getByRole("tab", { name: "30d" })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "6mo" })).toBeInTheDocument();
	});

	it("renders 30d series data by default", async () => {
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		const payload = await findAreaChartData();
		expect(Array.isArray(payload)).toBe(true);
		const first = (payload as Array<Record<string, unknown>>)[0];
		expect(first).toBeDefined();
		expect(first?.date).toBe("2026-05-22T00:00:00.000Z");
		expect(first?.value).toBe(12345.67);
	});

	it("switches to 6mo series + 'Last 6 months' description on 6mo trigger click", async () => {
		const user = userEvent.setup();
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		await user.click(screen.getByRole("tab", { name: "6mo" }));
		expect(screen.getByText("Last 6 months")).toBeInTheDocument();
		const payload = await findAreaChartData();
		const first = (payload as Array<Record<string, unknown>>)[0];
		expect(first?.month).toBe("2025-12");
		expect(first?.value).toBe(100000);
		// Confirm raw pass-through: the 6mo payload does NOT carry a `date` key.
		expect(first).not.toHaveProperty("date");
	});

	it("switches back to 30d on subsequent toggle", async () => {
		const user = userEvent.setup();
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		await user.click(screen.getByRole("tab", { name: "6mo" }));
		expect(screen.getByText("Last 6 months")).toBeInTheDocument();
		await user.click(screen.getByRole("tab", { name: "30d" }));
		expect(screen.getByText("Last 30 days")).toBeInTheDocument();
		const payload = await findAreaChartData();
		const first = (payload as Array<Record<string, unknown>>)[0];
		expect(first?.date).toBe("2026-05-22T00:00:00.000Z");
	});

	it("renders empty-state when both windows are empty", async () => {
		const user = userEvent.setup();
		render(
			<RevenueAreaChart
				monthlyRevenue={emptyDaily}
				monthlyRevenue6mo={empty6mo}
			/>,
		);
		expect(screen.getByText("No revenue data yet")).toBeInTheDocument();
		expect(
			screen.getByText("Add a lease to start tracking revenue"),
		).toBeInTheDocument();
		// Toggle still mounted and clickable; flips to 6mo and stays empty.
		await user.click(screen.getByRole("tab", { name: "6mo" }));
		expect(screen.getByText("No revenue data yet")).toBeInTheDocument();
	});

	it("renders empty-state in 6mo window when 30d has data but 6mo is empty (D-08 edge)", async () => {
		const user = userEvent.setup();
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={empty6mo}
			/>,
		);
		// 30d default: chart present (wait for rAF mount).
		expect(await screen.findByTestId("area-chart")).toBeInTheDocument();
		// Flip to 6mo: empty-state shown, chart gone.
		await user.click(screen.getByRole("tab", { name: "6mo" }));
		expect(screen.getByText("No revenue data yet")).toBeInTheDocument();
		expect(screen.queryByTestId("area-chart")).toBeNull();
		// Flip back to 30d: chart re-mounts, empty-state gone.
		await user.click(screen.getByRole("tab", { name: "30d" }));
		expect(screen.queryByText("No revenue data yet")).toBeNull();
		expect(await screen.findByTestId("area-chart")).toBeInTheDocument();
	});

	it("disables Area animation when prefers-reduced-motion is set", async () => {
		useReducedMotionMock.mockReturnValue(true);
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		const area = await screen.findByTestId("area");
		expect(area.getAttribute("data-is-animation-active")).toBe("false");
	});

	it("enables Area animation when prefers-reduced-motion is unset", async () => {
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		const area = await screen.findByTestId("area");
		expect(area.getAttribute("data-is-animation-active")).toBe("true");
	});

	it("uses --color-chart-1 token for Area stroke (CHART-03)", async () => {
		render(
			<RevenueAreaChart
				monthlyRevenue={daily30d}
				monthlyRevenue6mo={monthly6mo}
			/>,
		);
		const area = await screen.findByTestId("area");
		expect(area.getAttribute("data-stroke")).toBe("var(--color-chart-1)");
	});
});

describe("RevenueAreaChartSkeleton", () => {
	it("renders a Card with lg:col-span-2 + h-[300px] skeleton body", async () => {
		const { container } = render(<RevenueAreaChartSkeleton />);
		const card = container.firstElementChild as HTMLElement | null;
		expect(card).not.toBeNull();
		expect(card?.className).toContain("lg:col-span-2");
		// Skeleton body placeholder uses the Tailwind arbitrary-value h-[300px].
		await waitFor(() => {
			expect(container.querySelector('[class*="h-[300px]"]')).not.toBeNull();
		});
	});

	it("renders a static disabled segmented control (aria-hidden) and no real Tabs", () => {
		const { container } = render(<RevenueAreaChartSkeleton />);
		// Static placeholder pill is aria-hidden so screen readers skip it.
		expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
		// No real Tabs subtree → no role="tab" descendants.
		expect(screen.queryAllByRole("tab").length).toBe(0);
	});
});
