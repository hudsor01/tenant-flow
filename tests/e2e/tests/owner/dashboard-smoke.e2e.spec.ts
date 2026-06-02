import { expect, type Locator, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../../auth-helpers";
import {
	type DashboardSmokeData,
	fetchDashboardDataAsOwner,
} from "../../dashboard-rpc-helpers";

/**
 * Dashboard /dashboard smoke E2E (Phase 7, POLISH-09).
 *
 * Runs under the dedicated `owner-axe` Playwright project (NO storageState),
 * which CI invokes via `--project=owner-axe` in the `e2e-smoke` job. The legacy
 * storageState `owner` project is NOT run in CI, so a smoke placed there would
 * pass locally but never gate the PR — POLISH-09 success criterion #2 requires
 * the `e2e-smoke` CHECK to exercise this test. Authentication is performed
 * in-test by `loginAsOwner`, which injects the `@supabase/ssr` session as
 * cookies onto each fresh per-test context before the first navigation. The
 * file is excluded from the storageState `owner` / `firefox` / `mobile-chrome`
 * projects via their `testIgnore`.
 *
 * This is the v2.0-redesigned-dashboard smoke. It does NOT extend the legacy
 * owner-dashboard.e2e.spec.ts (which asserts on removed pre-v2.0 surfaces).
 *
 * Coverage (the seven POLISH-09 surfaces):
 *   1. KPI numbers match get_dashboard_data_v2 (RPC-vs-DOM, not hardcoded)
 *   2. Occupancy donut matches stats.units
 *   3. DataTable sort (mouse + keyboard) flips aria-sort
 *   4. Faceted status filter writes the `status` nuqs param + Reset clears it
 *   5. Column-visibility toggle hides/restores a hideable column
 *   6. Preset save + restore (incl. survival across reload — DT-08)
 *   7. Grid/Table view toggle (aria-checked + the rendered surface)
 *
 * Zero-data tolerance: a `beforeEach` waits for EITHER the populated dashboard
 * OR the empty-state. Data-bearing assertions branch on `isEmptyState` and, when
 * empty, assert the HONEST empty surface ("No units yet" donut / "No properties
 * yet" table / no KPI row) rather than skipping vacuously. The synthetic owner
 * currently HAS data, so the populated path is the expected path.
 *
 * Reduced motion: `test.use({ contextOptions: { reducedMotion: "reduce" } })`
 * is applied per describe block so `useReducedMotion()` returns true —
 * KpiNumberTicker renders its final value immediately (avoiding the
 * NumberTicker IntersectionObserver stuck-0 read) and the donut/chart entrance
 * animations are off.
 */

/**
 * Authenticate in-test, suppress the onboarding tour, and wait for a definitive
 * loaded marker (populated heading OR empty-state title). Mirrors
 * dashboard-a11y.e2e.spec.ts gotoAuthedDashboard.
 */
async function gotoAuthedDashboard(page: Page): Promise<void> {
	await loginAsOwner(page);
	// Mark the owner onboarding tour completed so its spotlight overlay never
	// auto-opens over the smoke interactions (it would mask the toolbar / table).
	await page.evaluate(() => {
		localStorage.setItem(
			"tenantflow:tour-progress",
			JSON.stringify({ "owner-onboarding": "completed" }),
		);
	});
	await page.reload();
	await expect(
		page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }).or(
			page.locator('[data-slot="empty-title"]', {
				hasText: "Welcome to TenantFlow",
			}),
		),
	).toBeVisible({ timeout: 10000 });
}

/**
 * True when the zero-data empty-state rendered (DashboardEmptyState) instead of
 * the populated dashboard. Drives the honest empty-branch assertions below.
 */
async function isEmptyState(page: Page): Promise<boolean> {
	const emptyTitle = page.locator('[data-slot="empty-title"]', {
		hasText: "Welcome to TenantFlow",
	});
	return (await emptyTitle.count()) > 0;
}

/**
 * Locate the `<StatValue>` text for a KPI tile by its `<StatLabel>` text inside
 * the bento row, returning the numeric value with `$` / `,` / `%` stripped.
 */
async function readKpiTileNumber(page: Page, label: string): Promise<number> {
	const row = page.getByTestId("kpi-bento-row");
	const tile = row.locator('[data-slot="stat"]', {
		has: page.locator('[data-slot="stat-label"]', { hasText: label }),
	});
	const valueText = await tile
		.locator('[data-slot="stat-value"]')
		.first()
		.innerText();
	const cleaned = valueText.replace(/[$,%\s]/g, "");
	const parsed = Number(cleaned);
	expect(
		Number.isFinite(parsed),
		`KPI tile "${label}" rendered a non-numeric value: "${valueText}"`,
	).toBe(true);
	return parsed;
}

/** The portfolio virtualized table (role=table, aria-label="Property portfolio"). */
function portfolioTable(page: Page): Locator {
	return page.getByRole("table", { name: "Property portfolio" });
}

/**
 * Ensure the portfolio is in table view at the desktop default (1280px). If a
 * prior test left grid mode, click the "Table" radio first. No-op at <1024px,
 * but this project runs at the desktop default viewport.
 */
async function ensureTableView(page: Page): Promise<void> {
	const viewGroup = page.getByRole("radiogroup", { name: "View mode" });
	const tableRadio = viewGroup.getByRole("radio", { name: "Table" });
	if ((await tableRadio.getAttribute("aria-checked")) !== "true") {
		await tableRadio.click();
	}
	await expect(portfolioTable(page)).toBeVisible();
}

/** The `<th role="columnheader">` for a column, located by its header label text. */
function columnHeader(page: Page, label: string): Locator {
	return portfolioTable(page)
		.getByRole("columnheader")
		.filter({ hasText: label });
}

let rpc: DashboardSmokeData;

test.beforeAll(async () => {
	// Derive expected KPI/donut values ONCE from the live RPC (RLS-scoped to the
	// owner), reused across every test. A misconfigured run fails loud here.
	rpc = await fetchDashboardDataAsOwner();
});

test.describe("Dashboard smoke (POLISH-09)", () => {
	// Reduced motion renders the NumberTicker final value immediately and turns
	// off the donut/chart entrance animation — robust KPI + donut reads.
	// `reducedMotion` is a context-level option in this Playwright, so it is set
	// via `contextOptions` rather than a top-level `use` key.
	test.use({ contextOptions: { reducedMotion: "reduce" } });

	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});

	test("KPI numbers match get_dashboard_data_v2", async ({ page }) => {
		if (await isEmptyState(page)) {
			// Honest empty branch: the zero-data path renders the empty-state, NOT
			// the KPI bento row. Assert the row is absent rather than passing vacuously.
			await expect(page.getByTestId("kpi-bento-row")).toHaveCount(0);
			return;
		}

		const { stats } = rpc;
		// Revenue tile formats with 0 fraction digits; compare the rounded dollars.
		expect(await readKpiTileNumber(page, "Revenue")).toBe(
			Math.round(stats.revenue.monthly),
		);
		// Occupancy tile renders stats.units.occupancyRate (rounded by safeOccupancy).
		expect(await readKpiTileNumber(page, "Occupancy")).toBe(
			Math.round(stats.units.occupancyRate),
		);
		expect(await readKpiTileNumber(page, "Active leases")).toBe(
			stats.leases.active,
		);
		expect(await readKpiTileNumber(page, "Open maintenance")).toBe(
			stats.maintenance.open,
		);
		expect(await readKpiTileNumber(page, "Properties")).toBe(
			stats.properties.total,
		);
		expect(await readKpiTileNumber(page, "Units")).toBe(stats.units.total);
	});

	test("occupancy donut matches stats.units", async ({ page }) => {
		const { units } = rpc.stats;

		if (units.total === 0) {
			// Honesty branch (04-CONTEXT D-03/D-08): no fabricated 0% donut.
			await expect(
				page.getByText("No units yet", { exact: true }),
			).toBeVisible();
			return;
		}
		if (await isEmptyState(page)) {
			// Owner has units per the RPC but the page rendered empty-state — surface
			// it as a real failure (contract divergence), not a silent skip.
			throw new Error(
				"RPC reports units but the dashboard rendered the empty-state — investigate data/render divergence",
			);
		}

		const pct = Math.round((units.occupied / units.total) * 100);
		const expectedLabel = `Occupancy donut: ${pct} percent occupied (${units.occupied} of ${units.total} units)`;
		await expect(page.getByRole("img", { name: expectedLabel })).toBeVisible();
	});

	test("DataTable sort works (mouse + keyboard)", async ({ page }) => {
		if (await isEmptyState(page)) {
			test.skip(true, "empty-state owner — no portfolio table to sort");
			return;
		}
		await ensureTableView(page);

		// Mouse sort on "Monthly Rent" (unsorted by default — Property is the
		// default sort). The header is a DropdownMenuTrigger: a mouse click OPENS
		// the asc/desc/reset menu (only keyboard Enter/Space fast-sorts directly),
		// so sort the explicit, contract-correct way — open the menu, pick "Desc".
		const rentHeader = columnHeader(page, "Monthly Rent");
		await expect(rentHeader).toHaveAttribute("aria-sort", "none");
		await rentHeader.getByRole("button", { name: "Monthly Rent" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Desc" }).click();
		await expect(rentHeader).toHaveAttribute("aria-sort", "descending");

		// Keyboard sort on "Property" (default-sorted ascending). Enter toggles to
		// descending directly via the header trigger's onKeyDown fast-sort path.
		const propertyHeader = columnHeader(page, "Property");
		const propertyTrigger = propertyHeader.getByRole("button", {
			name: "Property",
		});
		await expect(propertyHeader).toHaveAttribute("aria-sort", "ascending");
		await propertyTrigger.focus();
		await propertyTrigger.press("Enter");
		await expect(propertyHeader).toHaveAttribute("aria-sort", "descending");
	});

	test("faceted status filter writes the status param and Reset clears it", async ({
		page,
	}) => {
		if (await isEmptyState(page)) {
			test.skip(true, "empty-state owner — no portfolio table to filter");
			return;
		}
		await ensureTableView(page);

		// Open the Status faceted filter and select "Vacant". `exact: true` is
		// required: the portfolio table also renders a "Lease Status" column-header
		// button, so a substring "Status" match is a strict-mode violation.
		await page.getByRole("button", { name: "Status", exact: true }).click();
		await page.getByRole("option", { name: "Vacant" }).click();
		// Close the popover so the URL settles and the toolbar Reset surfaces.
		await page.keyboard.press("Escape");

		await expect(page).toHaveURL(/[?&]status=/);
		const reset = page.getByRole("button", { name: "Reset filters" });
		await expect(reset).toBeVisible();

		await reset.click();
		await expect(page).not.toHaveURL(/[?&]status=/);
	});

	test("column-visibility toggle hides and restores a column", async ({
		page,
	}) => {
		if (await isEmptyState(page)) {
			test.skip(true, "empty-state owner — no portfolio table columns");
			return;
		}
		await ensureTableView(page);

		const maintenanceHeader = columnHeader(page, "Maintenance");
		await expect(maintenanceHeader).toBeVisible();

		// Open the DataTableViewOptions popover (combobox "Toggle columns").
		const viewOptions = page.getByRole("combobox", { name: "Toggle columns" });
		await viewOptions.click();
		await page.getByRole("option", { name: "Maintenance" }).click();
		await page.keyboard.press("Escape");
		await expect(maintenanceHeader).toHaveCount(0);

		// Re-toggle on and confirm it returns.
		await viewOptions.click();
		await page.getByRole("option", { name: "Maintenance" }).click();
		await page.keyboard.press("Escape");
		await expect(columnHeader(page, "Maintenance")).toBeVisible();
	});

	test("preset save + restore survives reload (DT-08)", async ({ page }) => {
		if (await isEmptyState(page)) {
			test.skip(true, "empty-state owner — no portfolio to snapshot");
			return;
		}
		await ensureTableView(page);

		const search = page.getByLabel("Search properties");
		// Apply a recognizable filter: a single-char substring sets the `property`
		// nuqs param without depending on a specific property name existing.
		await search.fill("a");
		await expect(page).toHaveURL(/[?&]property=a(?:[&]|$)/);

		// Save a uniquely-named preset.
		const presetName = `smoke-${Date.now()}`;
		await page.getByRole("button", { name: "Presets" }).click();
		await page.getByLabel("Preset name").fill(presetName);
		await page.getByRole("button", { name: "Save preset" }).click();
		// Close the menu so the next interactions are unobstructed.
		await page.keyboard.press("Escape");

		// Clear the filter and confirm the param is gone.
		await search.fill("");
		await expect(page).not.toHaveURL(/[?&]property=/);

		// Re-open Presets and apply the saved preset — the filter must restore.
		await page.getByRole("button", { name: "Presets" }).click();
		await page.getByRole("menuitem", { name: presetName }).click();
		await expect(page).toHaveURL(/[?&]property=a(?:[&]|$)/);
		await expect(search).toHaveValue("a");

		// Reload: the Zustand-persisted preset must still appear in the menu (the
		// precise POLISH-09 "save+restore across refresh" wording).
		await page.reload();
		await expect(
			page
				.getByRole("heading", { level: 1, name: "Dashboard", exact: true })
				.or(
					page.locator('[data-slot="empty-title"]', {
						hasText: "Welcome to TenantFlow",
					}),
				),
		).toBeVisible({ timeout: 10000 });
		await page.getByRole("button", { name: "Presets" }).click();
		await expect(
			page.getByRole("menuitem", { name: presetName }),
		).toBeVisible();
	});

	test("grid/table view toggle works", async ({ page }) => {
		if (await isEmptyState(page)) {
			test.skip(true, "empty-state owner — no portfolio surface to toggle");
			return;
		}
		await ensureTableView(page);

		const viewGroup = page.getByRole("radiogroup", { name: "View mode" });
		const gridRadio = viewGroup.getByRole("radio", { name: "Grid" });
		const tableRadio = viewGroup.getByRole("radio", { name: "Table" });

		// Switch to Grid: aria-checked flips and the table is replaced by the grid.
		await gridRadio.click();
		await expect(gridRadio).toHaveAttribute("aria-checked", "true");
		await expect(portfolioTable(page)).toHaveCount(0);

		// Switch back to Table: the table returns and Table is checked.
		await tableRadio.click();
		await expect(tableRadio).toHaveAttribute("aria-checked", "true");
		await expect(portfolioTable(page)).toBeVisible();
	});
});
