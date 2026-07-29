/**
 * Pin the collection-rate KPI contract (LEDGER-08, D-07/D-08).
 *
 * - Honest 0% + "start tracking" helper when nothing is scheduled
 * - Real rate + "Collected ÷ scheduled, this month" helper when it is
 * - The status ICON is a lucide svg, never `getCollectionRateStatus`'s
 *   placeholder label strings ("TARGET:", "[OK]", "WARNING:", "[DOWN]")
 * - No-data state stays visually neutral instead of scoring a "Poor" grade
 * - Loading -> skeleton tile; error -> honest "Unavailable", never a number
 * - The rate is used as the 0-100 percent SQL already returned (no re-scaling)
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useCollectionRateMock = vi.hoisted(() => vi.fn());
const useReducedMotionMock = vi.hoisted(() => vi.fn(() => true));

vi.mock("#hooks/api/use-owner-dashboard-financial", () => ({
	useCollectionRate: useCollectionRateMock,
}));

vi.mock("#hooks/use-reduced-motion", () => ({
	useReducedMotion: useReducedMotionMock,
}));

import { CollectionRateKpi } from "#components/ledger/collection-rate-kpi";

function mockResult(
	overrides: Partial<{
		data: { scheduled: number; collected: number; rate: number } | undefined;
		isPending: boolean;
		isError: boolean;
	}> = {},
) {
	useCollectionRateMock.mockReturnValue({
		data: { scheduled: 2000, collected: 1900, rate: 95 },
		isPending: false,
		isError: false,
		...overrides,
	});
}

describe("CollectionRateKpi", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useReducedMotionMock.mockReturnValue(true);
		mockResult();
	});

	it("renders the label and the SQL rate verbatim (no re-scaling)", () => {
		mockResult({ data: { scheduled: 2000, collected: 1900, rate: 95 } });
		render(<CollectionRateKpi />);

		expect(screen.getByText("Collection rate")).toBeInTheDocument();
		// `rate` is already a 0-100 percentage; 95 must render as 95%, not 9500%.
		expect(screen.getByText("95%")).toBeInTheDocument();
		expect(screen.queryByText("9500%")).not.toBeInTheDocument();
		expect(
			screen.getByText("Collected ÷ scheduled, this month"),
		).toBeInTheDocument();
	});

	it("keeps a fractional rate at one decimal", () => {
		mockResult({ data: { scheduled: 2000, collected: 1690, rate: 84.5 } });
		render(<CollectionRateKpi />);

		expect(screen.getByText("84.5%")).toBeInTheDocument();
	});

	it("shows an honest 0% with the start-tracking helper when nothing is scheduled", () => {
		mockResult({ data: { scheduled: 0, collected: 0, rate: 0 } });
		render(<CollectionRateKpi />);

		expect(screen.getByText("0%")).toBeInTheDocument();
		expect(
			screen.getByText("Start tracking rent to see your collection rate"),
		).toBeInTheDocument();
		// The tile is present, not hidden: an honest zero beats a missing KPI.
		expect(screen.getByTestId("collection-rate-kpi")).toBeInTheDocument();
	});

	it("stays neutral (no Poor grade) in the no-data state", () => {
		mockResult({ data: { scheduled: 0, collected: 0, rate: 0 } });
		render(<CollectionRateKpi />);

		const tile = screen.getByTestId("collection-rate-kpi");
		expect(tile.getAttribute("aria-label")).toContain("No rent tracked yet");
		expect(tile.querySelector(".text-destructive")).toBeNull();
	});

	it.each([
		["Excellent", 98],
		["Good", 90],
		["Fair", 75],
		["Poor", 40],
	])(
		"renders a lucide svg for the %s band, never the helper's label strings",
		(_band, rate) => {
			mockResult({ data: { scheduled: 1000, collected: 500, rate } });
			const view = render(<CollectionRateKpi />);

			const indicator = view.container.querySelector(
				"[data-slot=stat-indicator]",
			);
			expect(indicator?.querySelector("svg")).not.toBeNull();
			for (const placeholder of ["TARGET:", "[OK]", "WARNING:", "[DOWN]"]) {
				expect(view.container.textContent).not.toContain(placeholder);
			}
		},
	);

	it("conveys the status word in the aria-label, not by colour alone", () => {
		mockResult({ data: { scheduled: 1000, collected: 990, rate: 99 } });
		render(<CollectionRateKpi />);

		expect(
			screen.getByTestId("collection-rate-kpi").getAttribute("aria-label"),
		).toContain("Excellent");
	});

	it("renders a skeleton while pending and no number", () => {
		mockResult({ data: undefined, isPending: true });
		render(<CollectionRateKpi />);

		expect(
			screen.getByTestId("collection-rate-kpi-loading"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("collection-rate-kpi")).not.toBeInTheDocument();
	});

	it("renders an honest unavailable state on error rather than a fabricated rate", () => {
		mockResult({ data: undefined, isError: true });
		render(<CollectionRateKpi />);

		expect(screen.getByText("Unavailable")).toBeInTheDocument();
		expect(screen.queryByText("0%")).not.toBeInTheDocument();
	});

	it("animates the value when reduced motion is off", () => {
		useReducedMotionMock.mockReturnValue(false);
		mockResult({ data: { scheduled: 1000, collected: 800, rate: 80 } });
		render(<CollectionRateKpi />);

		// NumberTicker owns the digits; the tile still renders the percent sign.
		expect(screen.getByTestId("collection-rate-kpi").textContent).toContain(
			"%",
		);
	});
});
