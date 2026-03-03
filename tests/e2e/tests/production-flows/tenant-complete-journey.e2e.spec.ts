import { test, expect, type Page } from '@playwright/test'
import { loginAsOwner } from '../../auth-helpers'

/**
 * Complete Owner Journey E2E Test
 * Tests that an authenticated owner can access all major sections
 * of the application without errors.
 */

test.describe('Complete Owner Journey - Production Flow', () => {
	const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

	// Helper to wait for page to finish loading (no skeletons)
	async function waitForPageLoad(page: Page) {
		// Wait for any loading skeletons to disappear
		await page.waitForFunction(() => {
			const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="Skeleton"], .animate-pulse')
			return skeletons.length === 0
		}, { timeout: 15000 }).catch(() => {
			// Skeletons might not exist, that's OK
		})

		// Wait a bit more for React to finish rendering
		await page.waitForTimeout(500)
	}

	test('1. Owner: Dashboard loads successfully', async ({ page }) => {
		await loginAsOwner(page)

		// Verify we're on the dashboard (root or /dashboard)
		await expect(page).toHaveURL(/\/(dashboard)?$/)

		await waitForPageLoad(page)

		// Page should have main content loaded
		await expect(page.locator('main, [role="main"]')).toBeVisible()
	})

	test('2. Owner: Properties page loads', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${BASE_URL}/properties`)
		await waitForPageLoad(page)

		// Properties page shows tabs (Overview/Insights) or empty state
		const hasContent = await page.locator('text=/Overview|No properties|Add Your First Property/i').count() > 0
		expect(hasContent).toBeTruthy()

		// Should not be on login page
		expect(page.url()).not.toContain('/login')
	})

	test('3. Owner: Tenants page loads', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${BASE_URL}/tenants`)
		await waitForPageLoad(page)

		// Tenants page should load with content or empty state
		const hasContent = await page.locator('text=/Tenant|No tenants|Invite/i').count() > 0
		expect(hasContent).toBeTruthy()
	})

	test('4. Owner: Leases page loads', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${BASE_URL}/leases`)
		await waitForPageLoad(page)

		// Leases page should load
		const hasContent = await page.locator('text=/Lease|No leases|Create/i').count() > 0
		expect(hasContent).toBeTruthy()
	})

	test('5. Owner: Maintenance page loads', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${BASE_URL}/maintenance`)
		await waitForPageLoad(page)

		// Maintenance page should load
		const hasContent = await page.locator('text=/Maintenance|No requests|Request/i').count() > 0
		expect(hasContent).toBeTruthy()
	})

	test('6. Owner: Analytics section accessible', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${BASE_URL}/analytics`)
		await waitForPageLoad(page)

		// Should load analytics or redirect to sub-page
		expect(page.url()).toContain('analytics')
		expect(page.url()).not.toContain('/login')
	})

	test('7. Owner: Reports page loads', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${BASE_URL}/reports`)
		await waitForPageLoad(page)

		// Reports page should load
		const hasContent = await page.locator('text=/Report|Financial|Summary|No data/i').count() > 0
		expect(hasContent).toBeTruthy()
	})

	test('8. Owner: Settings page loads', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${BASE_URL}/settings`)
		await waitForPageLoad(page)

		// Settings page should load
		const hasContent = await page.locator('text=/Setting|Profile|Account|Preferences/i').count() > 0
		expect(hasContent).toBeTruthy()
	})

	test('9. Owner: All major routes accessible without redirect to login', async ({ page }) => {
		await loginAsOwner(page)

		const routes = [
			'/dashboard',
			'/properties',
			'/tenants',
			'/leases',
			'/maintenance',
			'/settings'
		]

		for (const route of routes) {
			await page.goto(`${BASE_URL}${route}`)
			await waitForPageLoad(page)

			// Should not redirect to login
			expect(page.url()).not.toContain('/login')
		}
	})

	test('10. Owner: Session persists across navigation and refresh', async ({ page }) => {
		await loginAsOwner(page)

		// Navigate multiple times
		await page.goto(`${BASE_URL}/properties`)
		await waitForPageLoad(page)
		expect(page.url()).not.toContain('/login')

		await page.goto(`${BASE_URL}/tenants`)
		await waitForPageLoad(page)
		expect(page.url()).not.toContain('/login')

		await page.goto(`${BASE_URL}/leases`)
		await waitForPageLoad(page)
		expect(page.url()).not.toContain('/login')

		// Refresh page - session should persist
		await page.reload()
		await waitForPageLoad(page)
		expect(page.url()).not.toContain('/login')
	})
})
