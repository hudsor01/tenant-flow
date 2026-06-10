import { expect, test } from "@playwright/test";

/**
 * Admin blog-review gate + approve surface (Phase 12, BLOG-07).
 *
 * Test A (always runs when an owner synthetic account is configured):
 *   A non-admin authenticated owner that navigates to /admin/blog is
 *   redirected away by the (admin) route-group layout (is_admin() wall,
 *   the second of three defense-in-depth layers — proxy.ts, this layout,
 *   DB-level is_admin() in RPCs). Asserting the redirect is the regression
 *   guard for threat T-12-10 (Elevation of Privilege). The (admin) layout
 *   sends non-admins to /dashboard, so we assert the URL is NOT /admin/blog.
 *
 * Test B (admin sees + approves an in-review draft):
 *   Gated behind E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. No admin synthetic
 *   account is wired into CI (the only is_admin account, e2e-admin@tenantflow.app,
 *   has subscription_status='expired' and no credentials in .env.local / CI
 *   secrets), so this is documented-skipped rather than inventing credentials.
 *   When credentials ARE present it asserts the review surface (heading +
 *   Approve/Reject controls) so an admin can reach and act on in-review drafts.
 *
 * Login mirrors admin-analytics.spec.ts (UI login via the /login form) so
 * this spec reuses the established e2e auth pattern and adds no new CI secrets.
 */

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;

test.describe("admin blog review - non-admin redirect", () => {
	test.skip(
		!ownerEmail || !ownerPassword,
		"E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set",
	);

	test("non-admin owner is redirected away from /admin/blog", async ({
		page,
	}) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill(ownerEmail!);
		await page.getByLabel("Password").fill(ownerPassword!);
		await page.getByRole("button", { name: /sign in/i }).click();
		await page.waitForURL(/\/dashboard/);

		await page.goto("/admin/blog");

		// The (admin) layout redirects non-admins to /dashboard (and
		// unauthenticated users to /login). Either way the owner must NOT
		// land on the admin review surface. Wait for the redirect to settle,
		// then assert the URL is off /admin/blog and the review heading is
		// absent (defense against a soft-render before redirect).
		await page.waitForURL(/\/dashboard|\/login/);
		expect(page.url()).not.toContain("/admin/blog");
		await expect(
			page.getByRole("heading", { name: /blog review/i }),
		).toHaveCount(0);
	});
});

test.describe("admin blog review - admin approve surface", () => {
	test.skip(
		!adminEmail || !adminPassword,
		"E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set (no admin synthetic account in CI; see spec header)",
	);

	test("admin sees the review surface with Approve/Reject controls", async ({
		page,
	}) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill(adminEmail!);
		await page.getByLabel("Password").fill(adminPassword!);
		await page.getByRole("button", { name: /sign in/i }).click();
		await page.waitForURL(/\/dashboard|\/admin/);

		await page.goto("/admin/blog");

		// The "Blog Review" heading renders whether or not there are drafts —
		// it is outside the empty-state branch — so it is a stable surface
		// assertion that the admin reached the gated page.
		await expect(
			page.getByRole("heading", { name: /blog review/i }),
		).toBeVisible();

		// If Phase 11 seeded an in-review draft, the Approve/Reject controls
		// render and we assert the admin can act on it. If the review queue is
		// empty (no seeded draft on this environment) the page shows the
		// "No drafts to review" empty state instead — a valid surface state we
		// do not mutate prod data to force. Branch on the empty-state marker.
		const emptyState = page.getByText(/no drafts to review/i);
		const hasEmptyState = (await emptyState.count()) > 0;

		if (hasEmptyState) {
			await expect(emptyState).toBeVisible();
		} else {
			await expect(
				page.getByRole("button", { name: /^approve/i }).first(),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: /^reject/i }).first(),
			).toBeVisible();
		}
	});
});
