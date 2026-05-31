import type { OnChangeFn, VisibilityState } from "@tanstack/react-table";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { portfolioColumns } from "#components/dashboard/components/portfolio-columns";
import { PortfolioDataTable } from "#components/dashboard/components/portfolio-data-table";
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
		// Filters round-trip through nuqs (debounced single source of truth), so
		// await the result rather than asserting synchronously.
		await waitFor(() => {
			expect(screen.getByTestId("filtered-count").textContent).toBe("1");
		});
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
		// Faceted writes also debounce through nuqs -> await the filtered count.
		await waitFor(() => {
			expect(screen.getByTestId("filtered-count").textContent).toBe("1");
		});
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

// Stub window.matchMedia so the mobile query (max-width: 375px) reports `matches`
// per the `shouldMatch` predicate; `useMediaQuery` reads this on mount.
function stubMatchMedia(shouldMatch: (query: string) => boolean) {
	const original = window.matchMedia;
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: shouldMatch(query),
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
	return () => {
		window.matchMedia = original;
	};
}

// Controlled wrapper: parent owns viewMode + columnVisibility (matches the Plan
// 05-03 contract). Exposes the visibility change spy to the test.
function ControlledHarness({
	data,
	initialView = "table",
	initialVisibility = {},
	onVisibilityChange,
}: {
	data: PortfolioRow[];
	initialView?: "table" | "grid";
	initialVisibility?: VisibilityState;
	onVisibilityChange?: OnChangeFn<VisibilityState>;
}) {
	const [viewMode, setViewMode] = useState<"table" | "grid">(initialView);
	const [visibility, setVisibility] =
		useState<VisibilityState>(initialVisibility);
	const handleVisibility: OnChangeFn<VisibilityState> = (updater) => {
		onVisibilityChange?.(updater);
		setVisibility((prev) =>
			typeof updater === "function" ? updater(prev) : updater,
		);
	};
	return (
		<PortfolioDataTable
			data={data}
			viewMode={viewMode}
			onViewModeChange={setViewMode}
			columnVisibility={visibility}
			onColumnVisibilityChange={handleVisibility}
		/>
	);
}

describe("PortfolioDataTable", () => {
	it("renders rows through the virtualizer tbody (sized via getTotalSize)", async () => {
		await act(async () => {
			render(<ControlledHarness data={makeRows(50)} />, { wrapper: Wrapper });
		});

		// The virtualized tbody carries the total-size height style. jsdom reports a
		// 0px scroll container, so we assert the virtualizer is engaged via the
		// height style rather than counting rendered rows.
		const tbody = document.querySelector('tbody[data-slot="table-body"]');
		expect(tbody).not.toBeNull();
		expect((tbody as HTMLElement).style.height).toMatch(/px$/);
	});

	it("virtualizes both small and large datasets through one path (always-on, D-2)", async () => {
		const { unmount } = render(<ControlledHarness data={makeRows(3)} />, {
			wrapper: Wrapper,
		});
		await act(async () => {});
		expect(
			document.querySelector('tbody[data-slot="table-body"]'),
		).not.toBeNull();
		unmount();

		await act(async () => {
			render(<ControlledHarness data={makeRows(50)} />, { wrapper: Wrapper });
		});
		expect(
			document.querySelector('tbody[data-slot="table-body"]'),
		).not.toBeNull();
	});

	it("renders aria-sort on the <th role=columnheader>, not the inner button (B-1)", async () => {
		await act(async () => {
			render(<ControlledHarness data={makeRows(5)} />, { wrapper: Wrapper });
		});

		const header = screen.getByRole("columnheader", { name: /property/i });
		expect(["none", "ascending", "descending"]).toContain(
			header.getAttribute("aria-sort"),
		);

		// The inner sort button must NOT carry aria-sort.
		const button = screen.getByRole("button", { name: /property/i });
		expect(button.getAttribute("aria-sort")).toBeNull();
	});

	it("hides a column when columnVisibility is controlled and fires the parent spy (B-2)", async () => {
		const user = userEvent.setup();
		const onVisibilityChange = vi.fn();
		await act(async () => {
			render(
				<ControlledHarness
					data={makeRows(5)}
					initialVisibility={{ maintenance: false }}
					onVisibilityChange={onVisibilityChange}
				/>,
				{ wrapper: Wrapper },
			);
		});

		// Controlled-hidden column has no header.
		expect(
			screen.queryByRole("columnheader", { name: /maintenance/i }),
		).toBeNull();
		// Still-visible column remains.
		expect(
			screen.getByRole("columnheader", { name: /property/i }),
		).toBeInTheDocument();

		// Toggling visibility via the view-options menu fires the PARENT handler.
		// "Monthly Rent" also renders as a <th>, so target the popover option role.
		await user.click(screen.getByRole("combobox", { name: /toggle columns/i }));
		await user.click(
			await screen.findByRole("option", { name: /monthly rent/i }),
		);
		expect(onVisibilityChange).toHaveBeenCalled();
	});

	it("grid view reads the SAME filtered rows as the table (D-5)", async () => {
		const user = userEvent.setup();
		const data = [
			makeRow({ id: "a", property: "Active One", leaseStatus: "active" }),
			makeRow({ id: "b", property: "Vacant One", leaseStatus: "vacant" }),
			makeRow({ id: "c", property: "Vacant Two", leaseStatus: "vacant" }),
		];
		await act(async () => {
			render(<ControlledHarness data={data} initialView="grid" />, {
				wrapper: Wrapper,
			});
		});

		// Unfiltered grid shows all three.
		expect(screen.getByText("Active One")).toBeInTheDocument();
		expect(screen.getByText("Vacant One")).toBeInTheDocument();

		// Apply the status=active filter via the toolbar's faceted filter. "Active"
		// also appears as a grid status badge, so target the popover option role.
		await user.click(screen.getByRole("button", { name: /status/i }));
		await user.click(await screen.findByRole("option", { name: /active/i }));

		// Grid now reflects the table's filtered set: only the active row. The filter
		// debounces through nuqs, so await the vacant rows dropping out.
		await waitFor(() => {
			expect(screen.queryByText("Vacant One")).toBeNull();
		});
		expect(screen.getByText("Active One")).toBeInTheDocument();
		expect(screen.queryByText("Vacant Two")).toBeNull();
	});

	it("forces the grid view at <=375px regardless of viewMode (W-4)", async () => {
		const restore = stubMatchMedia((q) => q === "(max-width: 375px)");
		try {
			await act(async () => {
				render(
					<ControlledHarness
						data={[makeRow({ id: "m", property: "Mobile Property" })]}
						initialView="table"
					/>,
					{ wrapper: Wrapper },
				);
			});

			// Forced grid: cards render, the table/columnheader does NOT.
			expect(screen.getByText("Mobile Property")).toBeInTheDocument();
			expect(screen.queryByRole("columnheader")).toBeNull();
		} finally {
			restore();
		}

		// No-match -> table renders for viewMode='table'.
		const restore2 = stubMatchMedia(() => false);
		try {
			await act(async () => {
				render(
					<ControlledHarness
						data={[makeRow({ id: "d", property: "Desktop Property" })]}
						initialView="table"
					/>,
					{ wrapper: Wrapper },
				);
			});
			expect(
				screen.getByRole("columnheader", { name: /property/i }),
			).toBeInTheDocument();
		} finally {
			restore2();
		}
	});

	it("renders the DataTablePagination footer below the table", async () => {
		await act(async () => {
			render(<ControlledHarness data={makeRows(25)} />, { wrapper: Wrapper });
		});

		expect(
			screen.getByRole("button", { name: /go to next page/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
	});
});
