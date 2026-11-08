import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";
import { waitForEntranceAnimations } from "../lib/authed-dashboard";
import { boxesOf, polledRead } from "../lib/measure";
import { ROUTES } from "./constants/routes";

/**
 * Reporting hub route smoke (Phase 56 — RPTHUB-04).
 *
 * THIS SPEC IS THE RPTHUB-04 GATE. Plan 56-07 deleted the entire legacy
 * financials route tree under `src/app/(owner)/`, and it was permitted to do so
 * ONLY because the replacement `/reports/*` routes were proven to render first.
 * Until these tests are green, no legacy financial route may be removed.
 *
 * PLACEMENT IS LOAD-BEARING. This file sits at the ROOT of `tests/e2e/tests/`,
 * not under `tests/e2e/tests/owner/`. Any path carrying an `owner/` segment is
 * claimed by the `owner` Playwright project's testMatch glob, and CI never
 * invokes that project — a spec placed there reports coverage it does not
 * provide, which is already true of `owner/owner-reports.e2e.spec.ts` and
 * `owner/reports-gate.spec.ts`.
 *
 * REGISTRATION IS ALSO LOAD-BEARING. The `owner-axe` project uses an explicit
 * filename allowlist, not a glob, so this file is named in that project's
 * `testMatch` in `playwright.config.ts`. CI's `e2e-smoke` job runs
 * `--project=smoke --project=public --project=owner-axe`, so `owner-axe` is the
 * project that actually gates the PR. The file is correspondingly added to the
 * `chromium` project's `testIgnore` so it does not double-execute — and a spec
 * that only matched `chromium` would pass locally while never gating anything,
 * because CI's e2e-smoke run does not include that project.
 *
 * AUTHENTICATION is performed in-test by `loginAsOwner` — the same pattern as
 * `notifications.spec.ts` and `owner/dashboard-smoke.e2e.spec.ts`. It injects
 * the `@supabase/ssr` session as cookies onto each fresh per-test context
 * before the first navigation, so this spec consumes NO pre-saved session file
 * (`playwright/.auth/owner.json`, which the `owner`, `chromium`, `firefox` and
 * `mobile-chrome` projects load) and needs no `setup-owner` dependency. That
 * property is grep-checkable: this file must contain zero occurrences of the
 * per-project session-state option, so the token is deliberately not spelled
 * out here and a repo-wide grep for it returns only real configuration.
 *
 * COVERAGE BUDGET: the config runs with `maxFailures: 0`, `retries: 2`,
 * `workers: 2` and `timeout: 30_000` under a 9-minute `globalTimeout` (the real
 * ceiling, inside a 15-minute job), so every route test does exactly three
 * things — navigate, prove it did not land on `/login`, prove the page's `<h1>`
 * rendered — and none asserts a figure, since owner A's own data is no
 * fixture. The export tests below answer the statements' only data sources in
 * the browser instead (`get_billing_insights` and `get_expense_summary`,
 * through `answerStatementRpcs` and `answerBalanceSheetRpcs`) with fixed
 * figures, so the tiles on screen and the downloaded file must both equal
 * known values; the "unavailable" tests answer with `get_billing_insights`'
 * body from before 20261102055449. They write nothing to the database.
 */

/**
 * The route's page heading. `.first()` rather than a bare locator because
 * `/reports/tax-documents` declares an `<h1>` in BOTH its error branch and its
 * loaded branch. Only one renders at a time, but `.first()` removes the
 * strict-mode ambiguity outright.
 */
function pageHeading(page: Page, name: string) {
	return page.getByRole("heading", { level: 1, name }).first();
}

/**
 * All 8 hub routes and the exact `<h1>` each renders, matched by its text in
 * the file that renders it under `src/app/(owner)/reports/`: `page.tsx`,
 * `income-statement/income-statement-page-header.tsx`,
 * `cash-flow/cash-flow-header.tsx`, `balance-sheet/page.tsx`,
 * `expenses/page.tsx`, `tax-documents/page.tsx` (in its error branch and its
 * loaded branch), `generate/page.tsx` and `year-end/page.tsx`.
 */
const hubRoutes = [
	{ path: ROUTES.REPORTS, heading: "Reports" },
	{ path: ROUTES.REPORTS_INCOME_STATEMENT, heading: "Income Statement" },
	{ path: ROUTES.REPORTS_CASH_FLOW, heading: "Cash Flow" },
	{ path: ROUTES.REPORTS_BALANCE_SHEET, heading: "Balance Sheet" },
	{ path: ROUTES.REPORTS_EXPENSES, heading: "Expenses" },
	{ path: ROUTES.REPORTS_TAX_DOCUMENTS, heading: "Tax Documents" },
	{ path: ROUTES.REPORTS_GENERATE, heading: "Generate Reports" },
	{ path: ROUTES.REPORTS_YEAR_END, heading: "Year-End Reports" },
] as const;

test.describe("Reports hub routes (Phase 56 — RPTHUB-04)", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page);
	});

	for (const { path, heading } of hubRoutes) {
		test(`renders ${heading} at ${path}`, async ({ page }) => {
			await page.goto(path);

			// An authenticated-render proof, not a redirect check: the proxy sends
			// unauthenticated traffic under /reports to /login, so staying on the
			// requested path is the substance of the assertion.
			const currentUrl = page.url();
			expect(currentUrl).not.toContain("/login");
			expect(currentUrl).toContain(path);

			await expect(pageHeading(page, heading)).toBeVisible({
				timeout: 15000,
			});
		});
	}

	test("hub index groups Statements and Exports with no Analytics group (D-31)", async ({
		page,
	}) => {
		await page.goto(ROUTES.REPORTS);

		// Scoped to the app shell's content landmark so the sidebar's own
		// "Analytics" nav entry — a peer section this phase deliberately leaves
		// live — cannot satisfy or defeat the assertions below.
		const main = page.locator("main#main-content");

		await expect(
			main.getByRole("heading", { level: 2, name: "Statements" }),
		).toBeVisible({ timeout: 15000 });
		await expect(
			main.getByRole("heading", { level: 2, name: "Exports" }),
		).toBeVisible();
		await expect(main.getByRole("heading", { name: "Analytics" })).toHaveCount(
			0,
		);
	});
});

/**
 * The statements' CSV exports (66.2-39 UI-SPEC VD-54 cash flow, VD-58 income
 * statement and balance sheet).
 *
 * Each Export button downloads its cached `financialQueries` data through the
 * view the page renders (`cash-flow-csv.ts`, `income-statement-csv.ts`,
 * `balance-sheet-csv.ts`). The ledger and expense RPCs those queries call are
 * answered in the browser with fixed figures (`STATEMENT_LEDGER`,
 * `LEDGER_FIGURES`), so the stat tiles and the file must both show known
 * values ("Total Inflows" 1735.50, a 4515.00 closing balance); the
 * unavailable-state tests answer with the body from before 20261102055449
 * (`BEFORE_LEDGER_KEYS`). Nothing is written to the database.
 *
 * Settling: the button is `aria-disabled` until the selected period's data is
 * on screen (it stays so while `isPlaceholderData` shows the previous period),
 * so the click waits for a hydrated button with no `aria-disabled`, not for
 * visibility. The onboarding tour is marked completed first, as
 * `gotoAuthedDashboard` does, so its spotlight can never sit over the header.
 */
const CASH_FLOW_CSV_HEADER =
	"Period,Start Date,End Date,Currency,Section,Line Item,Share (%),Amount";
const CASH_FLOW_FILENAME =
	/^tenantflow-cash-flow-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})\.csv$/;

async function gotoReport(
	page: Page,
	path: string,
	heading: string,
): Promise<void> {
	await loginAsOwner(page);
	await page.evaluate(() => {
		localStorage.setItem(
			"tenantflow:tour-progress",
			JSON.stringify({ "owner-onboarding": "completed" }),
		);
	});
	await page.goto(path);
	expect(page.url()).not.toContain("/login");
	await expect(pageHeading(page, heading)).toBeVisible({ timeout: 15000 });
}

/**
 * Waits until react-dom has hydrated `locator`'s node: react-dom precaches a
 * fiber on every host node it hydrates (`__reactFiber$<random>`), so an own key
 * starting with `__react` is the hydration signal; visibility is not (the
 * apply-token.spec.ts and app-shell-sidebar.spec.ts gate).
 */
async function waitForHydrated(locator: Locator): Promise<void> {
	await expect
		.poll(
			() =>
				locator.evaluate((node) =>
					Object.keys(node).some((key) => key.startsWith("__react")),
				),
			{ timeout: 15000 },
		)
		.toBe(true);
}

/** The Export button once hydrated and enabled (its data is the period shown). */
async function settledExportButton(page: Page): Promise<Locator> {
	const exportButton = page
		.locator("main#main-content")
		.getByRole("button", { name: "Export", exact: true });
	await waitForHydrated(exportButton);
	await expect(exportButton).not.toHaveAttribute("aria-disabled", {
		timeout: 15000,
	});
	return exportButton;
}

/** A stat tile's value as the page shows it, digits only: "+$1,234.50" -> "1234.50". */
async function statAmount(page: Page, label: string): Promise<string> {
	const tile = page.locator('[data-slot="stat"]').filter({
		has: page.locator('[data-slot="stat-label"]', { hasText: label }),
	});
	const text = await tile.locator('[data-slot="stat-value"]').innerText();
	const compact = text.replace(/\s+/g, "");
	const match = /^([+-]?)\$([\d,]+\.\d{2})$/.exec(compact);
	if (!match) {
		throw new Error(`${label} tile shows "${text}", not a dollar amount`);
	}
	const digits = (match[2] ?? "").replace(/,/g, "");
	return match[1] === "-" && Number(digits) !== 0 ? `-${digits}` : digits;
}

/** RFC 4180 rows (quoted fields, doubled quotes, CRLF or LF line ends). */
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"' && text[i + 1] === '"') {
				field += '"';
				i += 1;
			} else if (ch === '"') {
				quoted = false;
			} else {
				field += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === ",") {
			row.push(field);
			field = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && text[i + 1] === "\n") i += 1;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else {
			field += ch;
		}
	}
	if (field !== "" || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

/** Clicks the settled Export button and reads the file it downloads. */
async function downloadCsv(
	page: Page,
	exportButton: Locator,
): Promise<{ name: string; header: string; body: string[][] }> {
	const downloadEvent = page.waitForEvent("download");
	await exportButton.click();
	const download = await downloadEvent;
	const rows = parseCsv(await readFile(await download.path(), "utf8"));
	const [header, ...body] = rows;
	return {
		name: download.suggestedFilename(),
		header: header?.join(",") ?? "",
		body,
	};
}

test.describe("Cash flow export (66.2-39 VD-54)", () => {
	test("downloads the figures on screen as tenantflow-cash-flow-<start>-to-<end>.csv", async ({
		page,
	}) => {
		// The report reads the rent ledger as of its period's end and the day
		// before it (get_billing_insights, 20261102055449). Answer those calls
		// and the period's expenses with fixed figures, so the comparison holds
		// whether or not production has the migration applied yet.
		await answerStatementRpcs(page);
		await gotoReport(page, ROUTES.REPORTS_CASH_FLOW, "Cash Flow");
		const exportButton = await settledExportButton(page);

		const onScreen = {
			"Total Inflows": await statAmount(page, "Total Inflows"),
			"Total Outflows": await statAmount(page, "Total Outflows"),
			"Net Cash Flow": await statAmount(page, "Net Cash Flow"),
		};
		// Rent received 4515 - 3040, plus the expenses as owner funds; out, the
		// expenses; net, the rent received.
		expect(onScreen).toEqual({
			"Total Inflows": "1735.50",
			"Total Outflows": "260.50",
			"Net Cash Flow": "1475.00",
		});

		const { name, header, body } = await downloadCsv(page, exportButton);
		const dates = CASH_FLOW_FILENAME.exec(name);
		expect(dates, `filename ${name}`).not.toBeNull();
		const [, startDate, endDate] = dates ?? [];
		expect(startDate && endDate && startDate <= endDate).toBe(true);

		expect(header).toBe(CASH_FLOW_CSV_HEADER);
		expect(body.length).toBeGreaterThan(0);
		for (const row of body) {
			expect(row).toHaveLength(8);
			expect(row.slice(1, 4)).toEqual([startDate, endDate, "USD"]);
		}

		const total = (item: string) =>
			body.find((row) => row[4] === "Totals" && row[5] === item)?.[7];
		for (const [item, shown] of Object.entries(onScreen)) {
			expect(total(item), `${item} in the CSV`).toBe(shown);
		}
		const line = (section: string, item: string) =>
			body.find((row) => row[4] === section && row[5] === item)?.[7];
		expect(line("Balance Summary", "Opening Balance")).toBe("3040.00");
		expect(line("Balance Summary", "Closing Balance")).toBe("4515.00");
		expect(line("Cash Inflows", "Rent Received")).toBe("1475.00");
	});

	test("says the ledger totals are unavailable when the server returns none", async ({
		page,
	}) => {
		await answerStatementRpcs(page, BEFORE_LEDGER_KEYS);
		await gotoReport(page, ROUTES.REPORTS_CASH_FLOW, "Cash Flow");
		await expectLedgerUnavailable(
			page,
			"The rent ledger totals this report is built on aren't available yet.",
		);
	});
});

const INCOME_STATEMENT_CSV_HEADER =
	"Period,Start Date,End Date,Currency,Section,Line Item,Percent (%),Amount";
const INCOME_STATEMENT_FILENAME =
	/^tenantflow-income-statement-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})\.csv$/;
const BALANCE_SHEET_CSV_HEADER =
	"As Of Date,Currency,Section,Group,Line Item,Amount";
const BALANCE_SHEET_FILENAME =
	/^tenantflow-balance-sheet-(\d{4}-\d{2}-\d{2})\.csv$/;

test.describe("Statement exports (66.2-39 VD-58)", () => {
	test("income statement: downloads the figures on screen as tenantflow-income-statement-<start>-to-<end>.csv", async ({
		page,
	}) => {
		// What the ledger charged in the period: as of its end less as of the
		// day before it (get_billing_insights, 20261102055449), answered here.
		await answerStatementRpcs(page);
		await gotoReport(page, ROUTES.REPORTS_INCOME_STATEMENT, "Income Statement");
		const exportButton = await settledExportButton(page);

		const onScreen = {
			"Total Revenue": await statAmount(page, "Total Revenue"),
			"Total Expenses": await statAmount(page, "Total Expenses"),
			"Net Income": await statAmount(page, "Net Income"),
		};
		// 1000 rent + 110 late fees + 250.50 other - 100 credits charged.
		expect(onScreen).toEqual({
			"Total Revenue": "1260.50",
			"Total Expenses": "260.50",
			"Net Income": "1000.00",
		});

		const { name, header, body } = await downloadCsv(page, exportButton);
		const dates = INCOME_STATEMENT_FILENAME.exec(name);
		expect(dates, `filename ${name}`).not.toBeNull();
		const [, startDate, endDate] = dates ?? [];
		expect(startDate && endDate && startDate <= endDate).toBe(true);

		expect(header).toBe(INCOME_STATEMENT_CSV_HEADER);
		expect(body.length).toBeGreaterThan(0);
		for (const row of body) {
			expect(row).toHaveLength(8);
			expect(row.slice(1, 4)).toEqual([startDate, endDate, "USD"]);
		}

		const total = (item: string) =>
			body.find((row) => row[4] === "Totals" && row[5] === item)?.[7];
		for (const [item, shown] of Object.entries(onScreen)) {
			expect(total(item), `${item} in the CSV`).toBe(shown);
		}
		const revenue = body
			.filter((row) => row[4] === "Revenue Breakdown")
			.map((row) => [row[5], row[7]]);
		expect(revenue).toEqual([
			["Rent Charged", "1000.00"],
			["Late Fees Charged", "110.00"],
			["Other Charges", "250.50"],
			["Credits Issued", "-100.00"],
			["Total Revenue", "1260.50"],
		]);
	});

	test("income statement: splits the ledger calls on the browser's month at a UTC month boundary", async ({
		page,
	}) => {
		// 03:00 UTC on November 1 is 22:00 on October 31 in the browser's
		// America/Chicago: the page opens on October while a UTC clock is in
		// November, the hour in which a split on Node's month gave both calls
		// `ledger.before`. Only the browser's Date is fixed (timers run), and at
		// a time before the session was issued, so supabase-js never sees it
		// expire and never refreshes it.
		await page.clock.setFixedTime(new Date("2026-11-01T03:00:00Z"));
		await answerStatementRpcs(page);
		await gotoReport(page, ROUTES.REPORTS_INCOME_STATEMENT, "Income Statement");
		const exportButton = await settledExportButton(page);
		expect({
			"Total Revenue": await statAmount(page, "Total Revenue"),
			"Net Income": await statAmount(page, "Net Income"),
		}).toEqual({ "Total Revenue": "1260.50", "Net Income": "1000.00" });
		const { name } = await downloadCsv(page, exportButton);
		expect(INCOME_STATEMENT_FILENAME.exec(name)?.slice(1)).toEqual([
			"2026-10-01",
			"2026-10-31",
		]);
	});

	test("income statement: says the ledger totals are unavailable when the server returns none", async ({
		page,
	}) => {
		await answerStatementRpcs(page, BEFORE_LEDGER_KEYS);
		await gotoReport(page, ROUTES.REPORTS_INCOME_STATEMENT, "Income Statement");
		await expectLedgerUnavailable(
			page,
			"The rent ledger totals this statement is built on aren't available yet.",
		);
	});

	test("balance sheet: downloads the figures on screen as tenantflow-balance-sheet-<as-of>.csv", async ({
		page,
	}) => {
		// The sheet reads the rent ledger as of its date (get_billing_insights,
		// 20261102055449). Answer that RPC and the two expense totals with fixed
		// ledger figures, so the comparison holds whether or not production has
		// the migration applied yet, and the page shows the ledger state.
		await answerBalanceSheetRpcs(page, LEDGER_FIGURES);
		await gotoReport(page, ROUTES.REPORTS_BALANCE_SHEET, "Balance Sheet");
		const exportButton = await settledExportButton(page);

		const onScreen = {
			"Total Assets": await statAmount(page, "Total Assets"),
			"Total Liabilities": await statAmount(page, "Total Liabilities"),
			"Total Equity": await statAmount(page, "Total Equity"),
		};
		// Cash + A/R, the credit balances, and the ledger's charged total.
		expect(onScreen).toEqual({
			"Total Assets": "4660.50",
			"Total Liabilities": "420.00",
			"Total Equity": "4240.50",
		});
		// The default selection is the current month, so the sheet is as of its
		// last day, read in the browser's own time zone.
		const expectedAsOf = await page.evaluate(() => {
			const now = new Date();
			const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
			const pad = (n: number) => String(n).padStart(2, "0");
			return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
		});

		const { name, header, body } = await downloadCsv(page, exportButton);
		expect(BALANCE_SHEET_FILENAME.exec(name)?.[1], `filename ${name}`).toBe(
			expectedAsOf,
		);

		expect(header).toBe(BALANCE_SHEET_CSV_HEADER);
		expect(body.length).toBeGreaterThan(0);
		for (const row of body) {
			expect(row).toHaveLength(6);
			expect(row.slice(0, 2)).toEqual([expectedAsOf, "USD"]);
		}

		const total = (item: string) =>
			body.find((row) => row[2] === "Totals" && row[4] === item)?.[5];
		for (const [item, shown] of Object.entries(onScreen)) {
			expect(total(item), `${item} in the CSV`).toBe(shown);
		}
		const line = (group: string, item: string) =>
			body.find((row) => row[3] === group && row[4] === item)?.[5];
		expect(line("Current Assets", "Cash")).toBe("4515.00");
		expect(line("Current Assets", "Accounts Receivable")).toBe("145.50");
	});

	test("balance sheet: says the ledger totals are unavailable when the server returns none", async ({
		page,
	}) => {
		// get_billing_insights' body before 20261102055449: no ledger keys.
		await answerBalanceSheetRpcs(page, {
			totalRevenue: 30000,
			mrr: 2500,
			churnRate: 0,
			unpaidTotal: 0,
			unpaidCount: 0,
			lateFeeTotal: 0,
			tenantCount: 2,
		});
		await gotoReport(page, ROUTES.REPORTS_BALANCE_SHEET, "Balance Sheet");
		await expect(page.getByText("Ledger totals unavailable")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.locator('[data-slot="stat"]')).toHaveCount(0);
		const exportButton = page
			.locator("main#main-content")
			.getByRole("button", { name: "Export", exact: true });
		await waitForHydrated(exportButton);
		await expect(exportButton).toHaveAttribute("aria-disabled", "true");
		await expect(exportButton).toHaveAccessibleDescription(
			"The rent ledger totals this sheet is built on aren't available yet.",
		);
	});
});

/** get_billing_insights' body before 20261102055449: no ledger keys. */
const BEFORE_LEDGER_KEYS = {
	totalRevenue: 30000,
	mrr: 2500,
	churnRate: 0,
	unpaidTotal: 0,
	unpaidCount: 0,
	lateFeeTotal: 0,
	tenantCount: 2,
} as const;

/**
 * The ledger as of a statement period's end and as of the day before it
 * starts (the replay fixture's March 31 and January 31), and the period's
 * expenses. Both statements open on the current month, so `answerStatementRpcs`
 * gives `end` to the call dated in that month and `before` to the other.
 */
const STATEMENT_LEDGER = {
	end: {
		...BEFORE_LEDGER_KEYS,
		collectedTotal: 4515,
		unpaidTotal: 145.5,
		creditBalanceTotal: 400,
		chargedTotal: 4260.5,
		openingTotal: 300,
		rentChargedTotal: 3500,
		lateFeeChargedTotal: 170,
		manualChargedTotal: 390.5,
		creditTotal: -100,
	},
	before: {
		...BEFORE_LEDGER_KEYS,
		collectedTotal: 3040,
		unpaidTotal: 360,
		creditBalanceTotal: 400,
		chargedTotal: 3000,
		openingTotal: 300,
		rentChargedTotal: 2500,
		lateFeeChargedTotal: 60,
		manualChargedTotal: 140,
		creditTotal: 0,
	},
} as const;

/**
 * Answer a statement's RPCs in the browser: the two get_billing_insights
 * calls, and get_expense_summary with 260.50 of expenses. Both statements open
 * on the current month, so the call as of a date in it (the month's last day)
 * gets `ledger.end` and the one before it (the previous month's last day)
 * `ledger.before`. With one `ledger` object, both calls get it.
 *
 * The current month is the browser's: the page picks it there, under the
 * config's `timezoneId`. Read from Node's clock (UTC on CI), it ran a month
 * ahead of the page from 00:00 to 05:00 UTC (06:00 in winter) on the 1st, so
 * both calls got `ledger.before` and the export tests failed every retry.
 */
async function answerStatementRpcs(
	page: Page,
	ledger:
		| Readonly<Record<string, number>>
		| typeof STATEMENT_LEDGER = STATEMENT_LEDGER,
): Promise<void> {
	const json = (body: unknown) => ({
		status: 200,
		contentType: "application/json",
		headers: { "access-control-allow-origin": "*" },
		body: JSON.stringify(body),
	});
	const monthStart = await page.evaluate(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	});
	await page.route("**/rest/v1/rpc/get_billing_insights", (route) => {
		if (!("end" in ledger)) return route.fulfill(json(ledger));
		const asOf = String(route.request().postDataJSON()?.end_date_param ?? "");
		return route.fulfill(json(asOf >= monthStart ? ledger.end : ledger.before));
	});
	await page.route("**/rest/v1/rpc/get_expense_summary", (route) =>
		route.fulfill(
			json({
				total_amount: 260.5,
				categories: [],
				monthly_totals: [],
				monthly_average: 9999,
			}),
		),
	);
}

/** The statement shows the unavailable state, no figures, and Export says why. */
async function expectLedgerUnavailable(
	page: Page,
	exportReason: string,
): Promise<void> {
	await expect(page.getByText("Ledger totals unavailable")).toBeVisible({
		timeout: 15000,
	});
	await expect(page.locator('[data-slot="stat"]')).toHaveCount(0);
	const exportButton = page
		.locator("main#main-content")
		.getByRole("button", { name: "Export", exact: true });
	await waitForHydrated(exportButton);
	await expect(exportButton).toHaveAttribute("aria-disabled", "true");
	await expect(exportButton).toHaveAccessibleDescription(exportReason);
}

/** The ledger as of a date, as get_billing_insights returns it with an end date. */
const LEDGER_FIGURES = {
	totalRevenue: 30000,
	mrr: 2500,
	churnRate: 0,
	unpaidTotal: 145.5,
	unpaidCount: 4,
	lateFeeTotal: 150,
	tenantCount: 2,
	collectedTotal: 4515,
	creditBalanceTotal: 420,
	chargedTotal: 4240.5,
	openingTotal: 300,
} as const;

/**
 * Answer the balance sheet's RPCs in the browser: both get_billing_insights
 * calls (the as-of date and the prior year's end) with `ledger`, and both
 * get_expense_summary calls with no expenses. The header is the one
 * `app-shell-sidebar.spec.ts` sends for the same cross-origin fulfil.
 */
async function answerBalanceSheetRpcs(
	page: Page,
	ledger: Readonly<Record<string, number>>,
): Promise<void> {
	const json = (body: unknown) => ({
		status: 200,
		contentType: "application/json",
		headers: { "access-control-allow-origin": "*" },
		body: JSON.stringify(body),
	});
	await page.route("**/rest/v1/rpc/get_billing_insights", (route) =>
		route.fulfill(json(ledger)),
	);
	await page.route("**/rest/v1/rpc/get_expense_summary", (route) =>
		route.fulfill(
			json({
				total_amount: 0,
				categories: [],
				monthly_totals: [],
				monthly_average: 0,
			}),
		),
	);
}

/**
 * The report headers' control rows below `sm` (66.2-39 VD-57). Below 640px the
 * header stacks and the row of selects and Export spans it. The row used to be
 * `flex` without wrap, so at 390px the cash-flow selects shrank from 130/100px
 * to 109.7/85.6px, and at 375px and below they clipped their own values
 * ("2026" to "20…"); the balance-sheet month select clipped "November" at
 * 390px. The row now wraps instead of shrinking. Each header is measured at
 * 390px (the brief's width) and 360px (the narrowest common phone), with its
 * default values and with its widest option selected.
 */
const NARROW_WIDTHS = [390, 360] as const;

const REPORT_HEADERS = [
	{
		path: ROUTES.REPORTS_CASH_FLOW,
		heading: "Cash Flow",
		widest: { picks: "(period)", option: "Quarterly" },
	},
	{
		path: ROUTES.REPORTS_INCOME_STATEMENT,
		heading: "Income Statement",
		widest: { picks: "(period)", option: "Quarterly" },
	},
	{
		path: ROUTES.REPORTS_BALANCE_SHEET,
		heading: "Balance Sheet",
		widest: { picks: "(month)", option: "September" },
	},
] as const;

async function expectHeaderRowFits(row: Locator, label: string): Promise<void> {
	// One snapshot of the row and its three controls (document order: the row,
	// then each control), so containment and overlap compare boxes from the
	// same moment.
	const [rowBox, ...controlBoxes] = await boxesOf(
		row.or(row.locator(":scope > button")),
		{ min: 4 },
	);
	if (!rowBox) throw new Error(`${label}: no header control row`);

	// Overflow and clipping, in one browser-side snapshot.
	const fit = await polledRead(
		() =>
			row.evaluate((rowEl) => ({
				viewport: document.documentElement.clientWidth,
				rowScrollWidth: rowEl.scrollWidth,
				rowClientWidth: rowEl.clientWidth,
				controls: [...rowEl.querySelectorAll(":scope > button")].map(
					(button) => {
						const value = button.querySelector('[data-slot="select-value"]');
						return {
							name:
								button.getAttribute("aria-label") ??
								button.textContent?.trim() ??
								"",
							scrollWidth: button.scrollWidth,
							clientWidth: button.clientWidth,
							value: value
								? {
										text: value.textContent ?? "",
										scrollWidth: value.scrollWidth,
										clientWidth: value.clientWidth,
										scrollHeight: value.scrollHeight,
										clientHeight: value.clientHeight,
									}
								: null,
						};
					},
				),
			})),
		(snapshot) =>
			snapshot.controls.length === 3 &&
			snapshot.controls.every((control) => control.clientWidth > 0),
	);

	expect(fit.controls.at(-1)?.name, label).toBe("Export");
	expect(fit.rowScrollWidth, label).toBeLessThanOrEqual(fit.rowClientWidth);
	expect(controlBoxes, label).toHaveLength(3);
	const rowRight = rowBox.x + rowBox.width;
	for (const [index, box] of controlBoxes.entries()) {
		const name = `${label}: ${fit.controls[index]?.name ?? index}`;
		expect(box.x, name).toBeGreaterThanOrEqual(rowBox.x);
		expect(box.x + box.width, name).toBeLessThanOrEqual(rowRight);
		expect(box.x + box.width, name).toBeLessThanOrEqual(fit.viewport);
		for (const other of controlBoxes.slice(index + 1)) {
			const overlapX =
				Math.min(box.x + box.width, other.x + other.width) -
				Math.max(box.x, other.x);
			const overlapY =
				Math.min(box.y + box.height, other.y + other.height) -
				Math.max(box.y, other.y);
			expect(
				overlapX > 0.5 && overlapY > 0.5,
				`${name} overlaps a sibling`,
			).toBe(false);
		}
	}
	for (const control of fit.controls) {
		expect(
			control.scrollWidth,
			`${label}: ${control.name}`,
		).toBeLessThanOrEqual(control.clientWidth);
		if (!control.value) continue;
		const value = control.value;
		expect(
			value.scrollWidth,
			`${label}: "${value.text}" is clipped`,
		).toBeLessThanOrEqual(value.clientWidth);
		expect(
			value.scrollHeight,
			`${label}: "${value.text}" wraps`,
		).toBeLessThanOrEqual(value.clientHeight);
	}
}

test.describe("Report header controls below sm (66.2-39 VD-57)", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	for (const header of REPORT_HEADERS) {
		test(`${header.heading}: the selects and Export fit at 390 and 360px with no clipped value`, async ({
			page,
		}) => {
			await gotoReport(page, header.path, header.heading);
			const main = page.locator("main#main-content");
			const firstTrigger = main
				.locator('button[data-slot="select-trigger"]')
				.first();
			await waitForHydrated(firstTrigger);
			await waitForEntranceAnimations(page);
			const row = firstTrigger.locator("xpath=..");

			for (const state of ["default", "widest"] as const) {
				if (state === "widest") {
					const { picks, option } = header.widest;
					const trigger = row.locator(
						`:scope > button[aria-label$="${picks}"]`,
					);
					await page.setViewportSize({ width: 390, height: 844 });
					await trigger.click();
					await page.getByRole("option", { name: option, exact: true }).click();
					await expect(trigger).toHaveAttribute(
						"aria-label",
						`${option} ${picks}`,
					);
					await expect(page.getByRole("listbox")).toHaveCount(0);
				}
				for (const width of NARROW_WIDTHS) {
					await page.setViewportSize({ width, height: 844 });
					await expect
						.poll(() =>
							page.evaluate(() => document.documentElement.clientWidth),
						)
						.toBe(width);
					await expectHeaderRowFits(
						row,
						`${header.heading} (${state} values) at ${width}px`,
					);
				}
			}
		});
	}
});
