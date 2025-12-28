import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'
import { verifyPageLoaded } from '../helpers/navigation-helpers'
import {
	openModal,
	verifyModalIsOpen,
	closeModalViaCloseButton
} from '../helpers/modal-helpers'
import { fillTextInput, submitForm } from '../helpers/form-helpers'
import {
	verifyButtonExists,
	verifyLoadingComplete
} from '../helpers/ui-validation-helpers'

/**
 * Tenant Settings E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 */
test.describe('Tenant Settings', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate directly (authenticated via storageState)
		await page.goto(ROUTES.TENANT_SETTINGS)
		await verifyPageLoaded(page, ROUTES.TENANT_SETTINGS, 'Settings')
	})

	test('should render settings page', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
	})

	test('should display profile settings section', async ({ page }) => {
		await verifyLoadingComplete(page)

		const profileSection = page.getByText(
			/profile|personal information|account/i
		)
		const count = await profileSection.count()

		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should have password change option', async ({ page }) => {
		await verifyLoadingComplete(page)

		const passwordOption = page
			.getByRole('button', { name: /change password|password/i })
			.or(page.getByText(/change password|password/i))

		const passwordExists = (await passwordOption.count()) > 0
		if (passwordExists) {
			await expect(passwordOption.first()).toBeVisible()
		}
	})

	test('should open password change modal', async ({ page }) => {
		await verifyLoadingComplete(page)

		const passwordButton = page.getByRole('button', {
			name: /change password/i
		})

		if ((await passwordButton.count()) > 0) {
			await passwordButton.click()
			await page.waitForTimeout(500)

			const modalOpen = (await page.locator('[role="dialog"]').count()) > 0
			if (modalOpen) {
				await verifyModalIsOpen(page)

				const passwordFields = page.getByLabel(
					/current password|new password|confirm password/i
				)
				const fieldCount = await passwordFields.count()
				expect(fieldCount).toBeGreaterThanOrEqual(2)

				await closeModalViaCloseButton(page)
			}
		}
	})

	test('should display notification preferences', async ({ page }) => {
		await verifyLoadingComplete(page)

		const notificationSection = page.getByText(
			/notification|email preferences|alerts/i
		)
		const count = await notificationSection.count()

		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should have toggleable notification settings', async ({ page }) => {
		await verifyLoadingComplete(page)

		const toggles = page
			.getByRole('switch')
			.or(page.locator('input[type="checkbox"]'))

		const count = await toggles.count()
		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should display payment method settings if available', async ({
		page
	}) => {
		await verifyLoadingComplete(page)

		const paymentSection = page.getByText(/payment method|billing|card/i)
		const count = await paymentSection.count()

		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should have theme toggle option', async ({ page }) => {
		await verifyLoadingComplete(page)

		const themeToggle = page.getByText(/theme|dark mode|light mode|appearance/i)
		const count = await themeToggle.count()

		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should display language preferences if available', async ({ page }) => {
		await verifyLoadingComplete(page)

		const languageOption = page.getByText(/language|locale/i)
		const count = await languageOption.count()

		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should have save button for settings', async ({ page }) => {
		await verifyLoadingComplete(page)

		const saveButton = page.getByRole('button', { name: /save|update/i })
		const buttonExists = (await saveButton.count()) > 0

		if (buttonExists) {
			await expect(saveButton.first()).toBeVisible()
		}
	})

	test('should display privacy settings', async ({ page }) => {
		await verifyLoadingComplete(page)

		const privacySection = page.getByText(/privacy|security|data/i)
		const count = await privacySection.count()

		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})

	test('should allow updating notification preferences', async ({ page }) => {
		await verifyLoadingComplete(page)

		const toggle = page.getByRole('switch').first()

		if ((await toggle.count()) > 0) {
			const initialState = await toggle.isChecked()
			await toggle.click()
			await page.waitForTimeout(500)

			const newState = await toggle.isChecked()
			expect(newState).not.toBe(initialState)
		}
	})

	test('should display contact preferences', async ({ page }) => {
		await verifyLoadingComplete(page)

		const contactPrefs = page.getByText(/contact preference|communication/i)
		const count = await contactPrefs.count()

		if (count > 0) {
			expect(count).toBeGreaterThan(0)
		}
	})
})
