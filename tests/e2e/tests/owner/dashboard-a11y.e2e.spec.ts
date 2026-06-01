import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAsOwner } from "../../auth-helpers";

/**
 * Dashboard Accessibility + Responsiveness E2E (Phase 6, POLISH-05 / POLISH-06)
 *
 * Runs under the dedicated `owner-axe` Playwright project (NO storageState),
 * which CI invokes via `--project=owner-axe`. Authentication is performed
 * in-test by `loginAsOwner`, which injects the `@supabase/ssr` session as
 * cookies onto the fresh per-test context before the first navigation. The
 * legacy `setup-owner` + storageState project path is intentionally NOT used
 * here. The file is excluded from the storageState-based `owner` / `firefox` /
 * `mobile-chrome` projects via their `testIgnore`.
 *
 * 1. axe-core WCAG 2.1 A/AA assertion (D-02): zero violations across the
 *    ENTIRE /dashboard subtree (D-03 — full-page sweep incl. app-shell chrome,
 *    not just the v2.0-added regions). Served by a local production build; auth
 *    and data still hit the prod Supabase project (no screenshot diffing).
 * 2. 375px page-level zero-horizontal-scroll probe (POLISH-06): body and html
 *    scrollWidth <= viewport + 1. The locked FORCE_GRID_QUERY (max-width:1023px)
 *    in portfolio-data-table.tsx forces the portfolio table into grid mode below
 *    1024px, which satisfies this.
 *
 * Auth/beforeEach: loginAsOwner lands on an authenticated /dashboard, then we
 * mark the onboarding tour completed, reload, and wait for the heading.
 */

const WCAG_2_1_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Shared authed-dashboard navigation used by both the axe sweep and the 375px
 * probe. `loginAsOwner` authenticates via the Supabase token API and injects the
 * session into the browser (landing on /dashboard); we then mark the onboarding
 * tour completed (so its overlay never opens to mask focusable elements from
 * axe) and wait for the dashboard heading to confirm the client-fetched content
 * has resolved past the loading skeleton.
 */
async function gotoAuthedDashboard(page: import("@playwright/test").Page) {
	// loginAsOwner already lands on an authenticated /dashboard, so we only mark
	// the onboarding tour completed and reload — no redundant re-navigation.
	await loginAsOwner(page);
	// Mark the owner onboarding tour completed so its spotlight overlay never
	// auto-opens over the axe sweep. The app reads tour state from the
	// "tenantflow:tour-progress" localStorage key as JSON keyed by tour name
	// (getTourProgress short-circuits on "completed"/"skipped" —
	// src/hooks/api/use-tour-progress.ts).
	await page.evaluate(() => {
		localStorage.setItem(
			"tenantflow:tour-progress",
			JSON.stringify({ "owner-onboarding": "completed" }),
		);
	});
	await page.reload();
	// Wait for a definitive loaded marker (past the skeleton) before sweeping.
	// Tolerate BOTH valid loaded states the rest of the suite treats as
	// non-guaranteed: the populated dashboard renders the exact <h1>Dashboard</h1>
	// (dashboard.tsx), while the zero-data path renders DashboardEmptyState's
	// "Welcome to TenantFlow" (no "Dashboard" heading). The synthetic owner's
	// property/tenant data is not a guaranteed invariant, so hard-coupling to the
	// populated path would time out and fail CI whenever the owner has no data.
	// The exact h1 match still avoids resolving on a loose sub-heading mid-render.
	// Empty-state branch is scoped to the EmptyTitle slot (a <div>, not a heading)
	// so it can't collide with the onboarding tour's "Welcome to TenantFlow"
	// TourTitle text (the tour is already suppressed above; this is belt-and-braces).
	await expect(
		page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }).or(
			page.locator('[data-slot="empty-title"]', {
				hasText: "Welcome to TenantFlow",
			}),
		),
	).toBeVisible({ timeout: 10000 });
}

test.describe("Dashboard accessibility (axe-core)", () => {
	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});

	test("has zero WCAG 2.1 A/AA violations", async ({ page }) => {
		// D-03: full-page sweep over the entire /dashboard subtree (v2.0 regions +
		// older surfaces + app-shell chrome). Every violation inside the dashboard
		// subtree must be fixed inline in its owning file — none are excluded here.
		const results = await new AxeBuilder({ page })
			.withTags(WCAG_2_1_AA_TAGS)
			.analyze();

		expect(results.violations).toEqual([]);
	});
});

test.describe("Dashboard responsiveness (375px)", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});

	test("has zero page-level horizontal scroll at 375px", async ({ page }) => {
		// POLISH-06: page-level zero horizontal scroll. The portfolio table is
		// forced to grid mode below 1024px (locked FORCE_GRID_QUERY), and the
		// virtualized table — if present — lives inside overflow-auto, so any
		// internal scroll does not leak to the page. Allow +1px for sub-pixel
		// rounding (same tolerance as the public mobile-nav-375px probe).
		const overflow = await page.evaluate(() => ({
			bodyScrollWidth: document.body.scrollWidth,
			htmlScrollWidth: document.documentElement.scrollWidth,
			viewport: window.innerWidth,
		}));

		expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
		expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
	});
});
