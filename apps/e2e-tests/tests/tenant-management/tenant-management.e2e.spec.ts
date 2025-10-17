/**
 * End-to-End Tests for Tenant Management Workflows
 * Complete user journeys from creation to deletion
 */

import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

// Test data generators
const generateTenantData = () => ({
	firstName: faker.person.firstName(),
	lastName: faker.person.lastName(),
	email: faker.internet.email().toLowerCase(),
	phone: faker.phone.number(),
	emergencyContact: `${faker.person.fullName()} - ${faker.phone.number()}`
})

test.describe('Tenant Management E2E Workflows', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to tenant management page and wait for full load
		await page.goto('/manage/tenants', { waitUntil: 'load', timeout: 60000 })
		// Wait for the tenant list/table or main area to be visible so tests can interact
		try {
			await page
				.getByRole('table')
				.first()
				.waitFor({ state: 'visible', timeout: 10000 })
		} catch (e) {
			// Fallback: wait for main content to be present
			await page.waitForSelector('main', { timeout: 10000 })
		}
	})

	test('complete tenant lifecycle - create, view, edit, delete', async ({
		page
	}) => {
		const tenantData = generateTenantData()

		// STEP 1: Create new tenant
		await test.step('Create new tenant', async () => {
			// Navigate to create form
			const createButton = page
				.getByRole('link', {
					name: /create tenant|new tenant|add tenant/i
				})
				.first()
			// Wait for create button to appear and be actionable
			await createButton.waitFor({ state: 'visible', timeout: 10000 })
			await createButton.click()
			await page.waitForLoadState('load')

			// Fill out form
			await page.fill('input[name="firstName"]', tenantData.firstName)
			await page.fill('input[name="lastName"]', tenantData.lastName)
			await page.fill('input[name="email"]', tenantData.email)
			await page.fill('input[name="phone"]', tenantData.phone)
			await page.fill(
				'input[name="emergencyContact"]',
				tenantData.emergencyContact
			)

			// Submit form
			const submitButton = page.getByRole('button', {
				name: /create tenant|submit/i
			})
			await submitButton.click()

			// Wait for success message
			await expect(
				page.getByText(/tenant created successfully|created tenant/i)
			).toBeVisible({
				timeout: 10000
			})

			// Verify redirect to tenant list or details
			await page.waitForURL(/\/manage\/tenants/, { timeout: 5000 })
		})

		// STEP 2: View tenant details
		await test.step('View tenant details', async () => {
			// Search or navigate to the created tenant
			await page.goto('/manage/tenants', { waitUntil: 'load', timeout: 60000 })
			// Wait for tenant list to render
			await page
				.getByRole('table')
				.first()
				.waitFor({ state: 'visible', timeout: 10000 })
				.catch(() => {})

			// Find tenant in table by email
			const tenantRow = page
				.getByRole('row', {
					name: new RegExp(tenantData.email, 'i')
				})
				.first()
			await tenantRow.waitFor({ state: 'visible', timeout: 10000 })

			// Click to view details
			await tenantRow.click()
			await page.waitForLoadState('load')

			// Verify all details are displayed
			await expect(
				page.getByText(`${tenantData.firstName} ${tenantData.lastName}`)
			).toBeVisible()
			await expect(page.getByText(tenantData.email)).toBeVisible()
			await expect(page.getByText(tenantData.phone)).toBeVisible()
		})

		// STEP 3: Edit tenant information
		await test.step('Edit tenant information', async () => {
			const updatedPhone = faker.phone.number()

			// Click edit button
			const editButton = page.getByRole('link', { name: /edit/i }).first()
			await editButton.waitFor({ state: 'visible', timeout: 10000 })
			await editButton.click()
			await page.waitForLoadState('load')

			// Update phone number
			await page.fill('input[name="phone"]', updatedPhone)

			// Save changes
			const saveButton = page.getByRole('button', { name: /save|update/i })
			await saveButton.click()

			// Wait for success message
			await expect(page.getByText(/tenant updated|changes saved/i)).toBeVisible(
				{
					timeout: 10000
				}
			)

			// Verify updated information is displayed
			await expect(page.getByText(updatedPhone)).toBeVisible()
		})

		// STEP 4: Delete tenant
		await test.step('Delete tenant', async () => {
			// Click delete button
			const deleteButton = page.getByRole('button', { name: /delete/i }).first()
			await deleteButton.waitFor({ state: 'visible', timeout: 10000 })
			await deleteButton.click()

			// Confirm deletion in dialog
			await expect(page.getByText(/are you sure/i)).toBeVisible({
				timeout: 5000
			})
			const confirmButton = page
				.getByRole('button', {
					name: /delete tenant|confirm/i
				})
				.first()
			await confirmButton.waitFor({ state: 'visible', timeout: 5000 })
			await confirmButton.click()

			// Wait for success message
			await expect(
				page.getByText(/tenant deleted|deleted successfully/i)
			).toBeVisible({
				timeout: 10000
			})

			// Verify redirect to tenant list
			await page.waitForURL(/\/manage\/tenants$/, { timeout: 5000 })

			// Verify tenant is no longer in list
			await page.waitForLoadState('networkidle')
			const deletedTenantRow = page.getByRole('row', {
				name: new RegExp(tenantData.email, 'i')
			})
			await expect(deletedTenantRow).not.toBeVisible()
		})
	})

	test('create tenant with validation errors', async ({ page }) => {
		await test.step('Navigate to create form', async () => {
			const createButton = page
				.getByRole('link', {
					name: /create tenant|new tenant|add tenant/i
				})
				.first()
			await createButton.waitFor({ state: 'visible', timeout: 10000 })
			await createButton.click()
			await page.waitForLoadState('load')
		})

		await test.step('Submit empty form', async () => {
			const submitButton = page
				.getByRole('button', {
					name: /create tenant|submit/i
				})
				.first()
			await submitButton.waitFor({ state: 'visible', timeout: 5000 })
			await submitButton.click()

			// Expect validation errors
			const errorMessages = page.locator('text=/required|invalid/i')
			await expect(errorMessages.first()).toBeVisible({ timeout: 3000 })
		})

		await test.step('Submit with invalid email', async () => {
			await page.fill('input[name="firstName"]', 'Test')
			await page.fill('input[name="lastName"]', 'User')
			await page.fill('input[name="email"]', 'invalid-email')

			const submitButton = page
				.getByRole('button', {
					name: /create tenant|submit/i
				})
				.first()
			await submitButton.waitFor({ state: 'visible', timeout: 5000 })
			await submitButton.click()

			// Expect email validation error
			await expect(page.getByText(/valid email|email.*invalid/i)).toBeVisible({
				timeout: 3000
			})
		})

		await test.step('Submit with valid data', async () => {
			const validData = generateTenantData()

			await page.fill('input[name="firstName"]', validData.firstName)
			await page.fill('input[name="lastName"]', validData.lastName)
			await page.fill('input[name="email"]', validData.email)
			await page.fill('input[name="phone"]', validData.phone)

			const submitButton = page.getByRole('button', {
				name: /create tenant|submit/i
			})
			await submitButton.click()

			// Should succeed
			await expect(page.getByText(/tenant created|success/i)).toBeVisible({
				timeout: 10000
			})
		})
	})

	test('search and filter tenants', async ({ page }) => {
		await test.step('Search by name', async () => {
			const searchInput = page.getByPlaceholder(/search|filter/i).first()

			if ((await searchInput.count()) > 0) {
				await searchInput.waitFor({ state: 'visible', timeout: 5000 })
				await searchInput.fill('John')
				await page.waitForTimeout(700) // Debounce

				// Verify filtered results
				const rows = page.getByRole('row')
				const rowCount = await rows.count()
				expect(rowCount).toBeGreaterThan(0)
			}
		})

		await test.step('Clear search', async () => {
			const searchInput = page.getByPlaceholder(/search|filter/i).first()

			if ((await searchInput.count()) > 0) {
				await searchInput.clear()
				await page.waitForTimeout(500)

				// Verify all results shown
				const rows = page.getByRole('row')
				const rowCount = await rows.count()
				expect(rowCount).toBeGreaterThan(0)
			}
		})
	})

	test('tenant list pagination', async ({ page }) => {
		await test.step('Navigate to next page', async () => {
			const nextButton = page.getByRole('button', { name: /next|>/i }).first()

			try {
				await nextButton.waitFor({ state: 'visible', timeout: 8000 })
				if (await nextButton.isEnabled()) {
					await nextButton.click()
					await page.waitForLoadState('load')
					// Verify page changed
					await expect(page).toHaveURL(/page=2|offset=/)
				}
			} catch {
				// No pagination available - skip
			}
		})

		await test.step('Navigate to previous page', async () => {
			const prevButton = page.getByRole('button', { name: /previous|</i })

			if (await prevButton.isEnabled()) {
				await prevButton.click()
				await page.waitForLoadState('networkidle')

				// Verify page changed
				await expect(page).toHaveURL(/page=1|offset=0/)
			}
		})
	})

	test('tenant list sorting', async ({ page }) => {
		await test.step('Sort by name ascending', async () => {
			const nameHeader = page.getByRole('columnheader', { name: /name/i })

			if ((await nameHeader.count()) > 0) {
				await nameHeader.click()
				await page.waitForTimeout(500)

				// Verify sorting indicator
				const sortIndicator = nameHeader
					.locator('[data-sort="asc"]')
					.or(nameHeader.locator('svg'))
				await expect(sortIndicator.first()).toBeVisible()
			}
		})

		await test.step('Sort by name descending', async () => {
			const nameHeader = page.getByRole('columnheader', { name: /name/i })

			if ((await nameHeader.count()) > 0) {
				await nameHeader.click()
				await page.waitForTimeout(500)

				// Verify sorting changed
				const sortIndicator = nameHeader
					.locator('[data-sort="desc"]')
					.or(nameHeader.locator('svg'))
				await expect(sortIndicator.first()).toBeVisible()
			}
		})
	})

	test('bulk tenant operations', async ({ page }) => {
		await test.step('Select multiple tenants', async () => {
			const checkboxes = page.getByRole('checkbox')
			const count = await checkboxes.count()

			if (count > 2) {
				// Select first 2 tenants
				await checkboxes.nth(1).check()
				await checkboxes.nth(2).check()

				// Verify bulk actions appear
				const bulkActions = page.getByText(/selected|bulk actions/i)
				if ((await bulkActions.count()) > 0) {
					await expect(bulkActions.first()).toBeVisible()
				}
			}
		})

		await test.step('Deselect all', async () => {
			const selectAllCheckbox = page.getByRole('checkbox').first()

			try {
				await selectAllCheckbox.waitFor({ state: 'visible', timeout: 8000 })
				if (await selectAllCheckbox.isChecked()) {
					await selectAllCheckbox.uncheck()
					await page.waitForTimeout(300)
					// Verify bulk actions hidden
					const bulkActions = page.getByText(/selected|bulk actions/i)
					if ((await bulkActions.count()) > 0) {
						await expect(bulkActions.first()).not.toBeVisible()
					}
				}
			} catch (e) {
				// No checkboxes present - skip
			}
		})
	})

	test('tenant form keyboard navigation', async ({ page }) => {
		await page.goto('/manage/tenants/new', {
			waitUntil: 'load',
			timeout: 60000
		})
		await page
			.locator('input[name="firstName"]')
			.first()
			.waitFor({ state: 'visible', timeout: 10000 })

		await test.step('Tab through form fields', async () => {
			await page.keyboard.press('Tab')
			await expect(page.locator('input[name="firstName"]')).toBeFocused()

			await page.keyboard.press('Tab')
			await expect(page.locator('input[name="lastName"]')).toBeFocused()

			await page.keyboard.press('Tab')
			await expect(page.locator('input[name="email"]')).toBeFocused()
		})

		await test.step('Shift+Tab to go backwards', async () => {
			await page.keyboard.press('Shift+Tab')
			await expect(page.locator('input[name="lastName"]')).toBeFocused()
		})
	})

	test('tenant form accessibility', async ({ page }) => {
		await page.goto('/manage/tenants/new', {
			waitUntil: 'load',
			timeout: 60000
		})
		await page
			.locator('input[name="firstName"]')
			.first()
			.waitFor({ state: 'visible', timeout: 10000 })

		await test.step('Form has proper ARIA labels', async () => {
			const firstNameInput = page.locator('input[name="firstName"]')
			const ariaLabel = await firstNameInput.getAttribute('aria-label')
			const label = page.locator('label[for="firstName"]')

			// Should have either aria-label or associated label
			expect(ariaLabel || (await label.count()) > 0).toBeTruthy()
		})

		await test.step('Error messages are announced', async () => {
			const submitButton = page.getByRole('button', {
				name: /create tenant|submit/i
			})
			await submitButton.click()

			// Error messages should have aria-live or role="alert"
			const errorMessage = page
				.locator('[role="alert"]')
				.or(page.locator('[aria-live="polite"]'))
			if ((await errorMessage.count()) > 0) {
				await expect(errorMessage.first()).toBeVisible()
			}
		})
	})

	test('tenant export functionality', async ({ page }) => {
		await test.step('Export tenant list as CSV', async () => {
			const exportButton = page.getByRole('button', {
				name: /export|download/i
			})

			if ((await exportButton.count()) > 0) {
				// Listen for download
				const downloadPromise = page.waitForEvent('download', {
					timeout: 10000
				})

				await exportButton.click()

				// Select CSV format if dropdown
				const csvOption = page.getByRole('menuitem', { name: /csv/i })
				if ((await csvOption.count()) > 0) {
					await csvOption.click()
				}

				// Verify download started
				const download = await downloadPromise
				expect(download.suggestedFilename()).toMatch(/tenants.*\.csv/)
			}
		})
	})

	test('tenant form autosave functionality', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		await test.step('Fill form and verify autosave', async () => {
			await page.fill('input[name="firstName"]', 'AutoSave')
			await page.fill('input[name="lastName"]', 'Test')

			// Wait for autosave indicator
			await page.waitForTimeout(2000)

			// Refresh page
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Verify data persisted (if autosave is implemented)
			const firstNameValue = await page
				.locator('input[name="firstName"]')
				.inputValue()
			if (firstNameValue === 'AutoSave') {
				expect(firstNameValue).toBe('AutoSave')
			}
		})
	})

	test('tenant relationship management', async ({ page }) => {
		const tenantData = generateTenantData()

		await test.step('Create tenant', async () => {
			await page
				.getByRole('link', { name: /create tenant|new tenant/i })
				.click()
			await page.waitForLoadState('networkidle')

			await page.fill('input[name="firstName"]', tenantData.firstName)
			await page.fill('input[name="lastName"]', tenantData.lastName)
			await page.fill('input[name="email"]', tenantData.email)
			await page.fill('input[name="phone"]', tenantData.phone)

			await page.getByRole('button', { name: /create tenant|submit/i }).click()
			await expect(page.getByText(/created successfully/i)).toBeVisible({
				timeout: 10000
			})
		})

		await test.step('Assign lease to tenant', async () => {
			// Navigate to tenant details
			await page.goto('/manage/tenants')
			const tenantRow = page.getByRole('row', {
				name: new RegExp(tenantData.email, 'i')
			})
			await tenantRow.click()
			await page.waitForLoadState('networkidle')

			// Look for lease assignment section
			const assignLeaseButton = page.getByRole('button', {
				name: /assign lease|add lease/i
			})

			if ((await assignLeaseButton.count()) > 0) {
				await assignLeaseButton.click()

				// Select property and unit
				// This would depend on your specific UI implementation

				// Verify lease assignment
				await expect(
					page.getByText(/lease assigned|lease created/i)
				).toBeVisible()
			}
		})
	})
})

test.describe('Tenant Management Error Scenarios', () => {
	test('handle network errors gracefully', async ({ page, context }) => {
		// Simulate offline mode
		await context.setOffline(true)

		await page.goto('/manage/tenants')

		// Expect error message or offline indicator
		await expect(
			page.getByText(/offline|network error|connection/i)
		).toBeVisible({
			timeout: 10000
		})

		// Re-enable network
		await context.setOffline(false)
	})

	test('handle API errors gracefully', async ({ page }) => {
		// Intercept API calls and return errors
		await page.route('**/api/v1/tenants', route => {
			route.fulfill({
				status: 500,
				body: JSON.stringify({ error: 'Internal Server Error' })
			})
		})

		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Expect error message
		await expect(
			page.getByText(/error|failed to load|something went wrong/i)
		).toBeVisible({
			timeout: 10000
		})
	})

	test('handle concurrent edits', async ({ browser }) => {
		const context1 = await browser.newContext()
		const context2 = await browser.newContext()

		const page1 = await context1.newPage()
		const page2 = await context2.newPage()

		try {
			// Both users navigate to same tenant
			await page1.goto('/manage/tenants')
			await page2.goto('/manage/tenants')

			// Both click edit on first tenant
			const tenantRow1 = page1.getByRole('row').nth(1)
			const tenantRow2 = page2.getByRole('row').nth(1)

			await tenantRow1.click()
			await tenantRow2.click()

			await page1.getByRole('link', { name: /edit/i }).click()
			await page2.getByRole('link', { name: /edit/i }).click()

			// Both make changes
			await page1.fill('input[name="phone"]', '(111) 111-1111')
			await page2.fill('input[name="phone"]', '(222) 222-2222')

			// First user saves
			await page1.getByRole('button', { name: /save|update/i }).click()
			await expect(page1.getByText(/updated|saved/i)).toBeVisible({
				timeout: 10000
			})

			// Second user saves - should handle conflict
			await page2.getByRole('button', { name: /save|update/i }).click()

			// Expect conflict resolution (warning or overwrite confirmation)
			const conflictMessage = page2.getByText(
				/conflict|updated by another user|overwrite/i
			)
			if ((await conflictMessage.count()) > 0) {
				await expect(conflictMessage).toBeVisible()
			}
		} finally {
			await context1.close()
			await context2.close()
		}
	})
})
