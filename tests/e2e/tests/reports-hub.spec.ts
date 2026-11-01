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
 * rendered. No fixed-value assertions: an owner fixture with no ledger data
 * legitimately renders `$0.00`, and asserting on figures would be flaky. The
 * cash-flow export tests below compare the downloaded file with what the page
 * itself shows, which holds for any data, and seed nothing.
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
 * All 8 hub routes and the exact `<h1>` each renders, verified against source:
 * `page.tsx:32`, `income-statement/income-statement-page-header.tsx:29`,
 * `cash-flow/cash-flow-header.tsx:28`, `balance-sheet/page.tsx:159`,
 * `expenses/page.tsx:140`, `tax-documents/page.tsx:70` and `:105`,
 * `generate/page.tsx:120`, `year-end/page.tsx:174`.
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

	// NOTE: the "Export" control in the income-statement page header
	// (`income-statement-page-header.tsx`) is rendered with NO click handler
	// attached, a recorded pre-existing defect carried over verbatim from the
	// legacy financials route tree. It must never be clicked here, nor asserted
	// as functional: that would turn a known-dead control into a passing claim
	// that it works. The cash-flow Export is wired (66.2-39 VD-54) and is
	// exercised by the describe block below.
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
 * Cash-flow CSV export (66.2-39 UI-SPEC VD-54).
 *
 * The Export button downloads the cached `financialQueries.cashFlow` data
 * through the view the page renders (`cash-flow-csv.ts`), so the file's totals
 * must equal the stat tiles on screen, whatever the owner's data is. Nothing is
 * seeded: the comparison is page against file.
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

test.describe("Cash flow export (66.2-39 VD-54)", () => {
	test("downloads the figures on screen as tenantflow-cash-flow-<start>-to-<end>.csv", async ({
		page,
	}) => {
		await gotoReport(page, ROUTES.REPORTS_CASH_FLOW, "Cash Flow");
		const exportButton = await settledExportButton(page);

		const onScreen = {
			"Total Inflows": await statAmount(page, "Total Inflows"),
			"Total Outflows": await statAmount(page, "Total Outflows"),
			"Net Cash Flow": await statAmount(page, "Net Cash Flow"),
		};

		const downloadEvent = page.waitForEvent("download");
		await exportButton.click();
		const download = await downloadEvent;

		const name = download.suggestedFilename();
		const dates = CASH_FLOW_FILENAME.exec(name);
		expect(dates, `filename ${name}`).not.toBeNull();
		const [, startDate, endDate] = dates ?? [];
		expect(startDate && endDate && startDate <= endDate).toBe(true);

		const rows = parseCsv(await readFile(await download.path(), "utf8"));
		const [header, ...body] = rows;
		expect(header?.join(",")).toBe(CASH_FLOW_CSV_HEADER);
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
	});
});

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
