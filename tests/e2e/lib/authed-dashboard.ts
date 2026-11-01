import { expect, type Page } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";

/**
 * The authenticated-dashboard landing shared by the owner-axe specs that start
 * on `/dashboard` (`dashboard-a11y.e2e.spec.ts`, `app-shell-sidebar.spec.ts`).
 * Each caller states its own reason for using it; nothing here assumes which
 * probes run afterwards.
 */

/**
 * Waits until no BlurFade `enter` entrance (66.2-27) is still running. The KPI
 * tiles and the portfolio table fade in for up to 480 ms delay + 500 ms after
 * mount, and a probe that reads color or opacity mid-fade (axe color-contrast
 * blends element opacity) would measure a translucent foreground no user sees
 * once the page settles.
 *
 * Under `reducedMotion: "reduce"` the global reduced-motion rule in globals.css
 * runs no entrance at all, so the first poll reads 0 and this returns at once.
 * That is the expected outcome there, not a skipped wait.
 */
export async function waitForEntranceAnimations(page: Page): Promise<void> {
	await expect
		.poll(
			() =>
				page.evaluate(
					() =>
						document
							.getAnimations()
							.filter(
								(a) =>
									a instanceof CSSAnimation &&
									a.animationName === "enter" &&
									a.playState === "running",
							).length,
				),
			{ timeout: 5000 },
		)
		.toBe(0);
}

/**
 * Waits for a definitive loaded marker past the route skeleton. It tolerates
 * BOTH loaded states, because the synthetic owner's property and tenant data is
 * not a guaranteed invariant: the populated dashboard renders the exact
 * `<h1>Dashboard</h1>` (dashboard.tsx), and the zero-data path renders
 * DashboardEmptyState's "Welcome to TenantFlow" in the EmptyTitle slot (a
 * `<div>`, so it cannot collide with the onboarding tour's TourTitle text). The
 * exact h1 match avoids resolving on a loose sub-heading mid-render.
 */
export async function waitForDashboardContent(page: Page): Promise<void> {
	await expect(
		page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }).or(
			page.locator('[data-slot="empty-title"]', {
				hasText: "Welcome to TenantFlow",
			}),
		),
	).toBeVisible({ timeout: 10000 });
}

/**
 * Lands on an authenticated, settled `/dashboard` with the onboarding tour
 * marked completed.
 *
 * `loginAsOwner` authenticates through the Supabase token API, injects the
 * session into the browser and lands on `/dashboard`. The tour is then marked
 * completed in the "tenantflow:tour-progress" localStorage key (JSON keyed by
 * tour name; getTourProgress short-circuits on "completed"/"skipped",
 * src/hooks/api/use-tour-progress.ts), so its spotlight overlay never opens
 * over the page, and the page reloads once. No second navigation is made.
 *
 * It resolves after `waitForDashboardContent` and `waitForEntranceAnimations`.
 */
export async function gotoAuthedDashboard(page: Page): Promise<void> {
	await loginAsOwner(page);
	await page.evaluate(() => {
		localStorage.setItem(
			"tenantflow:tour-progress",
			JSON.stringify({ "owner-onboarding": "completed" }),
		);
	});
	await page.reload();
	await waitForDashboardContent(page);
	await waitForEntranceAnimations(page);
}
