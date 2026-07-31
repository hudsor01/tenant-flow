import { expect, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";
import { ROUTES } from "./constants/routes";

/**
 * Reporting hub route smoke (Phase 56 — RPTHUB-04).
 *
 * THIS SPEC IS THE RPTHUB-04 GATE. Plan 56-07 deletes the entire legacy
 * `src/app/(owner)/financials/` tree, and it is permitted to do so ONLY because
 * the replacement `/reports/*` routes were proven to render first. Until these
 * tests are green, no legacy financial route may be removed.
 *
 * PLACEMENT IS LOAD-BEARING. This file sits at the ROOT of `tests/e2e/tests/`,
 * not under `tests/e2e/tests/owner/`. Any path carrying an `owner/` segment is
 * claimed by the `owner` Playwright project's testMatch glob, and CI never
 * invokes that project — a spec placed there reports coverage it does not
 * provide, which is already true of `owner/owner-financials.e2e.spec.ts` and
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
 * COVERAGE BUDGET: the config runs with `maxFailures: 1`, `retries: 2`,
 * `workers: 2` and `timeout: 30_000` under a 15-minute job, so every test does
 * exactly three things — navigate, prove it did not land on `/login`, prove the
 * page's `<h1>` rendered. No value assertions: an owner fixture with no ledger
 * data legitimately renders `$0.00`, and asserting on figures would be flaky.
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

	// NOTE: the "Export" controls in the income-statement and cash-flow page
	// headers (`income-statement-page-header.tsx:59`, `cash-flow-header.tsx:58`)
	// are rendered with NO click handler attached. That is a recorded
	// pre-existing defect carried over verbatim from the legacy `/financials`
	// tree, not this phase's to repair — so they must never be clicked here, nor
	// asserted as functional. Doing either would turn a known-dead control into
	// a passing claim that it works.
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
