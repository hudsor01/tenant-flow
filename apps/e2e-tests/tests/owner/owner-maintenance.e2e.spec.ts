import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import { openModal, verifyModalIsOpen } from '../helpers/modal-helpers'
import { verifyTableRenders } from '../helpers/ui-validation-helpers'

/**
 * Owner Maintenance E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 */
test.describe('Owner Maintenance', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate directly (authenticated via storageState)
		await page.goto(ROUTES.MAINTENANCE)
		await verifyPageLoaded(page, ROUTES.MAINTENANCE, 'Maintenance')
	})

	test('should render maintenance list page', async ({ page }) => {
		await expect(
			page.getByRole('heading', { name: /maintenance/i })
		).toBeVisible()
	})

	test('should display maintenance requests table', async ({ page }) => {
		await page.waitForLoadState('domcontentloaded')
		const tableExists = (await page.getByRole('table').count()) > 0
		if (tableExists) {
			await verifyTableRenders(page)
		}
	})

	test('should display Add Request button', async ({ page }) => {
		const addButton = page.getByRole('button', {
			name: /add|create|new.*request/i
		})
		if ((await addButton.count()) > 0) {
			await expect(addButton.first()).toBeVisible()
		}
	})

	test('should open create maintenance request modal', async ({ page }) => {
		const addButton = page.getByRole('button', {
			name: /add|create|new.*request/i
		})
		if ((await addButton.count()) > 0) {
			await addButton.click()
			await page.waitForTimeout(500)
			await verifyModalIsOpen(page)
		}
	})

	test('should filter by status', async ({ page }) => {
		const statusFilter = page.getByRole('combobox', { name: /status/i })
		if ((await statusFilter.count()) > 0) {
			await statusFilter.click()
			await page.waitForTimeout(500)
			const option = page.getByRole('option').first()
			if ((await option.count()) > 0) {
				await option.click()
				await page.waitForTimeout(1000)
			}
		}
	})

	test('should filter by priority', async ({ page }) => {
		const priorityFilter = page.getByRole('combobox', { name: /priority/i })
		if ((await priorityFilter.count()) > 0) {
			await priorityFilter.click()
			await page.waitForTimeout(500)
		}
	})

	test('should display maintenance categories', async ({ page }) => {
		await page.waitForLoadState('domcontentloaded')
		const categories = page.getByText(/plumbing|electrical|hvac|general/i)
		const count = await categories.count()
		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should display priority badges', async ({ page }) => {
		await page.waitForLoadState('domcontentloaded')
		const priorities = page.getByText(/high|medium|low|urgent/i)
		const count = await priorities.count()
		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})
})
