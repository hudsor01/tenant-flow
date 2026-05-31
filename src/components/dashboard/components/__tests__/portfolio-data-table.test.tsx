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

// When `virtualMock.override` is non-null, the virtualizer yields those items
// instead of measuring the (0px in jsdom) scroll container — letting one test
// exercise the real <TableRow>/<TableCell> render path. `vi.hoisted` so the ref
// exists before `vi.mock` runs.
const virtualMock = vi.hoisted(() => ({
	override: null as { index: number; start: number; size: number }[] | null,
}));

vi.mock("@tanstack/react-virtual", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-virtual")>();
	return {
		...actual,
		useVirtualizer: (options: Parameters<typeof actual.useVirtualizer>[0]) => {
			const instance = actual.useVirtualizer(options);
			if (!virtualMock.override) return instance;
			return {
				...instance,
				getVirtualItems: () =>
					virtualMock.override?.map((item) => ({
						...item,
						key: item.index,
						end: item.start + item.size,
						lane: 0,
					})) ?? [],
				getTotalSize: () =>
					virtualMock.override?.reduce((sum, item) => sum + item.size, 0) ?? 0,
			} as ReturnType<typeof actual.useVirtualizer>;
		},
	};
});

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

	it("search input reflects every keystroke synchronously (no debounce freeze/snap-back)", async () => {
		const user = userEvent.setup();
		await act(async () => {
			render(<ToolbarHarness data={makeRows(3)} />, { wrapper: Wrapper });
		});

		const input = screen.getByPlaceholderText(
			"Search properties...",
		) as HTMLInputElement;

		// The controlled input reads the SYNCHRONOUS columnFilters mirror; only
		// the URL write is debounced. So the value must reflect every keystroke
		// immediately -- asserted with NO waitFor. Under the prior
		// derive-purely-from-debounced-nuqs code the box snapped back to "" on
		// each keystroke (the cycle-2 freeze regression).
		await user.type(input, "oak plaza");
		expect(input.value).toBe("oak plaza");
	});

	it("normalizes an array property filter value to a joined string (no unsound cast)", async () => {
		// Hydrate the property search column with an array value (the shape the old
		// `as string` cast assumed away). The input must show a joined string, not
		// "[object Object]"/comma garbage.
		await act(async () => {
			render(<ToolbarHarness data={makeRows(3)} />, {
				wrapper: ({ children }: { children: ReactNode }) => (
					<NuqsTestingAdapter
						hasMemory
						searchParams={{ property: "elm street" }}
					>
						{children}
					</NuqsTestingAdapter>
				),
			});
		});

		const input = screen.getByPlaceholderText(
			"Search properties...",
		) as HTMLInputElement;
		// A multi-word hydrated value stays one string end-to-end.
		expect(input.value).toBe("elm street");
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

	it("aligns virtualized body cells to header columns via explicit getSize() widths (canonical grid/flex)", async () => {
		// jsdom reports a 0px scroll container, so the real virtualizer renders 0
		// rows and a row assertion would pass vacuously. Force a deterministic
		// virtual range so the actual <TableRow>/<TableCell> render path executes.
		virtualMock.override = [
			{ index: 0, start: 0, size: 56 },
			{ index: 1, start: 56, size: 56 },
		];
		try {
			const data = [
				makeRow({ id: "r1", property: "Cedar Court", address: "1 Cedar Way" }),
				makeRow({ id: "r2", property: "Pine Plaza", address: "2 Pine Rd" }),
			];
			await act(async () => {
				render(<ControlledHarness data={data} />, { wrapper: Wrapper });
			});

			const tbody = document.querySelector('tbody[data-slot="table-body"]');
			expect(tbody).not.toBeNull();
			const bodyRows = tbody?.querySelectorAll('tr[role="row"]');
			// Both forced virtual rows render as real <tr role="row">.
			expect(bodyRows?.length).toBe(2);

			const firstRow = bodyRows?.[0] as HTMLElement;
			// The sanctioned per-row virtualization transform is applied.
			expect(firstRow.style.transform).toBe("translateY(0px)");
			// measureElement is wired via data-index (dynamic two-line-row sizing).
			expect(firstRow.getAttribute("data-index")).toBe("0");

			// Body cells carry role="cell" and an EXPLICIT pixel width matching the
			// ColumnDef size — the canonical alignment source of truth.
			const cells = firstRow.querySelectorAll('td[role="cell"]');
			expect(cells.length).toBe(portfolioColumns.length);
			const bodyWidths = Array.from(cells).map(
				(cell) => (cell as HTMLElement).style.width,
			);
			expect(bodyWidths).toEqual([
				"240px",
				"90px",
				"140px",
				"120px",
				"120px",
				"110px",
				"80px",
			]);

			// Header column count equals body column count, and each header <th
			// role="columnheader"> carries the SAME explicit width as its body cell.
			const headers = document.querySelectorAll('th[role="columnheader"]');
			expect(headers.length).toBe(cells.length);
			const headerWidths = Array.from(headers).map(
				(header) => (header as HTMLElement).style.width,
			);
			expect(headerWidths).toEqual(bodyWidths);

			// aria-sort still lands on the columnheader (B-1), not the inner button.
			const propertyHeader = screen.getByRole("columnheader", {
				name: /property/i,
			});
			expect(["none", "ascending", "descending"]).toContain(
				propertyHeader.getAttribute("aria-sort"),
			);

			// Row content actually renders (rows are not empty/zero-height).
			expect(screen.getByText("Cedar Court")).toBeInTheDocument();
			expect(screen.getByText("Pine Plaza")).toBeInTheDocument();
		} finally {
			virtualMock.override = null;
		}
	});

	it("gives the virtualized <table> an accessible name via aria-label", async () => {
		// a11y: a grid/flex <table> has no implicit caption, so screen readers
		// announce it anonymously. An explicit aria-label names the region.
		await act(async () => {
			render(<ControlledHarness data={makeRows(5)} />, { wrapper: Wrapper });
		});

		const table = screen.getByRole("table");
		expect(table.getAttribute("aria-label")).toBe("Property portfolio");
		// getByRole with the accessible name resolves to the same element.
		expect(screen.getByRole("table", { name: /property portfolio/i })).toBe(
			table,
		);
	});

	it("exposes virtualized-grid ARIA: aria-rowcount on the table and aria-rowindex on header + body rows", async () => {
		// jsdom reports a 0px scroll container, so the real virtualizer renders 0
		// rows. Force a deterministic virtual range so a real body <TableRow>
		// renders and its aria-rowindex can be asserted.
		virtualMock.override = [
			{ index: 0, start: 0, size: 56 },
			{ index: 1, start: 56, size: 56 },
		];
		try {
			const data = [
				makeRow({ id: "r1", property: "Cedar Court" }),
				makeRow({ id: "r2", property: "Pine Plaza" }),
				makeRow({ id: "r3", property: "Oak Ridge" }),
			];
			await act(async () => {
				render(<ControlledHarness data={data} />, { wrapper: Wrapper });
			});

			// aria-rowcount counts ALL rows including the header row (3 body + 1).
			const table = screen.getByRole("table");
			expect(table.getAttribute("aria-rowcount")).toBe("4");

			// The header row is row 1 (1-based) and must explicitly restore role="row"
			// (display:flex strips the implicit row role in real browsers; jsdom
			// ignores CSS display, so assert the attribute directly).
			const headerRow = document.querySelector(
				'thead[data-slot="table-header"] tr',
			);
			expect(headerRow?.getAttribute("aria-rowindex")).toBe("1");
			expect(headerRow?.getAttribute("role")).toBe("row");

			// First rendered body row is row 2 (index 0 -> rowindex 2); second is 3.
			const bodyRows = document.querySelectorAll(
				'tbody[data-slot="table-body"] tr[role="row"]',
			);
			expect(bodyRows.length).toBe(2);
			expect(bodyRows[0]?.getAttribute("aria-rowindex")).toBe("2");
			expect(bodyRows[1]?.getAttribute("aria-rowindex")).toBe("3");
		} finally {
			virtualMock.override = null;
		}
	});

	it("keeps the scroll container structure that makes the sticky header stick (no ui Table overflow wrapper)", async () => {
		// Regression guard for the cycle-3 sticky-header fix: the virtualized table
		// must be a plain <table display:grid> rendered DIRECTLY inside the
		// overflow-auto scrollRef, NOT wrapped in the ui <Table> primitive (whose
		// data-slot="table-container" overflow-x-auto div would become the nearest
		// scroll container and capture the sticky <thead>, scrolling it out of view).
		virtualMock.override = [{ index: 0, start: 0, size: 56 }];
		try {
			await act(async () => {
				render(<ControlledHarness data={makeRows(20)} />, { wrapper: Wrapper });
			});

			const table = screen.getByRole("table");
			// The table renders as a grid (canonical virtualized layout).
			expect(table.style.display).toBe("grid");
			// scrollRef is the table's DIRECT parent and the sole scroll container.
			const scrollParent = table.parentElement as HTMLElement;
			expect(scrollParent.className).toMatch(/overflow-auto/);
			expect(scrollParent.className).toMatch(/max-h-/);
			// No ui <Table> overflow-x-auto wrapper sits between scrollRef and the
			// table (that wrapper is exactly what broke the sticky header).
			expect(
				document.querySelector('[data-slot="table-container"]'),
			).toBeNull();
			// The header is sticky to scrollRef.
			const thead = document.querySelector(
				'thead[data-slot="table-header"]',
			) as HTMLElement;
			expect(thead.style.position).toBe("sticky");
			expect(thead.style.top).toBe("0px");
			expect(thead.style.zIndex).toBe("1");
		} finally {
			virtualMock.override = null;
		}
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

	it("shows a true no-portfolio state (no Clear filters) when the owner has zero properties", async () => {
		await act(async () => {
			render(<ControlledHarness data={[]} />, { wrapper: Wrapper });
		});

		expect(screen.getByText("No properties yet")).toBeInTheDocument();
		// No filters exist to clear, so the no-match affordance must NOT appear.
		expect(screen.queryByText(/no properties match your filters/i)).toBeNull();
		expect(screen.queryByRole("button", { name: /clear filters/i })).toBeNull();
	});

	it("shows the no-match state with Clear filters when properties exist but the filter set is empty", async () => {
		const user = userEvent.setup();
		const data = [
			makeRow({ id: "a", property: "Aspen Court", leaseStatus: "active" }),
			makeRow({ id: "b", property: "Birch Flats", leaseStatus: "vacant" }),
		];
		await act(async () => {
			render(<ControlledHarness data={data} />, { wrapper: Wrapper });
		});

		// Search for a string no property matches -> filtered set empties out.
		await user.type(screen.getByPlaceholderText("Search properties..."), "zzz");

		await waitFor(
			() => {
				expect(
					screen.getByText(/no properties match your filters/i),
				).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
		// This is the FILTERED-empty state, so Clear filters IS offered.
		expect(
			screen.getByRole("button", { name: /clear filters/i }),
		).toBeInTheDocument();
		// And it is NOT the zero-properties copy.
		expect(screen.queryByText("No properties yet")).toBeNull();
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

	it("defaults to property ascending sort on first paint (parity with prior dashboard)", async () => {
		await act(async () => {
			render(
				<ControlledHarness
					data={[
						makeRow({ id: "z", property: "Zephyr Heights" }),
						makeRow({ id: "a", property: "Aspen Court" }),
						makeRow({ id: "m", property: "Maple Court" }),
					]}
					initialView="grid"
				/>,
				{ wrapper: Wrapper },
			);
		});

		// Grid reads table.getRowModel().rows, so the default sort orders the cards.
		// Aspen (A) must come before Maple (M) before Zephyr (Z).
		const names = screen
			.getAllByText(/Court|Heights/)
			.map((el) => el.textContent);
		const aspenIdx = names.indexOf("Aspen Court");
		const mapleIdx = names.indexOf("Maple Court");
		const zephyrIdx = names.indexOf("Zephyr Heights");
		expect(aspenIdx).toBeGreaterThanOrEqual(0);
		expect(aspenIdx).toBeLessThan(mapleIdx);
		expect(mapleIdx).toBeLessThan(zephyrIdx);
	});

	it("suppresses the misleading row-selection summary in the footer (non-selectable table)", async () => {
		await act(async () => {
			render(<ControlledHarness data={makeRows(25)} />, { wrapper: Wrapper });
		});

		// The pagination footer renders (rows-per-page present) but the
		// "N of M row(s) selected" summary is gated off via showSelectedCount.
		expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
		expect(screen.queryByText(/row\(s\) selected/i)).toBeNull();
	});
});
