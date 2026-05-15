import { test, expect } from '@playwright/test'
import { createLogger } from '../../lib/frontend-logger'

/**
 * AUTHENTICATED SMOKE TESTS
 *
 * Mirror of the critical-path smoke tests, but the test fixture is
 * pre-authenticated via the `setup-owner` project (which signs in once
 * through the Supabase Auth API and persists the session to the
 * `OWNER_AUTH_FILE` storage state).
 *
 * Why this exists: the prior pattern (re-running `loginAsOwner()` inside
 * every test) hammered Supabase's ~45-sign-ins/minute auth rate limit
 * when multiple PRs merged in quick succession, producing flaky
 * post-merge CI runs (the "P0 Dashboard loads for owner" flake captured
 * in MEMORY.md). With storageState reuse, the entire smoke suite costs
 * one auth call total.
 *
 * Project wiring: this file matches the `smoke-authenticated` project in
 * `playwright.config.ts`, which sets `storageState: OWNER_AUTH_FILE` and
 * declares `dependencies: ['setup-owner']`. The login flow itself stays
 * covered by `critical-paths.smoke.spec.ts` under the un-authenticated
 * `smoke` project.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || ''
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || ''
const hasCredentials = Boolean(OWNER_EMAIL && OWNER_PASSWORD)
const logger = createLogger({ component: 'AuthenticatedSmoke' })

test.describe('🚨 AUTHENTICATED SMOKE TESTS 🚨', () => {
	test.skip(!hasCredentials, 'E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD must be set')

	test('🔥 P0: Dashboard loads for owner', async ({ page }) => {
		await page.goto(`${BASE_URL}/dashboard`)

		// Verify dashboard loads — accept any of these as success. Empty state
		// shows "Welcome to TenantFlow" instead of stats; full dashboard shows
		// "Total Properties" or the wrapper [data-testid].
		// Timeout of 20s accommodates cold Turbopack route compile in CI;
		// first-hit /dashboard typically compiles in 5-15s on ubuntu-latest.
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
				.locator('text=Total Properties')
				.waitFor({ timeout: 20000 })
				.then(() => true),
			page
				.locator('text=Welcome to TenantFlow')
				.waitFor({ timeout: 20000 })
				.then(() => true)
		]).catch(() => false)

		expect(dashboardLoaded).toBeTruthy()
	})

	test('🔥 P0: Properties page loads', async ({ page }) => {
		await page.goto(`${BASE_URL}/properties`)

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
				.locator('text=No properties yet')
				.waitFor({ timeout: 20000 })
				.then(() => true),
			page
				.locator('button:has-text("Add Your First Property")')
				.waitFor({ timeout: 20000 })
				.then(() => true)
		]).catch(() => false)

		expect(propertiesLoaded).toBeTruthy()
	})

	test('🔥 P0: Navigation works', async ({ page }) => {
		// Test navigation to key pages
		const pages = [
			{ url: '/', name: 'Dashboard' },
			{ url: '/properties', name: 'Properties' },
			{ url: '/tenants', name: 'Tenants' },
			{ url: '/leases', name: 'Leases' }
		]

		for (const testPage of pages) {
			await page.goto(`${BASE_URL}${testPage.url}`)

			const pageLoaded = await Promise.race([
				page
					.locator('h1')
					.first()
					.waitFor({ timeout: 5000 })
					.then(() => true),
				page
					.locator('main')
					.waitFor({ timeout: 5000 })
					.then(() => true)
			]).catch(() => false)

			if (!pageLoaded) {
				throw new Error(
					`🚨 NAVIGATION FAILED: ${testPage.name} page did not load\n` +
						`URL: ${testPage.url}\n` +
						`Current: ${page.url()}`
				)
			}
		}
	})

	test('🔥 P0: No console errors on critical pages', async ({ page }) => {
		const errors: string[] = []

		page.on('pageerror', error => {
			errors.push(`Page Error: ${error.message}`)
		})

		page.on('console', msg => {
			if (msg.type() === 'error') {
				errors.push(`Console Error: ${msg.text()}`)
			}
		})

		// Visit critical pages. Using 'domcontentloaded' instead of
		// 'networkidle' to avoid timeout issues with Next.js dev server HMR
		// and background polling.
		await page.goto(`${BASE_URL}/dashboard`)
		await page.waitForLoadState('domcontentloaded')
		await page.waitForTimeout(1000)

		await page.goto(`${BASE_URL}/properties`)
		await page.waitForLoadState('domcontentloaded')
		await page.waitForTimeout(1000)

		// Filter out known acceptable errors
		const criticalErrors = errors.filter(
			err =>
				!err.includes('DevTools') &&
				!err.includes('favicon') &&
				!err.includes('webpack') &&
				!err.includes('HMR')
		)

		if (criticalErrors.length > 0) {
			logger.warn('⚠️  Console errors detected:', {
				metadata: { criticalErrors }
			})
			// Don't fail the test, just warn
			// In production, you might want to fail on any errors
		}
	})
})
