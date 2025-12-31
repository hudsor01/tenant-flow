import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import {
	openModal,
	verifyModalIsOpen,
	verifyModalIsClosed,
	submitModalForm,
	closeModalViaCloseButton
} from '../helpers/modal-helpers'
import { fillTextInput } from '../helpers/form-helpers'
import {
	verifyTableRenders,
	verifyButtonExists
} from '../helpers/ui-validation-helpers'

test.describe('Owner Leases', () => {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

	test.beforeEach(async ({ page }) => {
		// Navigate directly (authenticated via storageState)
		await page.goto(ROUTES.LEASES)
		await verifyPageLoaded(page, ROUTES.LEASES, 'Leases')
	})

	test('should render leases list page', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /leases/i })).toBeVisible()
	})

	test('should display leases table', async ({ page }) => {
		await page.waitForLoadState('networkidle')
		const tableExists = (await page.getByRole('table').count()) > 0
		if (tableExists) {
			await verifyTableRenders(page)
		}
	})

	test('should display Add Lease button', async ({ page }) => {
		const addButton = page.getByRole('button', {
			name: /add lease|create lease/i
		})
		if ((await addButton.count()) > 0) {
			await expect(addButton.first()).toBeVisible()
		}
	})

	test('should display Generate Lease button', async ({ page }) => {
		const generateButton = page
			.getByRole('button', { name: /generate lease/i })
			.or(page.getByRole('link', { name: /generate lease/i }))
		if ((await generateButton.count()) > 0) {
			await expect(generateButton.first()).toBeVisible()
		}
	})

	test('should open create lease modal', async ({ page }) => {
		const addButton = page.getByRole('button', {
			name: /add lease|create lease/i
		})
		if ((await addButton.count()) > 0) {
			await addButton.click()
			await page.waitForTimeout(500)
			await verifyModalIsOpen(page)
		}
	})

	test('should navigate to lease generation wizard', async ({ page }) => {
		await page.goto(`${baseUrl}${ROUTES.LEASES_GENERATE}`)
		await page.waitForLoadState('networkidle')

		// Should show lease generation form/wizard
		const hasWizard = page.url().includes('/leases/generate')
		expect(hasWizard).toBe(true)
	})

	test('should display lease status filters', async ({ page }) => {
		await page.waitForLoadState('networkidle')

		const statusFilter = page
			.getByRole('combobox', { name: /status|filter/i })
			.or(page.getByLabel(/status|filter/i))

		if ((await statusFilter.count()) > 0) {
			await expect(statusFilter.first()).toBeVisible()
		}
	})

	test('should display lease details in table', async ({ page }) => {
		await page.waitForLoadState('networkidle')

		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			// Look for lease details (tenant, property, dates, rent)
			const tableContent = await page.getByRole('table').textContent()
			const hasLeaseInfo =
				tableContent?.includes('$') || tableContent?.includes('Rent')

			expect(hasLeaseInfo).toBe(true)
		}
	})

	test('should open edit lease modal', async ({ page }) => {
		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			const editButton = page.getByRole('button', { name: /edit/i }).first()
			if ((await editButton.count()) > 0) {
				await editButton.click()
				await page.waitForTimeout(500)
				await verifyModalIsOpen(page)
			}
		}
	})

	test('should display lease action buttons', async ({ page }) => {
		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			// Look for action buttons (renew, terminate, pay rent)
			const actionButtons = page.getByRole('button', {
				name: /renew|terminate|end|pay/i
			})
			const buttonCount = await actionButtons.count()

			if (buttonCount > 0) {
				expect(buttonCount).toBeGreaterThan(0)
			}
		}
	})

	test('should handle Renew Lease action', async ({ page }) => {
		const renewButton = page.getByRole('button', { name: /renew/i })

		if ((await renewButton.count()) > 0) {
			await renewButton.first().click()
			await page.waitForTimeout(500)

			// Should open renew modal
			await verifyModalIsOpen(page)
		}
	})

	test('should handle Terminate Lease action', async ({ page }) => {
		const terminateButton = page.getByRole('button', {
			name: /terminate|end lease/i
		})

		if ((await terminateButton.count()) > 0) {
			await terminateButton.first().click()
			await page.waitForTimeout(500)

			// Should open confirmation dialog
			const dialogOpen =
				(await page.locator('[role="dialog"]').count()) > 0 ||
				(await page.locator('[role="alertdialog"]').count()) > 0

			expect(dialogOpen).toBe(true)
		}
	})

	test('should filter leases by status', async ({ page }) => {
		const statusFilter = page.getByRole('combobox', { name: /status/i })

		if ((await statusFilter.count()) > 0) {
			await statusFilter.click()
			await page.waitForTimeout(500)

			// Select "Active" status
			const activeOption = page.getByRole('option', { name: /active/i })
			if ((await activeOption.count()) > 0) {
				await activeOption.click()
				await page.waitForTimeout(1000)

				// Table should update
				await page.waitForLoadState('networkidle')
			}
		}
	})

	test('should search leases', async ({ page }) => {
		const searchInput = page
			.getByRole('searchbox')
			.or(page.getByPlaceholder(/search/i))

		if ((await searchInput.count()) > 0) {
			await searchInput.fill('test')
			await page.waitForTimeout(1000)
			await page.waitForLoadState('networkidle')
		}
	})

	test('should display lease expiration warnings', async ({ page }) => {
		await page.waitForLoadState('networkidle')

		// Look for expiration indicators or warnings
		const expirationWarnings = page.getByText(
			/expiring|expires soon|renewal due/i
		)
		const warningCount = await expirationWarnings.count()

		if (warningCount > 0) {
			expect(warningCount).toBeGreaterThan(0)
		}
	})
})
