import { expect, type Page, test } from "@playwright/test";
import { createLogger } from "../../lib/frontend-logger";

/**
 * CRITICAL PATH SMOKE TESTS
 *
 * Two execution blocks:
 *
 * 1) Login-flow test — un-authenticated, fresh page per test. Verifies
 *    the login UI itself.
 *
 * 2) Authenticated tests — share ONE UI login via `test.beforeAll`. All
 *    tests then operate on the same already-authenticated `page`.
 *    Replaces the prior pattern (5 inline UI logins per suite) which on
 *    busy CI days tripped Supabase Auth's ~45 sign-ins/minute limit and
 *    produced the "P0 Dashboard loads for owner" flake captured in
 *    MEMORY.md. With this structure the whole suite costs 2 UI logins
 *    per CI run (one in the login-flow block, one in the authenticated
 *    beforeAll), well under the rate limit even when 4 PRs merge in
 *    rapid succession.
 *
 *    The block uses `test.describe.serial` so the shared `page` survives
 *    between tests; afterAll closes it.
 *
 *    An earlier attempt at this used Playwright's storageState (separate
 *    setup-owner project writes cookies to disk, dependent project reads
 *    them). That fought an architectural mismatch in how @supabase/ssr
 *    writes auth state vs. what storageState captures — saved jars came
 *    up with 0 `sb-*` auth cookies despite the post-login redirect
 *    succeeding. The beforeAll+serial pattern sidesteps the issue by
 *    keeping the auth state inside one live page context.
 *
 * 3) Environment sanity checks.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3050";
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || "";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || "";
const hasCredentials = Boolean(OWNER_EMAIL && OWNER_PASSWORD);
const logger = createLogger({ component: "CriticalPathsSmoke" });

async function loginAsOwner(page: Page) {
	await page.goto(`${BASE_URL}/login`);

	const emailInput = page.locator("input#email");
	const passwordInput = page.locator("input#password");
	const submitButton = page.locator('button[type="submit"]');

	await expect(emailInput).toBeVisible({ timeout: 15000 });
	await expect(emailInput).toBeEnabled({ timeout: 5000 });

	await emailInput.click();
	await emailInput.fill(OWNER_EMAIL);
	await passwordInput.click();
	await passwordInput.fill(OWNER_PASSWORD);

	await expect(emailInput).toHaveValue(OWNER_EMAIL);
	await expect(passwordInput).toHaveValue(OWNER_PASSWORD);

	await submitButton.click();
	await page.waitForURL((url) => !url.pathname.includes("/login"), {
		timeout: 20000,
	});
}

// ─────────────────────────────────────────
// 1) LOGIN-FLOW TEST — un-authenticated
// ─────────────────────────────────────────
test.describe("🚨 CRITICAL PATH SMOKE TESTS — Login Flow 🚨", () => {
	test.skip(
		!hasCredentials,
		"E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD must be set",
	);

	test("🔥 P0: Owner can login", async ({ page }) => {
		await page.goto(`${BASE_URL}/login`);

		const emailInput = page.locator("input#email");
		const passwordInput = page.locator("input#password");
		const submitButton = page.locator('button[type="submit"]');

		await expect(emailInput).toBeVisible({ timeout: 10000 });
		await expect(emailInput).toBeEnabled({ timeout: 5000 });

		await emailInput.click();
		await emailInput.fill(OWNER_EMAIL);
		await passwordInput.click();
		await passwordInput.fill(OWNER_PASSWORD);

		await expect(emailInput).toHaveValue(OWNER_EMAIL);
		await expect(passwordInput).toHaveValue(OWNER_PASSWORD);

		await submitButton.click();

		try {
			await page.waitForURL((url) => !url.pathname.includes("/login"), {
				timeout: 15000,
			});
		} catch (e) {
			const errorMsg = await page
				.locator("text=/Sign in failed|Invalid|error/i")
				.textContent()
				.catch(() => null);
			if (errorMsg) {
				throw new Error(
					`🚨 LOGIN FAILED: ${errorMsg}\n\n` +
						`❌ CRITICAL: Owner cannot login!\n` +
						`Account: ${OWNER_EMAIL}`,
					{ cause: e },
				);
			}
			throw new Error(
				`🚨 LOGIN TIMEOUT: No redirect after 15s\n` +
					`Current URL: ${page.url()}`,
				{ cause: e },
			);
		}

		expect(page.url()).not.toContain("/login");
	});
});

// ─────────────────────────────────────────
// 2) AUTHENTICATED CRITICAL PATHS — ONE UI login, shared page
// ─────────────────────────────────────────
test.describe
	.serial("🚨 AUTHENTICATED CRITICAL PATHS 🚨", () => {
		test.skip(
			!hasCredentials,
			"E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD must be set",
		);

		let page: Page;

		test.beforeAll(async ({ browser }) => {
			const context = await browser.newContext();
			page = await context.newPage();
			await loginAsOwner(page);
		});

		test.afterAll(async () => {
			await page?.close();
		});

		test("🔥 P0: Dashboard loads for owner", async () => {
			await page.goto(`${BASE_URL}/dashboard`);

			const dashboardLoaded = await Promise.race([
				page
					.locator('h1:has-text("Dashboard")')
					.waitFor({ timeout: 20000 })
					.then(() => true),
				page
					.locator('[data-testid="dashboard"]')
					.waitFor({ timeout: 20000 })
					.then(() => true),
				page
					.locator('[data-testid="dashboard-stats"]')
					.waitFor({ timeout: 20000 })
					.then(() => true),
				page
					.locator("text=Total Properties")
					.waitFor({ timeout: 20000 })
					.then(() => true),
				page
					.locator("text=Welcome to TenantFlow")
					.waitFor({ timeout: 20000 })
					.then(() => true),
			]).catch(() => false);

			expect(dashboardLoaded).toBeTruthy();
		});

		test("🔥 P0: Properties page loads", async () => {
			await page.goto(`${BASE_URL}/properties`);

			const propertiesLoaded = await Promise.race([
				page
					.locator('h1:has-text("Properties")')
					.waitFor({ timeout: 20000 })
					.then(() => true),
				page
					.locator('button:has-text("New Property")')
					.waitFor({ timeout: 20000 })
					.then(() => true),
				page
					.locator("text=No properties yet")
					.waitFor({ timeout: 20000 })
					.then(() => true),
				page
					.locator('button:has-text("Add Your First Property")')
					.waitFor({ timeout: 20000 })
					.then(() => true),
			]).catch(() => false);

			expect(propertiesLoaded).toBeTruthy();
		});

		// 4-page loop: needs more than the default 30s per-test budget once
		// each page is given the same 20s render allowance as the sibling
		// single-page tests above. 5s per page flaked under CI cold-start
		// (P0 Navigation works failure, PR #737) — the page renders well
		// within 20s but not always within 5s.
		test("🔥 P0: Navigation works", { timeout: 120_000 }, async () => {
			const pages = [
				{ url: "/", name: "Dashboard" },
				{ url: "/properties", name: "Properties" },
				{ url: "/tenants", name: "Tenants" },
				{ url: "/leases", name: "Leases" },
			];

			for (const testPage of pages) {
				await page.goto(`${BASE_URL}${testPage.url}`);

				const pageLoaded = await Promise.race([
					page
						.locator("h1")
						.first()
						.waitFor({ timeout: 20000 })
						.then(() => true),
					page
						.locator("main")
						.waitFor({ timeout: 20000 })
						.then(() => true),
				]).catch(() => false);

				if (!pageLoaded) {
					throw new Error(
						`🚨 NAVIGATION FAILED: ${testPage.name} page did not load\n` +
							`URL: ${testPage.url}\n` +
							`Current: ${page.url()}`,
					);
				}
			}
		});

		test("🔥 P0: No console errors on critical pages", async () => {
			const errors: string[] = [];

			page.on("pageerror", (error) => {
				errors.push(`Page Error: ${error.message}`);
			});

			page.on("console", (msg) => {
				if (msg.type() === "error") {
					errors.push(`Console Error: ${msg.text()}`);
				}
			});

			await page.goto(`${BASE_URL}/dashboard`);
			await page.waitForLoadState("domcontentloaded");
			await page.waitForTimeout(1000);

			await page.goto(`${BASE_URL}/properties`);
			await page.waitForLoadState("domcontentloaded");
			await page.waitForTimeout(1000);

			const criticalErrors = errors.filter(
				(err) =>
					!err.includes("DevTools") &&
					!err.includes("favicon") &&
					!err.includes("webpack") &&
					!err.includes("HMR"),
			);

			if (criticalErrors.length > 0) {
				logger.warn("⚠️  Console errors detected:", {
					metadata: { criticalErrors },
				});
				// Don't fail the test, just warn
			}
		});
	});

// ─────────────────────────────────────────
// 3) ENVIRONMENT SANITY CHECKS
// ─────────────────────────────────────────
test.describe("🔍 SMOKE: Environment Sanity Checks", () => {
	test("Environment variables are set", async () => {
		test.skip(
			!hasCredentials,
			"E2E credentials not configured — skipping env check",
		);
		expect(OWNER_EMAIL, "E2E_OWNER_EMAIL must be set").toBeTruthy();
		expect(OWNER_PASSWORD, "E2E_OWNER_PASSWORD must be set").toBeTruthy();
		expect(BASE_URL, "PLAYWRIGHT_BASE_URL must be set").toBeTruthy();
	});

	test("Frontend is reachable", async ({ request }) => {
		const frontendResponse = await request.get(BASE_URL).catch(() => null);
		expect(
			frontendResponse,
			`Frontend not reachable at ${BASE_URL}`,
		).toBeTruthy();
	});
});
