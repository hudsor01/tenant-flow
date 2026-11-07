import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { render } from "#test/utils/test-render";
import type { LeaseProfitability } from "#types/analytics";
import { LeaseProfitabilityTable } from "../lease-profitability-table";

// The global unit-setup mocks nuqs (reads -> null, writes swallowed). The table
// drives a REAL client-side TanStack table through `useClientDataTable`, whose
// filter/sort/page state IS the nuqs round-trip, so restore the real nuqs
// implementation (Wave-1 precedent) and host it under nuqs's own testing adapter.
vi.unmock("nuqs");

function Wrapper({ children }: { children: ReactNode }) {
	return <NuqsTestingAdapter hasMemory>{children}</NuqsTestingAdapter>;
}

// Distinguishable rows so a single tenantName filter narrows to exactly one and
// page-2 tenants are identifiable. pageSize is 6, so 9 rows -> 2 pages.
const WINDOW = { start_date: "2026-01-01", end_date: "2026-11-02" };

function makeLeases(count: number): LeaseProfitability {
	return {
		status: "ready",
		window: WINDOW,
		leases: Array.from({ length: count }, (_, index) => ({
			propertyName: `Property ${index}`,
			unitNumber: `U${index}`,
			tenantName: `Tenant ${index}`,
			rentReceived: 1000 + index * 100,
			expenses: index * 50,
			net: 1000 + index * 50,
		})),
	};
}

// `getAllByRole("row")` includes the single (flat) header row; subtract it to get
// the number of DATA rows currently rendered on the page.
function visibleDataRowCount(): number {
	return screen.getAllByRole("row").length - 1;
}

// Drain the hook's 300ms filter debounce + nuqs throttle so the deferred URL write
// lands (and does not fire against an unmounted tree after the test).
async function flushUrlWrites(ms = 400): Promise<void> {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
}

beforeEach(() => {
	vi.useRealTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("LeaseProfitabilityTable", () => {
	it("paginates to pageSize (6) on page 1 instead of rendering all rows, and nextPage advances the window", async () => {
		await act(async () => {
			render(
				<LeaseProfitabilityTable profitability={makeLeases(9)} pageSize={6} />,
				{ wrapper: Wrapper },
			);
		});

		// Only pageSize (6) data rows land on page 1, not all 9.
		expect(visibleDataRowCount()).toBe(6);
		expect(screen.getByText("Tenant 0")).toBeInTheDocument();
		expect(screen.getByText("Tenant 5")).toBeInTheDocument();
		// A page-2 tenant is NOT present on page 1.
		expect(screen.queryByText("Tenant 6")).toBeNull();

		// getPageCount() is TanStack-computed: ceil(9 / 6) = 2, so the footer
		// reads "Page 1 of 2".
		expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();

		// nextPage() advances the visible window to page 2 (the remaining 3 rows).
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /go to next page/i }));

		await waitFor(() => {
			expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
		});
		expect(screen.getByText("Tenant 6")).toBeInTheDocument();
		expect(screen.getByText("Tenant 8")).toBeInTheDocument();
		expect(screen.queryByText("Tenant 0")).toBeNull();
		expect(visibleDataRowCount()).toBe(3);
	});

	it("narrows the visible rows when the tenantName column filter is set", async () => {
		await act(async () => {
			render(
				<LeaseProfitabilityTable profitability={makeLeases(9)} pageSize={6} />,
				{ wrapper: Wrapper },
			);
		});

		// Baseline: full first page.
		expect(visibleDataRowCount()).toBe(6);

		// Drive the tenantName column's toolbar filter input (variant "text").
		const tenantFilter = screen.getByPlaceholderText("Search tenant...");
		fireEvent.change(tenantFilter, { target: { value: "Tenant 3" } });

		// The synchronous columnFilters mirror updates the filtered row model on the
		// same render, so the table narrows to the single matching tenant.
		expect(visibleDataRowCount()).toBe(1);
		expect(screen.getByText("Tenant 3")).toBeInTheDocument();
		expect(screen.queryByText("Tenant 0")).toBeNull();
		expect(screen.queryByText("Tenant 5")).toBeNull();

		// Drain the debounced nuqs write so it does not fire post-teardown.
		await flushUrlWrites();
	});

	it("shows each lease's rent received less its expenses over the stated period", async () => {
		await act(async () => {
			render(
				<LeaseProfitabilityTable
					profitability={{
						status: "ready",
						window: WINDOW,
						leases: [
							{
								propertyName: "South House (deleted)",
								unitNumber: "S1",
								tenantName: "Ed South",
								rentReceived: 5000,
								expenses: 0,
								net: 5000,
							},
							{
								propertyName: "North Court",
								unitNumber: "N1",
								tenantName: "Ann North",
								rentReceived: 2000,
								expenses: 360.5,
								net: 1639.5,
							},
						],
					}}
					pageSize={6}
				/>,
				{ wrapper: Wrapper },
			);
		});
		expect(
			screen.getByText("Rent received less expenses, Jan 1 to Nov 2, 2026"),
		).toBeInTheDocument();
		const rows = screen.getAllByRole("row").slice(1);
		expect(rows.map((row) => row.textContent)).toEqual([
			"South House (deleted) \u00b7 S1Ed South$5,000.00$0.00$5,000.00",
			"North Court \u00b7 N1Ann North$2,000.00$360.50$1,639.50",
		]);
		for (const header of [
			"Lease",
			"Tenant",
			"Rent Received",
			"Expenses",
			"Net",
		]) {
			expect(
				screen.getByRole("columnheader", { name: header }),
			).toBeInTheDocument();
		}
		expect(screen.queryByText(/profitability score/i)).toBeNull();
		expect(screen.queryByText(/outstanding/i)).toBeNull();
	});

	it("says the table is unavailable when the server reports no lease profitability", () => {
		render(
			<LeaseProfitabilityTable
				profitability={{ status: "unavailable" }}
				pageSize={6}
			/>,
			{ wrapper: Wrapper },
		);
		expect(
			screen.getByText("Lease profitability unavailable"),
		).toBeInTheDocument();
		expect(screen.queryByRole("table")).toBeNull();
	});

	it("says no lease had rent or expenses in the period, with the period", () => {
		render(
			<LeaseProfitabilityTable
				profitability={{ status: "ready", window: WINDOW, leases: [] }}
				pageSize={6}
			/>,
			{ wrapper: Wrapper },
		);
		expect(
			screen.getByText(
				"No rent received or expenses on a lease from Jan 1 to Nov 2, 2026.",
			),
		).toBeInTheDocument();
	});

	// Each paragraph is a flex item, so the base `p` margin was added to its
	// gap: 20px between the unavailable title and its line (gap-1 declares
	// 4), 24px from the caption to the table (gap-2 declares 8), and each
	// state held 8px above centre (cycle 2, F38).
	it.each<[string, LeaseProfitability, ReadonlyArray<string | RegExp>]>([
		[
			"unavailable",
			{ status: "unavailable" },
			["Lease profitability unavailable", /^It comes from your rent ledger/],
		],
		[
			"empty",
			{ status: "ready", window: WINDOW, leases: [] },
			[/^No rent received or expenses on a lease from/],
		],
		["ready", makeLeases(1), [/^Rent received less expenses, /]],
	])(
		"leaves no base paragraph margin in its %s state",
		(_state, profitability, texts) => {
			render(
				<LeaseProfitabilityTable profitability={profitability} pageSize={6} />,
				{ wrapper: Wrapper },
			);
			for (const text of texts) {
				const { neutralized, baseline } = computeParagraphCascade(
					screen.getByText(text),
				);
				expect(baseline.marginBottom).toBe("16px");
				expect(neutralized.marginBottom).toBe("0px");
			}
		},
	);
});
