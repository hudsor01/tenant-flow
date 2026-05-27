/**
 * Pin the Phase 4 OccupancyDonutChart contract (04-UI-SPEC § 3, § 6, § 7;
 * 04-CONTEXT.md D-03 / D-08 / D-09). The Vitest unit project aliases
 * `recharts` to `src/test/mocks/recharts.tsx`, so each `<Pie>` prop is
 * observable as a `data-*` attribute on the mock — that's how this file
 * asserts `isAnimationActive` without rendering a real SVG.
 *
 * Mock policy: `useReducedMotion` is hoisted (see {@link useReducedMotionMock}
 * below) because the mock variable is referenced inside the `vi.mock()`
 * factory (CLAUDE.md Testing rule — Vitest hoists `vi.mock` to the top of
 * the file, so any captured variable must be hoisted too).
 *
 * Async note: `ChartContainer` defers the inner `<ResponsiveContainer>`
 * mount until the next animation frame, so queries that target the mock
 * subtree (`<pie>`, `<pie-label>`) wait via `findBy*` or `waitFor`.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OccupancyDonutChart } from "../occupancy-donut-chart";
import { OccupancyDonutChartSkeleton } from "../occupancy-donut-chart-skeleton";

const { useReducedMotionMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn(() => false),
}));
vi.mock("#hooks/use-reduced-motion", () => ({
	useReducedMotion: useReducedMotionMock,
}));

const populated = { occupied: 87, vacant: 13, total: 100 };
const twoThirds = { occupied: 2, vacant: 1, total: 3 };
const oneThird = { occupied: 1, vacant: 2, total: 3 };
const empty = { occupied: 0, vacant: 0, total: 0 };

beforeEach(() => {
	useReducedMotionMock.mockReturnValue(false);
});

describe("OccupancyDonutChart", () => {
	it("renders Card title 'Occupancy' + description 'Across all units' for populated units", () => {
		render(<OccupancyDonutChart units={populated} />);
		expect(screen.getByText("Occupancy")).toBeInTheDocument();
		expect(screen.getByText("Across all units")).toBeInTheDocument();
	});

	it("renders the donut wrapper with role='img' and computed aria-label", () => {
		render(<OccupancyDonutChart units={populated} />);
		const wrapper = screen.getByRole("img");
		expect(wrapper.getAttribute("aria-label")).toBe(
			"Occupancy donut: 87 percent occupied (87 of 100 units)",
		);
	});

	it("computes center percent via Math.round (87/100 → 87%)", async () => {
		render(<OccupancyDonutChart units={populated} />);
		expect(await screen.findByText("87%")).toBeInTheDocument();
	});

	it("rounds 2/3 to 67% (Math.round of 66.67)", async () => {
		render(<OccupancyDonutChart units={twoThirds} />);
		expect(await screen.findByText("67%")).toBeInTheDocument();
	});

	it("rounds 1/3 to 33% (Math.round of 33.33)", async () => {
		render(<OccupancyDonutChart units={oneThird} />);
		expect(await screen.findByText("33%")).toBeInTheDocument();
	});

	it("renders the legend as a <ul> with two <li> children", () => {
		const { container } = render(<OccupancyDonutChart units={populated} />);
		const list = container.querySelector("ul");
		expect(list).not.toBeNull();
		expect(list?.tagName).toBe("UL");
		const items = container.querySelectorAll("ul > li");
		expect(items.length).toBe(2);
	});

	it("renders raw integer counts in the legend (no computation)", () => {
		const { container } = render(<OccupancyDonutChart units={populated} />);
		const list = container.querySelector("ul");
		expect(list).not.toBeNull();
		const legend = within(list as HTMLElement);
		expect(legend.getByText("87")).toBeInTheDocument();
		expect(legend.getByText("13")).toBeInTheDocument();
		expect(legend.getByText("Occupied")).toBeInTheDocument();
		expect(legend.getByText("Vacant")).toBeInTheDocument();
	});

	it("renders empty-state when units.total === 0 (D-08)", () => {
		render(<OccupancyDonutChart units={empty} />);
		expect(screen.getByText("No units yet")).toBeInTheDocument();
		expect(
			screen.getByText("Add a property to see occupancy"),
		).toBeInTheDocument();
		expect(screen.queryByRole("img")).toBeNull();
		expect(screen.queryByRole("list")).toBeNull();
	});

	it("disables Pie animation when prefers-reduced-motion is set", async () => {
		useReducedMotionMock.mockReturnValue(true);
		render(<OccupancyDonutChart units={populated} />);
		const pie = await screen.findByTestId("pie");
		await waitFor(() => {
			expect(pie.getAttribute("data-is-animation-active")).toBe("false");
		});
	});

	it("enables Pie animation when prefers-reduced-motion is unset", async () => {
		render(<OccupancyDonutChart units={populated} />);
		const pie = await screen.findByTestId("pie");
		await waitFor(() => {
			expect(pie.getAttribute("data-is-animation-active")).toBe("true");
		});
	});

	it("does NOT render a tooltip (UI-SPEC § 3.6)", () => {
		render(<OccupancyDonutChart units={populated} />);
		expect(screen.queryByTestId("tooltip")).toBeNull();
		expect(screen.queryByTestId("chart-tooltip-content")).toBeNull();
	});
});

describe("OccupancyDonutChartSkeleton", () => {
	it("renders a Card with lg:col-span-1 + size-[160px] donut placeholder", () => {
		const { container } = render(<OccupancyDonutChartSkeleton />);
		const card = container.firstElementChild;
		expect(card?.className).toContain("lg:col-span-1");
		const donutPlaceholder = container.querySelector(
			"[class*='size-[160px]'][class*='rounded-full']",
		);
		expect(donutPlaceholder).not.toBeNull();
	});

	it("renders a 2-pill legend row (no real <ul>)", () => {
		const { container } = render(<OccupancyDonutChartSkeleton />);
		expect(container.querySelector("ul")).toBeNull();
		const pills = container.querySelectorAll(".flex.items-center.gap-2");
		expect(pills.length).toBeGreaterThanOrEqual(2);
	});
});
