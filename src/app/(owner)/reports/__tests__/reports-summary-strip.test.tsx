/**
 * Pin the `/reports` hub summary strip contract (RPTHUB-01, D-30/D-18).
 *
 * - Exactly three tiles labelled Scheduled, Collected, Outstanding
 * - All three figures come from ONE `get_collection_rate` payload; Outstanding
 *   is `scheduled - collected` from that same object, never
 *   `get_financial_overview.accounts_receivable` (D-18/D-30 single source)
 * - Scheduled and Collected are never summed — subtraction only
 * - MONEY (Phase 55 D-00): dollars straight through `formatCurrency`, so a
 *   scheduled of 95 renders `$95.00` and never the 100x `$9,500.00`
 * - An owner with no ledger data sees an honest `$0.00` on all three tiles,
 *   never a hidden tile and never a fabricated figure
 * - Loading renders three skeletons at the strip's own height, not a spinner
 * - Error renders inline muted copy and still returns a container — a strip
 *   failure must never be able to remove the statement grid beside it
 * - The rendered output carries no bare `Revenue` label (D-18 vocabulary)
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useCollectionRateMock = vi.hoisted(() => vi.fn());

vi.mock("#hooks/api/use-owner-dashboard-financial", () => ({
	useCollectionRate: useCollectionRateMock,
}));

import { ReportsSummaryStrip } from "#app/(owner)/reports/reports-summary-strip";

function mockResult(
	overrides: Partial<{
		data: { scheduled: number; collected: number; rate: number } | undefined;
		isPending: boolean;
		isError: boolean;
	}> = {},
) {
	useCollectionRateMock.mockReturnValue({
		data: { scheduled: 2000, collected: 1750, rate: 87.5 },
		isPending: false,
		isError: false,
		...overrides,
	});
}

describe("ReportsSummaryStrip", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResult();
	});

	it("renders exactly the three locked labels", () => {
		render(<ReportsSummaryStrip />);

		expect(screen.getByText("Scheduled")).toBeInTheDocument();
		expect(screen.getByText("Collected")).toBeInTheDocument();
		expect(screen.getByText("Outstanding")).toBeInTheDocument();
	});

	it("derives Outstanding as scheduled minus collected from the same payload", () => {
		mockResult({ data: { scheduled: 2000, collected: 1750, rate: 87.5 } });
		render(<ReportsSummaryStrip />);

		expect(screen.getByText("$2,000.00")).toBeInTheDocument();
		expect(screen.getByText("$1,750.00")).toBeInTheDocument();
		// 2000 - 1750, never 2000 + 1750 (D-18 forbids summing the two).
		expect(screen.getByText("$250.00")).toBeInTheDocument();
		expect(screen.queryByText("$3,750.00")).not.toBeInTheDocument();
	});

	it("discloses the period, because every figure is current-month only", () => {
		// useCollectionRate() omits p_month, so get_collection_rate defaults to
		// date_trunc('month', current_date). The strip sits above the Statements
		// group ("for a period you choose") and annual tiles, so an unqualified
		// dollar figure here reads as year- or portfolio-scope.
		mockResult({ data: { scheduled: 2000, collected: 1750, rate: 87.5 } });
		render(<ReportsSummaryStrip />);

		// Exact match, not /this month/i — the regex also matches the three
		// sr-only figure labels below, which is a multiple-match error.
		expect(screen.getByText("this month")).toBeInTheDocument();

		// Screen readers must get the scope on the figure itself — the visible
		// caption is not adjacent enough in the accessibility tree.
		//
		// Asserted via getByText, not getByLabelText. getByLabelText matches the
		// raw attribute rather than computing an accessible name, so it passed
		// against an `aria-label` on a `<p>` — an attribute the implicit
		// `paragraph` role PROHIBITS, which AT discards.
		expect(
			screen.getByText("Scheduled this month: $2,000.00"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Outstanding this month: $250.00"),
		).toBeInTheDocument();

		// The prohibited shape must not come back.
		expect(
			document.querySelector("p[aria-label], p[aria-labelledby]"),
		).toBeNull();
	});

	it("clamps Outstanding at zero when collected exceeds scheduled", () => {
		// `scheduled` and `collected` are not drawn over the same obligations:
		// get_collection_rate sums scheduled from leases overlapping the month but
		// sums collected by rent_receipts.received_date, and a receipt's charge_id
		// may point at a prior month. Tenant skips January, pays both months on
		// Feb 5 -> February collects 4000 against 2000 scheduled.
		mockResult({ data: { scheduled: 2000, collected: 4000, rate: 200 } });
		render(<ReportsSummaryStrip />);

		// Never "-$2,000.00" — a negative Outstanding claims the owner owes the
		// tenant, which is not what this figure can ever mean.
		expect(screen.getByText("$0.00")).toBeInTheDocument();
		expect(screen.queryByText("-$2,000.00")).not.toBeInTheDocument();
		expect(screen.queryByText("−$2,000.00")).not.toBeInTheDocument();
	});

	it("passes dollars straight through with no 100x scaling", () => {
		mockResult({ data: { scheduled: 95, collected: 95, rate: 100 } });
		render(<ReportsSummaryStrip />);

		expect(screen.getAllByText("$95.00").length).toBeGreaterThan(0);
		expect(screen.queryByText("$9,500.00")).not.toBeInTheDocument();
	});

	it("shows an honest $0.00 on all three tiles with no ledger data", () => {
		mockResult({ data: { scheduled: 0, collected: 0, rate: 0 } });
		render(<ReportsSummaryStrip />);

		expect(screen.getAllByText("$0.00")).toHaveLength(3);
		// No tile is hidden when the figures are zero.
		expect(screen.getByText("Scheduled")).toBeInTheDocument();
		expect(screen.getByText("Collected")).toBeInTheDocument();
		expect(screen.getByText("Outstanding")).toBeInTheDocument();
	});

	it("renders three skeletons while pending and no figures", () => {
		mockResult({ data: undefined, isPending: true });
		const view = render(<ReportsSummaryStrip />);

		expect(
			view.container.querySelectorAll("[data-slot=skeleton]"),
		).toHaveLength(3);
		expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
	});

	it("renders inline fallback copy on error and still returns a container", () => {
		mockResult({ data: undefined, isError: true });
		render(<ReportsSummaryStrip />);

		expect(
			screen.getByText("Couldn't load this period's collection figures."),
		).toBeInTheDocument();
		expect(screen.getByTestId("reports-summary-strip")).toBeInTheDocument();
	});

	it("never renders a bare Revenue label", () => {
		const view = render(<ReportsSummaryStrip />);

		expect(view.container.textContent).not.toContain("Revenue");
	});
});
