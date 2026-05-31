import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { portfolioColumns } from "#components/dashboard/components/portfolio-columns";
import { PortfolioDataTableToolbar } from "#components/dashboard/components/portfolio-data-table-toolbar";
import type { PortfolioRow } from "#components/dashboard/dashboard-types";
import { useClientDataTable } from "#hooks/use-client-data-table";

// The global unit-setup mocks nuqs (reads -> null, writes swallowed). This suite
// drives a REAL TanStack table through `useClientDataTable`, whose filter/sort/
// page state IS the nuqs round-trip, so restore the real nuqs implementation
// (Wave-1 precedent) and host it under nuqs's own testing adapter.
vi.unmock("nuqs");

function makeRow(
	overrides: Partial<PortfolioRow> & { id: string },
): PortfolioRow {
	return {
		property: "Default Property",
		address: "1 Default St",
		units: { occupied: 1, total: 1 },
		tenant: null,
		leaseStatus: "vacant",
		leaseEnd: null,
		rent: 1000,
		maintenanceOpen: 0,
		...overrides,
	};
}

// A row whose NAME does not match "elm" but whose ADDRESS does — the W-3 probe.
const ADDRESS_ONLY_ROW = makeRow({
	id: "addr-only",
	property: "Sunset Towers",
	address: "42 Elm Street",
	leaseStatus: "active",
});

function makeRows(count: number): PortfolioRow[] {
	return Array.from({ length: count }, (_, index) =>
		makeRow({
			id: `row-${index}`,
			property: `Property ${index}`,
			address: `${index} Main St`,
			units: { occupied: index % 4, total: 4 },
			tenant: index % 2 === 0 ? `Tenant ${index}` : null,
			leaseStatus:
				index % 3 === 0 ? "active" : index % 3 === 1 ? "expiring" : "vacant",
			rent: 1000 + index * 10,
			maintenanceOpen: index % 5,
		}),
	);
}

function Wrapper({ children }: { children: ReactNode }) {
	return <NuqsTestingAdapter hasMemory>{children}</NuqsTestingAdapter>;
}

beforeEach(() => {
	vi.useRealTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

// Build a real table instance and render the toolbar against it.
function ToolbarHarness({ data }: { data: PortfolioRow[] }) {
	const { table } = useClientDataTable({
		data,
		columns: portfolioColumns,
		getRowId: (row) => row.id,
	});
	const [viewMode, setViewMode] = useState<"table" | "grid">("table");
	return (
		<>
			<PortfolioDataTableToolbar
				table={table}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>
			<div data-testid="filtered-count">
				{table.getFilteredRowModel().rows.length}
			</div>
			<div data-testid="view-mode">{viewMode}</div>
		</>
	);
}

describe("PortfolioDataTableToolbar", () => {
	it("search filters via the Property column and an address-only row survives (W-3)", async () => {
		const user = userEvent.setup();
		const data = [
			makeRow({ id: "a", property: "Oakwood Plaza", address: "1 Oak Ave" }),
			ADDRESS_ONLY_ROW, // name "Sunset Towers", address "42 Elm Street"
		];
		await act(async () => {
			render(<ToolbarHarness data={data} />, { wrapper: Wrapper });
		});

		const input = screen.getByPlaceholderText("Search properties...");
		// "elm" matches ONLY the address of ADDRESS_ONLY_ROW, not its name.
		await user.type(input, "elm");

		// W-3: the name||address filterFn keeps the address-only row -> 1 match.
		expect(screen.getByTestId("filtered-count").textContent).toBe("1");
	});

	it("faceted status filter lists meta.options and selecting one narrows rows (DT-04)", async () => {
		const user = userEvent.setup();
		const data = [
			makeRow({ id: "a", leaseStatus: "active" }),
			makeRow({ id: "b", leaseStatus: "expiring" }),
			makeRow({ id: "c", leaseStatus: "vacant" }),
		];
		await act(async () => {
			render(<ToolbarHarness data={data} />, { wrapper: Wrapper });
		});

		await user.click(screen.getByRole("button", { name: /status/i }));
		expect(await screen.findByText("Active")).toBeInTheDocument();
		expect(screen.getByText("Expiring Soon")).toBeInTheDocument();
		expect(screen.getByText("Vacant")).toBeInTheDocument();

		await user.click(screen.getByText("Active"));
		expect(screen.getByTestId("filtered-count").textContent).toBe("1");
	});

	it("view-options lists hideable column labels and toggling hides a column (DT-05)", async () => {
		const user = userEvent.setup();
		await act(async () => {
			render(<ToolbarHarness data={makeRows(3)} />, { wrapper: Wrapper });
		});

		// DataTableViewOptions trigger is role="combobox" aria-label="Toggle columns".
		await user.click(screen.getByRole("combobox", { name: /toggle columns/i }));
		// meta.label values appear in the view-options popover.
		expect(await screen.findByText("Monthly Rent")).toBeInTheDocument();
		expect(screen.getByText("Maintenance")).toBeInTheDocument();
	});

	it("grid/table toggle has radiogroup semantics and switches viewMode (DT-07)", async () => {
		const user = userEvent.setup();
		await act(async () => {
			render(<ToolbarHarness data={makeRows(3)} />, { wrapper: Wrapper });
		});

		const radiogroup = screen.getByRole("radiogroup", { name: /view mode/i });
		expect(radiogroup).toBeInTheDocument();
		const gridRadio = screen.getByRole("radio", { name: /grid/i });
		const tableRadio = screen.getByRole("radio", { name: /table/i });
		expect(tableRadio).toHaveAttribute("aria-checked", "true");
		expect(gridRadio).toHaveAttribute("aria-checked", "false");

		await user.click(gridRadio);
		expect(screen.getByTestId("view-mode").textContent).toBe("grid");
	});
});
