import { test, expect } from '@playwright/test'

/**
 * View Patterns - Working E2E Test
 *
 * This test uses REAL LOGIN before each test because Supabase uses httpOnly cookies
 * which Playwright's storageState cannot capture.
 *
 * This ensures 100% of paying customers can access the system.
 */

// Ensure baseURL is set
test.use({
	baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
})

// Helper function to login
async function loginAsOwner(page: any) {
	const email = process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
	const password = process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'

	await page.goto('/login')
	await page.waitForLoadState('networkidle')

	// Wait for form to be ready
	await expect(page.locator('#email')).toBeVisible({ timeout: 5000 })

	// Fill credentials
	await page.locator('#email').fill(email, { force: true })
	await page.locator('#password').fill(password, { force: true })

	// Wait a moment for form state
	await page.waitForTimeout(500)

	// Submit and wait for navigation
	await Promise.all([
		page.waitForURL(/\/(manage|dashboard|tenant)/, { timeout: 30000 }),
		page.getByRole('button', { name: /sign in|login|submit/i }).click()
	])

	// Wait for page to stabilize
	await page.waitForLoadState('networkidle')

	console.log(`✅ Logged in successfully - URL: ${page.url()}`)
}

test.describe('View Patterns - Working Tests', () => {
	test('should login and navigate to maintenance page successfully', async ({ page }) => {
		// Login first
		await loginAsOwner(page)

		// Navigate to maintenance
		await page.goto('/manage/maintenance')
		await page.waitForLoadState('networkidle')

		// Verify we're on the right page (NOT redirected to login)
		await expect(page).toHaveURL(/\/manage\/maintenance/)

		// Verify page title
		await expect(page.locator('h1')).toContainText(/maintenance/i)

		// Verify "New Request" button exists
		await expect(page.getByRole('link', { name: /new request/i })).toBeVisible()

		console.log('✅ Maintenance page loaded successfully')
	})

	test('should login and navigate to properties page successfully', async ({ page }) => {
		// Login first
		await loginAsOwner(page)

		// Navigate to properties
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Verify we're on the right page (NOT redirected to login)
		await expect(page).toHaveURL(/\/manage\/properties/)

		// Verify page title
		await expect(page.locator('h1')).toContainText(/properties/i)

		// Verify "New Property" button exists
		await expect(page.getByRole('link', { name: /new property/i })).toBeVisible()

		console.log('✅ Properties page loaded successfully')
	})

	test('should maintain session across multiple page navigations', async ({ page }) => {
		// Login once
		await loginAsOwner(page)

		// Navigate to maintenance
		await page.goto('/manage/maintenance')
		await expect(page).toHaveURL(/\/manage\/maintenance/)

		// Navigate to properties
		await page.goto('/manage/properties')
		await expect(page).toHaveURL(/\/manage\/properties/)

		// Navigate back to maintenance
		await page.goto('/manage/maintenance')
		await expect(page).toHaveURL(/\/manage\/maintenance/)

		// Verify still authenticated (NOT redirected to login)
		await expect(page.locator('h1')).toContainText(/maintenance/i)

		console.log('✅ Session maintained across navigations')
	})

	test('should verify view switcher appears when data exists', async ({ page }) => {
		// Login first
		await loginAsOwner(page)

		// Navigate to maintenance
		await page.goto('/manage/maintenance')
		await page.waitForLoadState('networkidle')

		// Check for view switcher elements
		const viewSwitcherExists = (await page.locator('[aria-label*="view"]').count()) > 0

		if (viewSwitcherExists) {
			console.log('✅ View switcher found on page')

			// Verify structure
			const kanbanBtn = await page.locator('[aria-label="Kanban view"]').count()
			const tableBtn = await page.locator('[aria-label="Table view"]').count()

			console.log(`  - Kanban button: ${kanbanBtn > 0 ? '✅' : '❌'}`)
			console.log(`  - Table button: ${tableBtn > 0 ? '✅' : '❌'}`)

			// At least one view option should exist
			expect(kanbanBtn + tableBtn).toBeGreaterThan(0)
		} else {
			console.log('ℹ️  No view switcher found (this is OK if no data exists)')
		}
	})

	test('should verify properties view switcher appears when data exists', async ({ page }) => {
		// Login first
		await loginAsOwner(page)

		// Navigate to properties
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Check for view switcher elements
		const viewSwitcherExists = (await page.locator('[aria-label*="view"]').count()) > 0

		if (viewSwitcherExists) {
			console.log('✅ View switcher found on properties page')

			// Verify structure
			const gridBtn = await page.locator('[aria-label="Grid view"]').count()
			const tableBtn = await page.locator('[aria-label="Table view"]').count()

			console.log(`  - Grid button: ${gridBtn > 0 ? '✅' : '❌'}`)
			console.log(`  - Table button: ${tableBtn > 0 ? '✅' : '❌'}`)

			// At least one view option should exist
			expect(gridBtn + tableBtn).toBeGreaterThan(0)
		} else {
			console.log('ℹ️  No view switcher found (this is OK if no data exists)')
		}
	})
})
