import { expect, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";

/**
 * Notification stack E2E smoke (Phase 52 — NOTIF-02/03 + HONEST-01/02).
 *
 * Runs under the `owner-axe` Playwright project (registered via that project's
 * `testMatch` in playwright.config.ts), which CI invokes with
 * `--project=owner-axe` in the `e2e-smoke` job. Authentication is performed
 * in-test by `loginAsOwner` (NO storageState) — the same pattern as
 * dashboard-smoke.e2e.spec.ts, which injects the `@supabase/ssr` session as
 * cookies onto each fresh per-test context before the first navigation. A smoke
 * that only matched the storageState `chromium` project would pass locally but
 * never gate the PR, because CI e2e-smoke does not run the `chromium` project.
 *
 * Coverage (the whole notification stack end-to-end):
 *   1. The header bell opens the popover (Mark-all-read control + View-all link).
 *   2. Mark-all-read clears the unread badge — gated on unread presence so a
 *      fresh owner with 0 unread stays stable (no brittle badge wait).
 *   3. /notifications renders the full inbox (h1 "Notifications").
 *   4. Settings > Notifications advertises no SMS and no push channel
 *      (HONEST-01/02 channel-honesty regression pin).
 */

/**
 * The header bell. Its aria-label is "Notifications" at 0 unread and
 * "Notifications, {n} unread" when unread > 0, so an anchored regex matches
 * both without colliding with any "Notifications settings" control.
 */
function bell(page: Page) {
	return page.getByRole("button", { name: /^Notifications(?:,|$)/ });
}

/** Authenticate in-test and wait for the header bell island to mount. */
async function gotoAuthedDashboard(page: Page): Promise<void> {
	await loginAsOwner(page);
	await expect(bell(page)).toBeVisible({ timeout: 15000 });
}

test.describe("Notification center smoke (Phase 52)", () => {
	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});

	test("bell opens the notification popover", async ({ page }) => {
		await bell(page).click();
		// The popover header carries the Mark-all-read control and the footer the
		// View-all link — both are unique to the open popover.
		await expect(
			page.getByRole("button", { name: "Mark all read" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "View all notifications" }),
		).toBeVisible();
	});

	test("mark-all-read clears the unread badge when unread present", async ({
		page,
	}) => {
		const bellButton = bell(page);
		const label = (await bellButton.getAttribute("aria-label")) ?? "";
		const hasUnread = /\d+\s+unread/.test(label);
		// Fresh synthetic owner may have 0 unread — nothing to clear, keep stable.
		test.skip(!hasUnread, "owner has 0 unread — no badge to clear");

		await bellButton.click();
		await page.getByRole("button", { name: "Mark all read" }).click();
		// After the mutation + the 60s HEAD unread-count refetch invalidation, the
		// badge is hidden at 0 and the aria-label drops the "N unread" suffix.
		await expect(bellButton).toHaveAccessibleName("Notifications");
	});

	test("/notifications renders the full inbox", async ({ page }) => {
		await bell(page).click();
		await page.getByRole("link", { name: "View all notifications" }).click();
		await expect(page).toHaveURL(/\/notifications$/);
		await expect(
			page.getByRole("heading", { level: 1, name: "Notifications" }),
		).toBeVisible();
	});

	test("Settings notifications shows no SMS and no push channel (HONEST-01/02)", async ({
		page,
	}) => {
		await page.goto("/settings?tab=notifications");
		const panel = page.getByRole("tabpanel");
		// Positive control: the honest Email channel is present.
		await expect(panel.getByText("Email Notifications")).toBeVisible();
		// HONEST-01/02: neither a SMS channel nor a browser-push channel is offered.
		await expect(panel.getByText(/sms/i)).toHaveCount(0);
		await expect(panel.getByText(/push/i)).toHaveCount(0);
	});
});
