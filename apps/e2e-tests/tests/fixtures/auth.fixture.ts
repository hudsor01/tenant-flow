import { test as base, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Worker-scoped authentication fixture for parallel test execution
 *
 * This fixture provides isolated authentication contexts per worker,
 * enabling safe parallel test execution without auth state conflicts.
 *
 * @see https://playwright.dev/docs/test-fixtures#worker-scoped-fixtures
 * @see https://playwright.dev/docs/test-parallel#worker-processes
 *
 * Usage:
 * ```typescript
 * import { test } from './fixtures/auth.fixture'
 *
 * test('my test', async ({ authenticatedPage }) => {
 *   // Page is already authenticated
 *   await authenticatedPage.goto('/')
 * })
 * ```
 */

export type AuthFixtures = {
	/**
	 * Page fixture with pre-loaded authentication state
	 * Scoped to worker for parallel isolation
	 */
	authenticatedPage: Page
}
export const test = base.extend<AuthFixtures>({
	authenticatedPage: [
		async ({ browser }, use: (page: Page) => Promise<void>) => {
			// Get worker-specific auth file
			// In multi-worker scenarios, each worker could use a different account
			// For now, all workers use the same owner account
			const authFile = path.join(__dirname, '../../playwright/.auth/owner.json')

			// Create isolated browser context with auth state
			const context = await browser.newContext({
				storageState: authFile
			})

			// Create page in authenticated context
			const page = await context.newPage()

			// Provide page to test
			await use(page)

			// Cleanup: Close page and context after test
			await page.close()
			await context.close()
		},
		{ scope: 'worker' }
	]
})

/**
 * Alternative fixture for multiple role support
 * Uncomment and adapt when tenant role tests are needed
 */
/*
export const multiRoleTest = base.extend<Record<string, never>, AuthFixtures & {
	tenantPage: Page
}>({
	authenticatedPage: [
		async ({ browser }, use) => {
			const ownerAuthFile = path.join(__dirname, '../../playwright/.auth/owner.json')
			const context = await browser.newContext({ storageState: ownerAuthFile })
			const page = await context.newPage()
			await use(page)
			await page.close()
			await context.close()
		},
		{ scope: 'worker' },
	],
	tenantPage: [
		async ({ browser }, use) => {
			const tenantAuthFile = path.join(__dirname, '../../playwright/.auth/tenant.json')
			const context = await browser.newContext({ storageState: tenantAuthFile })
			const page = await context.newPage()
			await use(page)
			await page.close()
			await context.close()
		},
		{ scope: 'worker' },
	],
})
*/
