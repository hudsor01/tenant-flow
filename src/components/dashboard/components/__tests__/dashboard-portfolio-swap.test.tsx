/**
 * Phase 5 Plan 03b — the atomic swap (DT-01/07/08/09).
 *
 * Pins the load-bearing behaviour of the swap:
 *  - Dashboard mounts the vendored <PortfolioDataTable> and NO LONGER renders the
 *    hand-rolled portfolio trio (those imports are gone).
 *  - The grid/table toggle still flows through the trimmed dashboard-store.
 *  - PortfolioPresetMenu collects the live snapshot from the SAME nuqs keys
 *    useClientDataTable writes (status + property + sort + page — NOT a separate
 *    search/q key) and round-trips it through the presets store + back to nuqs.
 *  - Column visibility is sourced from the presets store and survives a remount.
 *
 * The global unit-setup mocks nuqs (reads -> null). This suite drives REAL nuqs
 * via NuqsTestingAdapter so the snapshot collect/apply path is exercised for real.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";
import { PortfolioPresetMenu } from "#components/dashboard/components/portfolio-preset-menu";
import { Dashboard } from "#components/dashboard/dashboard";
import {
	DASHBOARD_PRESETS_STORAGE_KEY,
	useDashboardPresetsStore,
} from "#stores/dashboard-presets-store";
import { useDashboardStore } from "#stores/dashboard-store";
import type { PropertyPerformanceItem } from "#types/sections/dashboard";

vi.unmock("nuqs");

// `next/dynamic` with `ssr: false` suspends forever in jsdom (no Suspense
// boundary), which would abort the Dashboard render before the portfolio section.
// Resolve it synchronously to the loading skeleton so the rest of the tree mounts.
vi.mock("next/dynamic", () => ({
	__esModule: true,
	default: (_loader: unknown, options?: { loading?: () => ReactNode }) => {
		const Loading = options?.loading;
		return () => (Loading ? <Loading /> : null);
	},
}));

const KPI_LOADING: KpiBentoRowProps = {
	isLoading: true,
	stats: null,
	metricTrends: null,
	timeSeries: null,
};

const PROPERTIES: PropertyPerformanceItem[] = [
	{
		id: "p1",
		name: "Maple Court",
		address: "1 Maple Ave",
		totalUnits: 10,
		occupiedUnits: 10,
		occupancyRate: 100,
		monthlyRevenue: 12000,
		openMaintenance: 0,
	},
	{
		id: "p2",
		name: "Birch Flats",
		address: "2 Birch St",
		totalUnits: 8,
		occupiedUnits: 4,
		occupancyRate: 50,
		monthlyRevenue: 6000,
		openMaintenance: 2,
	},
];

let mockLocalStorage: Record<string, string>;

function installLocalStorage() {
	mockLocalStorage = {};
	vi.stubGlobal("localStorage", {
		getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			mockLocalStorage[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete mockLocalStorage[key];
		}),
		clear: vi.fn(() => {
			mockLocalStorage = {};
		}),
	});
}

function resetStores() {
	localStorage.removeItem(DASHBOARD_PRESETS_STORAGE_KEY);
	useDashboardPresetsStore.setState(
		{ presets: {}, columnVisibility: {} },
		false,
	);
	useDashboardStore.setState({ viewMode: "table" }, false);
}

function withUrl(initial?: string) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<NuqsTestingAdapter searchParams={initial ?? ""}>
				{children}
			</NuqsTestingAdapter>
		);
	};
}

function renderDashboard(wrapper = withUrl()) {
	return render(
		<Dashboard
			kpiData={KPI_LOADING}
			monthlyRevenue={[]}
			monthlyRevenue6mo={[]}
			units={{ occupied: 14, vacant: 4, total: 18 }}
			propertyPerformance={PROPERTIES}
		/>,
		{ wrapper },
	);
}

beforeEach(() => {
	installLocalStorage();
	resetStores();
	vi.useRealTimers();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("dashboard portfolio swap", () => {
	it("mounts PortfolioDataTable and drops the hand-rolled portfolio trio", async () => {
		renderDashboard();

		// The vendored DataTable renders its column model + toolbar. (jsdom's
		// virtualizer reports a 0px scroll container, so table-mode row text is not
		// rendered — assert on the always-present chrome instead.)
		expect(
			await screen.findByRole("columnheader", { name: /property/i }),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Search properties..."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("radiogroup", { name: /view mode/i }),
		).toBeInTheDocument();
		// The preset menu trigger is mounted above the table.
		expect(
			screen.getByRole("button", { name: /^presets$/i }),
		).toBeInTheDocument();
	});

	it("toggles viewMode through the trimmed store (grid renders cards)", async () => {
		const user = userEvent.setup();
		renderDashboard();

		await screen.findByRole("columnheader", { name: /property/i });

		await user.click(screen.getByRole("radio", { name: /grid/i }));

		// Grid view: the table header disappears, cards (full data) render.
		expect(useDashboardStore.getState().viewMode).toBe("grid");
		await waitFor(() => {
			expect(screen.queryByRole("columnheader")).toBeNull();
		});
		expect(screen.getByText("Maple Court")).toBeInTheDocument();
		expect(screen.getByText("Birch Flats")).toBeInTheDocument();
	});

	it("save preset captures the live nuqs snapshot (status + property + sort + page)", async () => {
		const user = userEvent.setup();
		// Seed the URL with a full view: status filter, property search, sort, page.
		const wrapper = withUrl(
			"?status=active&property=maple&sort=" +
				encodeURIComponent('[{"id":"rent","desc":true}]') +
				"&page=2",
		);
		render(<PortfolioPresetMenu />, { wrapper });
		// Visibility lives in the presets store (D-3), not the URL.
		useDashboardPresetsStore.getState().setColumnVisibility({
			maintenance: false,
		});

		await user.click(screen.getByRole("button", { name: /^presets$/i }));
		await user.type(
			await screen.findByLabelText("Preset name"),
			"Active high rent",
		);
		await user.click(screen.getByRole("button", { name: /save preset/i }));

		const preset =
			useDashboardPresetsStore.getState().presets["Active high rent"];
		expect(preset).toBeDefined();
		expect(preset?.filters.status).toEqual(["active"]);
		expect(preset?.filters.property).toBe("maple");
		expect(preset?.sort).toEqual([{ id: "rent", desc: true }]);
		expect(preset?.page).toBe(2);
		expect(preset?.columnVisibility).toEqual({ maintenance: false });
	});

	it("apply preset restores nuqs filter/sort/page + presets-store visibility", async () => {
		const user = userEvent.setup();
		// Start from a clean URL; the preset carries the state to restore.
		useDashboardPresetsStore.getState().savePreset("Vacant view", {
			filters: { status: ["vacant"], property: "birch" },
			sort: [{ id: "units", desc: false }],
			columnVisibility: { tenant: false },
			page: 3,
		});

		function Probe() {
			return (
				<>
					<PortfolioPresetMenu />
					<UrlReadout />
				</>
			);
		}
		render(<Probe />, { wrapper: withUrl() });

		await user.click(screen.getByRole("button", { name: /^presets$/i }));
		await user.click(await screen.findByText("Vacant view"));

		await waitFor(() => {
			expect(screen.getByTestId("url-status").textContent).toBe("vacant");
		});
		expect(screen.getByTestId("url-property").textContent).toBe("birch");
		expect(screen.getByTestId("url-sort").textContent).toContain("units");
		expect(screen.getByTestId("url-page").textContent).toBe("3");
		expect(useDashboardPresetsStore.getState().columnVisibility).toEqual({
			tenant: false,
		});
	});

	it("apply preset RE-FILTERS the live table, not just the URL (multi-word property + status)", async () => {
		const user = userEvent.setup();
		// Render in grid mode so the cards expose table.getRowModel().rows directly.
		useDashboardStore.setState({ viewMode: "grid" }, false);
		// A preset whose MULTI-WORD property search + status narrows to one row.
		// "maple court" must stay one string (the FIX-1 regression) and match only
		// Maple Court; status=active also excludes the vacant Birch Flats.
		useDashboardPresetsStore.getState().savePreset("Active maple", {
			filters: { status: ["active"], property: "maple court" },
			sort: [{ id: "property", desc: false }],
			columnVisibility: {},
			page: 1,
		});

		renderDashboard();
		await screen.findByText("Maple Court");
		// Unfiltered grid shows both properties at first.
		expect(screen.getByText("Birch Flats")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^presets$/i }));
		await user.click(await screen.findByText("Active maple"));

		// The table actually re-filters: Birch Flats drops, Maple Court remains.
		await waitFor(() => {
			expect(screen.queryByText("Birch Flats")).toBeNull();
		});
		expect(screen.getByText("Maple Court")).toBeInTheDocument();
	});

	it("refresh round-trip: save a full view, remount from a clean URL, apply, FILTERED ROWS match", async () => {
		const user = userEvent.setup();
		useDashboardStore.setState({ viewMode: "grid" }, false);

		// Save a FULL view preset: multi-word property + status + sort + page.
		useDashboardPresetsStore.getState().savePreset("Saved full view", {
			filters: { status: ["active"], property: "maple court" },
			sort: [{ id: "rent", desc: true }],
			columnVisibility: {},
			page: 1,
		});

		// First mount, then unmount (simulates a refresh / fresh navigation).
		const { unmount } = renderDashboard();
		await screen.findByText("Maple Court");
		unmount();

		// Remount from a CLEAN URL (no params) — the preset carries the state.
		renderDashboard(withUrl());
		await screen.findByText("Maple Court");
		// Clean URL -> unfiltered -> both visible before apply.
		expect(screen.getByText("Birch Flats")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /^presets$/i }));
		await user.click(await screen.findByText("Saved full view"));

		// Applying the saved view re-filters the freshly mounted table: the
		// multi-word property + status narrow the FILTERED ROWS to Maple Court.
		await waitFor(() => {
			expect(screen.queryByText("Birch Flats")).toBeNull();
		});
		expect(screen.getByText("Maple Court")).toBeInTheDocument();
	});

	it("sources column visibility from the presets store and persists across remount", async () => {
		const user = userEvent.setup();
		const { unmount } = renderDashboard();
		await screen.findByRole("columnheader", { name: /property/i });

		// Maintenance column is visible at first.
		expect(
			screen.getByRole("columnheader", { name: /maintenance/i }),
		).toBeInTheDocument();

		// Hide it via the table's view-options menu -> writes to presets store.
		await user.click(screen.getByRole("combobox", { name: /toggle columns/i }));
		await user.click(
			await screen.findByRole("option", { name: /maintenance/i }),
		);

		await waitFor(() => {
			expect(
				useDashboardPresetsStore.getState().columnVisibility.maintenance,
			).toBe(false);
		});
		unmount();

		// Remount: the hidden column stays hidden (sourced from the persist store).
		renderDashboard();
		await screen.findByRole("columnheader", { name: /property/i });
		expect(
			screen.queryByRole("columnheader", { name: /maintenance/i }),
		).toBeNull();
	});
});

// D-10: the inline PropertyPerformance -> PortfolioRow transform in dashboard.tsx
// (occupancyRate -> leaseStatus boundaries, occupiedUnits -> tenant cell) was
// previously untested. Grid mode renders the FULL derived row (status chip +
// tenant cell), so it pins the actual boundary logic in dashboard.tsx.
const TRANSFORM_PROPERTIES: PropertyPerformanceItem[] = [
	{
		// occupancyRate 85 is in the >=80 && <100 band -> "expiring"; partial
		// occupancy (5 of 6) -> tenant "5 tenants". Pins the >=80 boundary.
		id: "expiring-partial",
		name: "Expiring Partial",
		address: "85 Boundary Rd",
		totalUnits: 6,
		occupiedUnits: 5,
		occupancyRate: 85,
		monthlyRevenue: 5000,
		openMaintenance: 0,
	},
	{
		// Zero occupancy -> tenant null -> "--"; occupancyRate 0 (<80) -> "vacant".
		id: "vacant-empty",
		name: "Vacant Empty",
		address: "0 Empty St",
		totalUnits: 4,
		occupiedUnits: 0,
		occupancyRate: 0,
		monthlyRevenue: 0,
		openMaintenance: 0,
	},
];

describe("dashboard portfolio D-10 transform (occupancyRate -> leaseStatus, occupancy -> tenant)", () => {
	function renderTransformDashboard(wrapper = withUrl()) {
		return render(
			<Dashboard
				kpiData={KPI_LOADING}
				monthlyRevenue={[]}
				monthlyRevenue6mo={[]}
				units={{ occupied: 5, vacant: 5, total: 10 }}
				propertyPerformance={TRANSFORM_PROPERTIES}
			/>,
			{ wrapper },
		);
	}

	it("derives leaseStatus from occupancyRate boundaries and tenant from occupancy (grid exposes full row)", async () => {
		// Grid mode renders the full derived row (status chip + tenant cell).
		useDashboardStore.setState({ viewMode: "grid" }, false);
		renderTransformDashboard();

		const expiringCard = (await screen.findByText("Expiring Partial")).closest(
			"div.border",
		) as HTMLElement;
		const vacantCard = screen
			.getByText("Vacant Empty")
			.closest("div.border") as HTMLElement;
		expect(expiringCard).not.toBeNull();
		expect(vacantCard).not.toBeNull();

		// occupancyRate 85 -> ">=80 && <100" -> leaseStatus "expiring" -> chip
		// renders exactly "Expiring" in grid mode (pins the >=80 boundary).
		const { getByText: getInExpiring, queryByLabelText: queryExpiringTenant } =
			within(expiringCard);
		expect(getInExpiring("Expiring")).toBeInTheDocument();
		// Partial occupancy (5 > 0) -> tenant "5 tenants" (NOT the "--" no-tenant
		// placeholder).
		expect(getInExpiring("5 tenants")).toBeInTheDocument();
		expect(queryExpiringTenant("No tenants")).toBeNull();

		// occupancyRate 0 (<80) -> leaseStatus "vacant" -> chip "Vacant"; zero
		// occupancy -> tenant null -> "--" placeholder (aria-label "No tenants").
		const { getByText: getInVacant, getByLabelText: getVacantTenant } =
			within(vacantCard);
		expect(getInVacant("Vacant")).toBeInTheDocument();
		expect(getVacantTenant("No tenants")).toBeInTheDocument();
	});
});

// Reads the live nuqs params with the SAME parsers the menu uses, so the test
// asserts against the real URL round-trip rather than the menu's internals.
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	useQueryStates,
} from "nuqs";
import { getSortingStateParser } from "#lib/parsers";

function UrlReadout() {
	const [state] = useQueryStates({
		page: parseAsInteger.withDefault(1),
		sort: getSortingStateParser([
			"property",
			"units",
			"status",
			"rent",
		]).withDefault([]),
		status: parseAsArrayOf(parseAsString, ","),
		property: parseAsString,
	});
	return (
		<div>
			<span data-testid="url-status">{(state.status ?? []).join(",")}</span>
			<span data-testid="url-property">{state.property ?? ""}</span>
			<span data-testid="url-sort">{JSON.stringify(state.sort)}</span>
			<span data-testid="url-page">{String(state.page)}</span>
		</div>
	);
}
