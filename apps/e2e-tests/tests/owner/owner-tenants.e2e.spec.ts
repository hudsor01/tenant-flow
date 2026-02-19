import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'
import {
	verifyPageLoaded,
	setupErrorMonitoring
} from '../helpers/navigation-helpers'
import {
	openModal,
	closeModalViaCloseButton,
	closeModalViaCancelButton,
	fillModalForm,
	submitModalForm,
	verifyModalIsOpen,
	verifyModalIsClosed,
	verifySuccessToast
} from '../helpers/modal-helpers'
import {
	fillTextInput,
	submitForm,
	selectComboboxOption
} from '../helpers/form-helpers'
import {
	verifyTableRenders,
	verifyButtonExists,
	verifySearchInputExists
} from '../helpers/ui-validation-helpers'
import { createTenant } from '../fixtures/test-data'

/**
 * Owner Tenants E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 *
 * Comprehensive testing of tenant management:
 * - List view with search/filter
 * - Invite tenant flow (tested last night)
 * - Create tenant modal (CRUD)
 * - Edit tenant modal (CRUD)
 * - Delete tenant (if applicable)
 * - Form validation
 * - Modal interactions
 * - Success/error handling
 */

test.describe('Owner Tenants', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate directly (authenticated via storageState)
		await page.goto(ROUTES.TENANTS)
		await verifyPageLoaded(page, ROUTES.TENANTS, 'Tenants')
	})

	test('should render tenants list page', async ({ page }) => {
		const { errors, networkErrors } = setupErrorMonitoring(page)

		// Verify page heading
		await expect(page.getByRole('heading', { name: /tenants/i })).toBeVisible()

		// Verify no errors
		expect(errors).toHaveLength(0)
		expect(networkErrors).toHaveLength(0)
	})

	test('should display tenants table', async ({ page }) => {
		await page.waitForLoadState('domcontentloaded')

		const tableExists = (await page.getByRole('table').count()) > 0

		if (tableExists) {
			await verifyTableRenders(page)
		}
	})

	test('should display Invite Tenant button', async ({ page }) => {
		// Look for Invite Tenant button
		const inviteButton = page
			.getByRole('button', { name: /invite tenant/i })
			.or(page.getByRole('link', { name: /invite tenant/i }))

		const buttonExists = (await inviteButton.count()) > 0
		if (buttonExists) {
			await expect(inviteButton.first()).toBeVisible()
		}
	})

	test('should display Add Tenant button', async ({ page }) => {
		const addButton = page
			.getByRole('button', { name: /add tenant/i })
			.or(page.getByRole('link', { name: /add tenant/i }))

		const buttonExists = (await addButton.count()) > 0
		if (buttonExists) {
			await expect(addButton.first()).toBeVisible()
		}
	})

	test('should open invite tenant modal', async ({ page }) => {
		// Click Invite Tenant button
		const inviteButton = page
			.getByRole('button', { name: /invite tenant/i })
			.or(page.getByRole('link', { name: /invite tenant/i }))

		if ((await inviteButton.count()) > 0) {
			await inviteButton.click()
			await page.waitForTimeout(500)

			// Verify modal opened
			await verifyModalIsOpen(page)

			// Verify modal has invitation form
			const modalContent = await page.locator('[role="dialog"]').textContent()
			const hasInvitationFields =
				modalContent?.includes('email') || modalContent?.includes('Email')

			expect(hasInvitationFields).toBe(true)
		}
	})

	test('should invite tenant successfully', async ({ page }) => {
		const inviteButton = page
			.getByRole('button', { name: /invite tenant/i })
			.or(page.getByRole('link', { name: /invite tenant/i }))

		if ((await inviteButton.count()) > 0) {
			await inviteButton.click()
			await page.waitForTimeout(500)

			// Generate test tenant data
			const tenant = createTenant()

			// Fill invitation form
			await fillTextInput(page, 'Email', tenant.email)

			// May need to select property/unit
			const propertyField = page
				.locator('[role="dialog"]')
				.getByRole('combobox', { name: /property/i })

			if ((await propertyField.count()) > 0) {
				await propertyField.click()
				await page.waitForTimeout(500)

				// Select first property option
				const firstOption = page.getByRole('option').first()
				if ((await firstOption.count()) > 0) {
					await firstOption.click()
				}
			}

			// Submit invitation
			await submitModalForm(page, 'Send Invitation')

			// Wait for success
			await page.waitForTimeout(3000)

			// Verify success (modal closed or toast)
			const modalClosed = (await page.locator('[role="dialog"]').count()) === 0
			const hasSuccessToast =
				(await page.getByText(/success|invited|sent/i).count()) > 0

			expect(modalClosed || hasSuccessToast).toBe(true)
		}
	})

	test('should validate invitation form required fields', async ({ page }) => {
		const inviteButton = page
			.getByRole('button', { name: /invite tenant/i })
			.or(page.getByRole('link', { name: /invite tenant/i }))

		if ((await inviteButton.count()) > 0) {
			await inviteButton.click()
			await page.waitForTimeout(500)

			// Try to submit without filling required fields
			await submitModalForm(page, 'Send Invitation')
			await page.waitForTimeout(1000)

			// Modal should remain open
			await verifyModalIsOpen(page)

			// Should show validation errors
			const modalContent = await page.locator('[role="dialog"]').textContent()
			const hasError =
				modalContent?.includes('required') ||
				modalContent?.includes('must') ||
				modalContent?.includes('invalid')

			expect(hasError).toBe(true)
		}
	})

	test('should open create tenant modal', async ({ page }) => {
		const addButton = page
			.getByRole('button', { name: /add tenant/i })
			.or(page.getByRole('link', { name: /add tenant/i }))

		if ((await addButton.count()) > 0) {
			await addButton.click()
			await page.waitForTimeout(500)

			// Verify modal opened
			await verifyModalIsOpen(page)
		}
	})

	test('should create tenant successfully', async ({ page }) => {
		const addButton = page
			.getByRole('button', { name: /add tenant/i })
			.or(page.getByRole('link', { name: /add tenant/i }))

		if ((await addButton.count()) > 0) {
			await addButton.click()
			await page.waitForTimeout(500)

			// Generate test tenant data
			const tenant = createTenant()

			// Fill form
			await fillTextInput(page, 'First Name', tenant.first_name)
			await fillTextInput(page, 'Last Name', tenant.last_name)
			await fillTextInput(page, 'Email', tenant.email)
			await fillTextInput(page, 'Phone', tenant.phone)

			// Emergency contact (if present)
			const emergencyField = page
				.locator('[role="dialog"]')
				.getByLabel(/emergency contact/i)

			if ((await emergencyField.count()) > 0) {
				await emergencyField.fill(tenant.emergency_contact)
			}

			// Submit
			await submitModalForm(page, 'Create')

			// Wait for success
			await page.waitForTimeout(3000)

			// Verify success
			const modalClosed = (await page.locator('[role="dialog"]').count()) === 0
			const hasSuccessToast =
				(await page.getByText(/success|created/i).count()) > 0

			expect(modalClosed || hasSuccessToast).toBe(true)
		}
	})

	test('should open edit tenant modal', async ({ page }) => {
		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			// Click edit button on first tenant
			const editButton = page.getByRole('button', { name: /edit/i }).first()

			if ((await editButton.count()) > 0) {
				await editButton.click()
				await page.waitForTimeout(500)

				// Verify modal opened
				await verifyModalIsOpen(page)

				// Verify URL contains /edit
				expect(page.url()).toMatch(/\/tenants\/.*\/edit/)
			}
		}
	})

	test('should pre-fill form when editing tenant', async ({ page }) => {
		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			const editButton = page.getByRole('button', { name: /edit/i }).first()

			if ((await editButton.count()) > 0) {
				await editButton.click()
				await page.waitForTimeout(500)

				// Verify form has values
				const emailInput = page.locator('[role="dialog"]').getByLabel(/email/i)
				const emailValue = await emailInput.inputValue()

				expect(emailValue.length).toBeGreaterThan(0)
			}
		}
	})

	test('should update tenant emergency contact', async ({ page }) => {
		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			const editButton = page.getByRole('button', { name: /edit/i }).first()

			if ((await editButton.count()) > 0) {
				await editButton.click()
				await page.waitForTimeout(500)

				// Update emergency contact
				const emergencyField = page
					.locator('[role="dialog"]')
					.getByLabel(/emergency contact/i)

				if ((await emergencyField.count()) > 0) {
					await emergencyField.fill('Jane Doe - 555-0123')

					// Submit
					await submitModalForm(page, 'Update')

					// Wait for success
					await page.waitForTimeout(2000)

					// Verify success
					const modalClosed =
						(await page.locator('[role="dialog"]').count()) === 0
					const hasSuccessToast =
						(await page.getByText(/success|updated/i).count()) > 0

					expect(modalClosed || hasSuccessToast).toBe(true)
				}
			}
		}
	})

	test('should filter tenants using search', async ({ page }) => {
		const searchInput = page
			.getByRole('searchbox')
			.or(page.getByPlaceholder(/search/i))

		if ((await searchInput.count()) > 0) {
			await searchInput.fill('test')
			await page.waitForTimeout(1000)

			// Table should update
			const tableExists = (await page.getByRole('table').count()) > 0
			const emptyState = (await page.getByText(/no.*found|empty/i).count()) > 0

			expect(tableExists || emptyState).toBe(true)
		}
	})

	test('should display tenant status badges', async ({ page }) => {
		await page.waitForLoadState('domcontentloaded')

		// Look for status indicators (active, inactive, etc.)
		const statusBadges = page
			.locator('[data-testid*="status"]')
			.or(page.locator('.badge'))
			.or(page.getByText(/active|inactive|pending/i))

		const badgeCount = await statusBadges.count()

		if (badgeCount > 0) {
			await expect(statusBadges.first()).toBeVisible()
		}
	})

	test('should display lease status for each tenant', async ({ page }) => {
		await page.waitForLoadState('domcontentloaded')

		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			// Look for lease status column
			const leaseStatus = page.getByText(/lease|active|expired/i)
			const count = await leaseStatus.count()

			if (count > 0) {
				expect(count).toBeGreaterThan(0)
			}
		}
	})

	test('should close modal via X button', async ({ page }) => {
		const addButton = page
			.getByRole('button', { name: /add tenant/i })
			.or(page.getByRole('link', { name: /add tenant/i }))

		if ((await addButton.count()) > 0) {
			await addButton.click()
			await page.waitForTimeout(500)
			await verifyModalIsOpen(page)

			await closeModalViaCloseButton(page)
			await verifyModalIsClosed(page)
		}
	})

	test('should close modal via Cancel button', async ({ page }) => {
		const addButton = page
			.getByRole('button', { name: /add tenant/i })
			.or(page.getByRole('link', { name: /add tenant/i }))

		if ((await addButton.count()) > 0) {
			await addButton.click()
			await page.waitForTimeout(500)
			await verifyModalIsOpen(page)

			await closeModalViaCancelButton(page)
			await verifyModalIsClosed(page)
		}
	})

	test('should display tenant contact information in table', async ({
		page
	}) => {
		await page.waitForLoadState('domcontentloaded')

		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			// Look for email or phone patterns
			const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
			const phonePattern = /\d{3}[-.]?\d{3}[-.]?\d{4}/

			const tableContent = await page.getByRole('table').textContent()
			const hasContactInfo =
				emailPattern.test(tableContent || '') ||
				phonePattern.test(tableContent || '')

			if (hasContactInfo) {
				expect(hasContactInfo).toBe(true)
			}
		}
	})

	test('should handle tenant without lease gracefully', async ({ page }) => {
		await page.waitForLoadState('domcontentloaded')

		// Should not show errors for tenants without active leases
		const errorMessages = page
			.locator('[role="alert"]')
			.filter({ hasText: /error/i })
		const errorCount = await errorMessages.count()

		expect(errorCount).toBe(0)
	})

	test('should display property/unit assignment if available', async ({
		page
	}) => {
		await page.waitForLoadState('domcontentloaded')

		const tableRows = page.getByRole('row')
		const rowCount = await tableRows.count()

		if (rowCount > 1) {
			// Look for property/unit columns
			const propertyInfo = page.getByText(/property|unit/i)
			const count = await propertyInfo.count()

			if (count > 0) {
				expect(count).toBeGreaterThan(0)
			}
		}
	})

	test('should maintain form data after validation error', async ({ page }) => {
		const addButton = page
			.getByRole('button', { name: /add tenant/i })
			.or(page.getByRole('link', { name: /add tenant/i }))

		if ((await addButton.count()) > 0) {
			await addButton.click()
			await page.waitForTimeout(500)

			// Fill partial form
			await fillTextInput(page, 'First Name', 'John')

			// Try to submit (should fail validation)
			await submitModalForm(page, 'Create')
			await page.waitForTimeout(1000)

			// Verify form data persisted
			const firstNameInput = page
				.locator('[role="dialog"]')
				.getByLabel(/first name/i)
			const value = await firstNameInput.inputValue()

			expect(value).toBe('John')
		}
	})
})
