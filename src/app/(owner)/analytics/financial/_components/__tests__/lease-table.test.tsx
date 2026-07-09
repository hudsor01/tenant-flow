import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "#test/utils/test-render";
import type { LeaseFinancialInsight } from "#types/analytics";
import { LeaseTable } from "../lease-table";

// The global unit-setup mocks nuqs (reads -> null, writes swallowed). LeaseTable
// now drives a REAL client-side TanStack table through `useClientDataTable`, whose
// filter/sort/page state IS the nuqs round-trip, so restore the real nuqs
// implementation (Wave-1 precedent) and host it under nuqs's own testing adapter.
vi.unmock("nuqs");

function Wrapper({ children }: { children: ReactNode }) {
	return <NuqsTestingAdapter hasMemory>{children}</NuqsTestingAdapter>;
}

// Distinguishable rows so a single tenantName filter narrows to exactly one and
// page-2 tenants are identifiable. pageSize is 6, so 9 rows -> 2 pages.
function makeLeases(count: number): LeaseFinancialInsight[] {
	return Array.from({ length: count }, (_, index) => ({
		lease_id: `L${index}`,
		propertyName: `Property ${index}`,
		tenantName: `Tenant ${index}`,
		rent_amount: 1000 + index * 100,
		outstandingBalance: index * 50,
		profitabilityScore: index,
	}));
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

describe("LeaseTable (useClientDataTable migration)", () => {
	it("paginates to pageSize (6) on page 1 instead of rendering all rows, and nextPage advances the window", async () => {
		await act(async () => {
			render(<LeaseTable leases={makeLeases(9)} />, { wrapper: Wrapper });
		});

		// Only pageSize (6) data rows land on page 1 — NOT all 9. This is the
		// visible change the migration delivers (was: every row on one page).
		expect(visibleDataRowCount()).toBe(6);
		expect(screen.getByText("Tenant 0")).toBeInTheDocument();
		expect(screen.getByText("Tenant 5")).toBeInTheDocument();
		// A page-2 tenant is NOT present on page 1.
		expect(screen.queryByText("Tenant 6")).toBeNull();

		// getPageCount() is TanStack-computed = ceil(9 / 6) = 2, so the footer reads
		// a real page count — not the old frozen "Page 1 of -1".
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
			render(<LeaseTable leases={makeLeases(9)} />, { wrapper: Wrapper });
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
});
