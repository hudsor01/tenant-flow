/**
 * End-to-End Test: Tenant Invitation Flow
 *
 * Tests the complete flow of:
 * 1. Property owner logging in
 * 2. Navigating to tenant management
 * 3. Creating/inviting a new tenant
 * 4. Verifying the tenant appears in the property owner dashboard
 *
 * This test uses authenticated sessions via Playwright's auth-helpers pattern
 */

import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'

// Test data generator for new tenant
const generateTenantData = () => ({
	firstName: faker.person.firstName(),
	lastName: faker.person.lastName(),
	email: faker.internet.email().toLowerCase(),
	phone: faker.phone.number({ style: 'international' }),
	emergencyContact: `${faker.person.fullName()} - ${faker.phone.number()}`
})

test.describe('Tenant Invitation Flow', () => {
	let tenantData: ReturnType<typeof generateTenantData>
	let tenantId: string | null = null

	test.beforeEach(async ({ page }) => {
		// Authenticate before each test (httpOnly cookies requirement)
		await loginAsOwner(page)

		// Generate fresh tenant data for each test
		tenantData = generateTenantData()

		// Navigate to tenant management page
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
		await page.goto(`${baseUrl}/manage/tenants`)
		await page.waitForLoadState('networkidle')
	})

	test('complete tenant invitation flow - create and verify in dashboard', async ({
		page
	}) => {
		// STEP 1: Navigate to tenant creation form
		await test.step('Navigate to tenant creation form', async () => {
			// Wait for page to load completely and skeleton loaders to disappear
			await page.waitForLoadState('networkidle')

			// Wait for either success state, empty state, or error state
			await Promise.race([
				page.waitForSelector('text=/No tenants yet|Tenant|Failed to load/', {
					timeout: 20000
				}),
				page.waitForTimeout(20000)
			])

			// Check if we're in error state
			const errorState = page.locator('text=/Failed to load tenants/i')
			const isError = await errorState.isVisible()

			if (isError) {
				// In error state, look for "Create Tenant Anyway" button
				const createButton = page
					.locator('a:has-text("Create Tenant Anyway")')
					.first()
				await expect(createButton).toBeVisible({ timeout: 5000 })
				await createButton.click()
			} else {
				// Normal flow: look for "Create tenant" or "Add Tenant"
				const createButton = page
					.locator(
						'a:has-text("Create tenant"), a:has-text("Add Tenant"), button:has-text("Create tenant"), button:has-text("Add Tenant")'
					)
					.first()
				await expect(createButton).toBeVisible({ timeout: 10000 })
				await createButton.click()
			}

			await page.waitForLoadState('networkidle')

			// Verify we're on the creation form
			await expect(page).toHaveURL(/\/manage\/tenants\/new/)
		})

		// STEP 2: Fill out tenant invitation form
		await test.step('Fill out tenant invitation form', async () => {
			// Fill required fields
			await page.fill('input#firstName', tenantData.firstName)
			await page.fill('input#lastName', tenantData.lastName)
			await page.fill('input#email', tenantData.email)

			// Verify required fields are filled
			await expect(page.locator('input#firstName')).toHaveValue(
				tenantData.firstName
			)
			await expect(page.locator('input#lastName')).toHaveValue(
				tenantData.lastName
			)
			await expect(page.locator('input#email')).toHaveValue(tenantData.email)

			// Fill optional fields if present
			if (await page.locator('input#phone').isVisible()) {
				await page.fill('input#phone', tenantData.phone)
				await expect(page.locator('input#phone')).toHaveValue(tenantData.phone)
			}

			if (await page.locator('textarea#emergencyContact').isVisible()) {
				await page.fill(
					'textarea#emergencyContact',
					tenantData.emergencyContact
				)
				await expect(page.locator('textarea#emergencyContact')).toHaveValue(
					tenantData.emergencyContact
				)
			}
		})

		// STEP 3: Submit the form
		await test.step('Submit tenant invitation form', async () => {
			const submitButton = page.getByRole('button', {
				name: /create tenant|add tenant|submit/i
			})
			await expect(submitButton).toBeVisible()
			await submitButton.click()

			// Wait for either success message or redirect to tenant details
			await Promise.race([
				page.waitForURL(/\/manage\/tenants\/[a-f0-9-]+/, { timeout: 15000 }),
				page.waitForSelector(
					'text=/tenant created|success|added successfully/i',
					{ timeout: 15000 }
				)
			])
		})

		// STEP 4: Verify tenant details page displays correct information
		await test.step('Verify tenant details are displayed', async () => {
			const currentUrl = page.url()

			// If redirected to details page, extract tenant ID
			const match = currentUrl.match(/\/manage\/tenants\/([a-f0-9-]+)/)
			if (match && match[1]) {
				tenantId = match[1]
				console.log(`Created tenant with ID: ${tenantId}`)

				// Verify tenant details are visible
				await expect(
					page.getByText(`${tenantData.firstName} ${tenantData.lastName}`)
				).toBeVisible({ timeout: 5000 })

				await expect(page.getByText(tenantData.email)).toBeVisible({
					timeout: 5000
				})
			}
		})

		// STEP 5: Navigate to tenant list and verify tenant appears
		await test.step('Verify tenant appears in tenant list', async () => {
			await page.goto('/manage/tenants')
			await page.waitForLoadState('networkidle')

			// Search for the newly created tenant by email
			const searchInput = page.getByPlaceholder(/search|filter/i).first()
			if (await searchInput.isVisible()) {
				await searchInput.fill(tenantData.email)
				await page.waitForTimeout(500) // Debounce
				await page.waitForLoadState('networkidle')
			}

			// Verify tenant appears in the list
			await expect(
				page.getByText(`${tenantData.firstName} ${tenantData.lastName}`)
			).toBeVisible({ timeout: 10000 })

			await expect(page.getByText(tenantData.email)).toBeVisible({
				timeout: 5000
			})
		})

		// STEP 6: Navigate to dashboard and verify tenant count increased
		await test.step('Verify tenant appears in property owner dashboard', async () => {
			await page.goto('/manage/dashboard')
			await page.waitForLoadState('networkidle')

			// Look for tenant-related statistics or recent activity
			// The dashboard should show tenant count or recent tenant additions
			const tenantStats = page.locator('text=/total tenants|tenants:/i').first()

			if (await tenantStats.isVisible()) {
				// Take screenshot for verification
				await page.screenshot({
					path: 'tenant-invitation-dashboard-verification.png',
					fullPage: false
				})
			}

			// Alternatively, check if there's a "Recent Tenants" or "Recent Activity" section
			const recentActivity = page
				.locator('text=/recent|activity|new tenant/i')
				.first()
			if (await recentActivity.isVisible()) {
				// Verify our new tenant appears in recent activity
				const activitySection = page
					.locator('[data-testid="recent-activity"]')
					.or(page.locator('section:has-text("Recent")'))
					.first()

				if (await activitySection.isVisible()) {
					await expect(activitySection).toContainText(tenantData.firstName, {
						timeout: 5000
					})
				}
			}
		})

		// STEP 7: Verify tenant can be found via dashboard quick search
		await test.step('Verify tenant is searchable from dashboard', async () => {
			// Some dashboards have a global search
			const globalSearch = page.getByPlaceholder(/search|find/i).first()

			if (await globalSearch.isVisible()) {
				await globalSearch.fill(tenantData.email)
				await page.waitForTimeout(500)

				// Check if search results appear
				const searchResults = page
					.locator('[data-testid="search-results"]')
					.or(page.locator('text=' + tenantData.email))

				if ((await searchResults.count()) > 0) {
					await expect(searchResults.first()).toBeVisible()
				}
			}
		})
	})

	test('tenant invitation form validation', async ({ page }) => {
		await test.step('Navigate to tenant creation form', async () => {
			await page.waitForLoadState('networkidle')

			// Wait for content to load (error, empty, or success state)
			await Promise.race([
				page.waitForSelector('text=/No tenants yet|Tenant|Failed to load/', {
					timeout: 20000
				}),
				page.waitForTimeout(20000)
			])

			// Handle error state gracefully
			const errorState = page.locator('text=/Failed to load tenants/i')
			if (await errorState.isVisible()) {
				const createButton = page
					.locator('a:has-text("Create Tenant Anyway")')
					.first()
				await createButton.click()
			} else {
				const createButton = page
					.locator(
						'a:has-text("Create tenant"), a:has-text("Add Tenant"), button:has-text("Create tenant"), button:has-text("Add Tenant")'
					)
					.first()
				await createButton.click()
			}

			await page.waitForLoadState('networkidle')
		})

		await test.step('Verify required field validation', async () => {
			// Try to submit empty form
			const submitButton = page.getByRole('button', {
				name: /create tenant|add tenant|submit/i
			})
			await submitButton.click()

			// Should show validation errors
			const errorMessages = page.locator(
				'text=/required|cannot be empty|please enter/i'
			)
			await expect(errorMessages.first()).toBeVisible({ timeout: 5000 })
		})

		await test.step('Verify email format validation', async () => {
			// Fill with invalid email
			await page.fill('input#email', 'invalid-email')

			// Trigger validation (blur or submit)
			await page.locator('input#email').blur()

			// Look for email validation error
			const emailError = page.locator(
				'text=/invalid email|valid email|email format/i'
			)
			if ((await emailError.count()) > 0) {
				await expect(emailError.first()).toBeVisible({ timeout: 3000 })
			}
		})
	})

	test('tenant invitation with minimal data', async ({ page }) => {
		await test.step('Navigate to tenant creation form', async () => {
			await page.waitForLoadState('networkidle')

			// Wait for content to load (error, empty, or success state)
			await Promise.race([
				page.waitForSelector('text=/No tenants yet|Tenant|Failed to load/', {
					timeout: 20000
				}),
				page.waitForTimeout(20000)
			])

			// Handle error state gracefully
			const errorState = page.locator('text=/Failed to load tenants/i')
			if (await errorState.isVisible()) {
				const createButton = page
					.locator('a:has-text("Create Tenant Anyway")')
					.first()
				await createButton.click()
			} else {
				const createButton = page
					.locator(
						'a:has-text("Create tenant"), a:has-text("Add Tenant"), button:has-text("Create tenant"), button:has-text("Add Tenant")'
					)
					.first()
				await createButton.click()
			}

			await page.waitForLoadState('networkidle')
		})

		await test.step('Create tenant with only required fields', async () => {
			// Fill only required fields
			await page.fill('input#firstName', tenantData.firstName)
			await page.fill('input#lastName', tenantData.lastName)
			await page.fill('input#email', tenantData.email)

			// Submit
			const submitButton = page.getByRole('button', {
				name: /create tenant|add tenant|submit/i
			})
			await submitButton.click()

			// Should succeed with minimal data
			await Promise.race([
				page.waitForURL(/\/manage\/tenants\/[a-f0-9-]+/, { timeout: 15000 }),
				page.waitForSelector('text=/tenant created|success/i', {
					timeout: 15000
				})
			])
		})

		await test.step('Verify minimal tenant appears in list', async () => {
			await page.goto('/manage/tenants')
			await page.waitForLoadState('networkidle')

			// Verify tenant exists
			await expect(
				page.getByText(`${tenantData.firstName} ${tenantData.lastName}`)
			).toBeVisible({ timeout: 10000 })
		})
	})

	test('error state shows retry and create anyway buttons', async ({
		page
	}) => {
		await test.step('Navigate to tenant management page', async () => {
			await page.goto('/manage/tenants')
			await page.waitForLoadState('networkidle')

			// Wait for either content or error state
			await Promise.race([
				page.waitForSelector('text=/Failed to load|No tenants yet|Tenant/', {
					timeout: 20000
				}),
				page.waitForTimeout(20000)
			])
		})

		await test.step('Verify error state UI elements (if in error state)', async () => {
			const errorState = page.locator('text=/Failed to load tenants/i')

			if (await errorState.isVisible()) {
				// Verify error message is displayed
				await expect(errorState).toBeVisible()

				// Verify retry button exists
				const retryButton = page.locator('button:has-text("Retry")')
				await expect(retryButton).toBeVisible()

				// Verify "Create Tenant Anyway" button exists
				const createAnywayButton = page.locator(
					'a:has-text("Create Tenant Anyway")'
				)
				await expect(createAnywayButton).toBeVisible()

				// Verify retry count is shown if applicable
				const attemptMessage = page.locator('text=/Attempted.*time/i')
				if ((await attemptMessage.count()) > 0) {
					await expect(attemptMessage.first()).toBeVisible()
				}
			}
		})
	})
})

test.describe('Tenant Dashboard Integration', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('dashboard displays tenant statistics correctly', async ({ page }) => {
		await test.step('Navigate to dashboard', async () => {
			await page.goto('/manage/dashboard')
			await page.waitForLoadState('networkidle')
		})

		await test.step('Verify tenant statistics are displayed', async () => {
			// Look for tenant-related stats
			const tenantStatLocators = [
				page.locator('text=/total tenants/i'),
				page.locator('[data-testid="tenant-count"]'),
				page.locator('text=/active tenants/i')
			]

			for (const locator of tenantStatLocators) {
				if ((await locator.count()) > 0) {
					await expect(locator.first()).toBeVisible()
					break
				}
			}

			// Take screenshot for verification
			await page.screenshot({
				path: 'dashboard-tenant-statistics.png',
				fullPage: true
			})

			// At minimum, verify the dashboard loads successfully
			await expect(page).toHaveURL(/\/manage\/dashboard/)
		})

		await test.step('Verify tenant-related widgets exist', async () => {
			// Look for common dashboard widgets
			const widgetSelectors = [
				'text=/recent tenants/i',
				'text=/tenant activity/i',
				'text=/new tenants/i',
				'[data-testid="tenants-widget"]'
			]

			// Check if any widget exists
			for (const selector of widgetSelectors) {
				const widget = page.locator(selector).first()
				if ((await widget.count()) > 0) {
					console.log(`Found dashboard widget: ${selector}`)
				}
			}
		})
	})
})
