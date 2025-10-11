/**
 * End-to-End Tests for Tenant Management Workflows - FIXED SELECTORS
 * Complete user journeys from creation to deletion with correct UI selectors
 */

import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'

// Test data generators
const generateTenantData = () => ({
	firstName: faker.person.firstName(),
	lastName: faker.person.lastName(),
	email: faker.internet.email().toLowerCase(),
	phone: faker.phone.number({ style: 'international' }),
	emergencyContact: `${faker.person.fullName()} - ${faker.phone.number()}`
})

test.describe('Tenant Management E2E Workflows', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to tenant management page
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')
	})

	test('complete tenant lifecycle - create, view, edit, delete', async ({
		page
	}) => {
		const tenantData = generateTenantData()

		// STEP 1: Create new tenant
		await test.step('Create new tenant', async () => {
			// Navigate to create form using the correct link text
			const createButton = page.getByRole('link', {
				name: /add new tenant|create tenant|new tenant/i
			})
			await createButton.click()
			await page.waitForLoadState('networkidle')

			// Fill out form using correct id selectors
			await page.fill('#firstName', tenantData.firstName)
			await page.fill('#lastName', tenantData.lastName)
			await page.fill('#email', tenantData.email)
			await page.fill('#phone', tenantData.phone)
			await page.fill('#emergencyContact', tenantData.emergencyContact)

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

			// Verify redirect to tenant details
			await page.waitForURL(/\/manage\/tenants\/[a-f0-9-]+/, { timeout: 5000 })
		})

		// STEP 2: View tenant details
		await test.step('View tenant details', async () => {
			// We should already be on the details page after creation
			// Verify all details are displayed
			await expect(
				page.getByText(`${tenantData.firstName} ${tenantData.lastName}`)
			).toBeVisible()
			await expect(page.getByText(tenantData.email)).toBeVisible()
		})

		// STEP 3: Edit tenant information
		await test.step('Edit tenant information', async () => {
			const updatedPhone = faker.phone.number({ style: 'international' })

			// Click edit button
			const editButton = page.getByRole('link', { name: /edit/i })
			await editButton.click()
			await page.waitForLoadState('networkidle')

			// Update phone number
			await page.fill('#phone', updatedPhone)

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
			await deleteButton.click()

			// Confirm deletion in dialog
			await expect(page.getByText(/are you sure/i)).toBeVisible()
			const confirmButton = page.getByRole('button', {
				name: /delete tenant|confirm|delete/i
			})
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
			const deletedTenantRow = page.getByText(tenantData.email)
			await expect(deletedTenantRow).not.toBeVisible()
		})
	})

	test('create tenant with validation errors', async ({ page }) => {
		await test.step('Navigate to create form', async () => {
			const createButton = page.getByRole('link', {
				name: /add new tenant|create tenant|new tenant/i
			})
			await createButton.click()
			await page.waitForLoadState('networkidle')
		})

		await test.step('Submit empty form', async () => {
			const submitButton = page.getByRole('button', {
				name: /create tenant|submit/i
			})
			await submitButton.click()

			// Expect validation errors
			const errorMessages = page.locator('text=/required|invalid/i')
			await expect(errorMessages.first()).toBeVisible({ timeout: 3000 })
		})

		await test.step('Submit with invalid email', async () => {
			await page.fill('#firstName', 'Test')
			await page.fill('#lastName', 'User')
			await page.fill('#email', 'invalid-email')

			const submitButton = page.getByRole('button', {
				name: /create tenant|submit/i
			})
			await submitButton.click()

			// Expect email validation error
			await expect(page.getByText(/valid email|email.*invalid/i)).toBeVisible({
				timeout: 3000
			})
		})

		await test.step('Submit with valid data', async () => {
			const validData = generateTenantData()

			await page.fill('#firstName', validData.firstName)
			await page.fill('#lastName', validData.lastName)
			await page.fill('#email', validData.email)
			await page.fill('#phone', validData.phone)

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
				await searchInput.fill('John')
				await page.waitForTimeout(500) // Debounce

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

	test('tenant form keyboard navigation', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		await test.step('Tab through form fields', async () => {
			await page.keyboard.press('Tab')
			await expect(page.locator('#firstName')).toBeFocused()

			await page.keyboard.press('Tab')
			await expect(page.locator('#lastName')).toBeFocused()

			await page.keyboard.press('Tab')
			await expect(page.locator('#email')).toBeFocused()
		})

		await test.step('Shift+Tab to go backwards', async () => {
			await page.keyboard.press('Shift+Tab')
			await expect(page.locator('#lastName')).toBeFocused()
		})
	})

	test('tenant form accessibility', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		await test.step('Form has proper labels', async () => {
			const firstNameInput = page.locator('#firstName')
			const label = page.locator('label[for="firstName"]')

			// Should have associated label
			await expect(label).toBeVisible()
		})

		await test.step('Error messages are accessible', async () => {
			const submitButton = page.getByRole('button', {
				name: /create tenant|submit/i
			})
			await submitButton.click()

			// Wait for validation errors
			await page.waitForTimeout(500)

			// Error messages should be near form fields
			const errorMessage = page
				.locator('[role="alert"]')
				.or(page.locator('.text-red-500, .text-destructive'))
				.first()
			if ((await errorMessage.count()) > 0) {
				await expect(errorMessage).toBeVisible()
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
})
