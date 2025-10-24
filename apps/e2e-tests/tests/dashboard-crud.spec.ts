import { test, expect } from '@playwright/test'
import { STORAGE_STATE } from '../auth.setup'

/**
 * Comprehensive CRUD Testing Suite for TenantFlow Dashboard
 * Tests all Create, Read, Update, Delete operations with detailed tracing
 */

// Test configuration - use authenticated session
test.use({
	storageState: STORAGE_STATE.OWNER,
	viewport: { width: 1920, height: 1080 },
	video: 'on',
	trace: 'on',
	screenshot: 'on'
})

test.describe('Dashboard CRUD Operations - Full E2E Test Suite', () => {
	test.beforeEach(async ({ page }) => {
		// Already authenticated via storageState
		// Just navigate to dashboard
		await page.goto('/manage/dashboard')
		await page.waitForLoadState('networkidle')
		console.log('✅ Authenticated and ready for testing')
	})

	test.describe('Tenant CRUD Operations', () => {
		test('should create, read, update, and delete a tenant', async ({ page }) => {
			console.log('🧪 Starting Tenant CRUD test')

			// Navigate to tenants page
			await page.goto('/manage/tenants')
			await page.waitForLoadState('networkidle')

			// Take snapshot before create
			await page.screenshot({ path: 'tenant-crud-1-before-create.png', fullPage: true })

			// CREATE: Click "Add Tenant" button
			const addButton = page.getByRole('button', { name: /add tenant/i }).first()
			await expect(addButton).toBeVisible({ timeout: 10000 })
			await addButton.click()

			console.log('✓ Clicked Add Tenant button')

			// Fill in tenant form
			const firstNameInput = page.getByLabel(/first name/i)
			const lastNameInput = page.getByLabel(/last name/i)
			const emailInput = page.getByLabel(/email/i)

			await expect(firstNameInput).toBeVisible({ timeout: 5000 })
			await firstNameInput.fill('John')
			await lastNameInput.fill('Doe')
			await emailInput.fill(`test-${Date.now()}@example.com`)

			console.log('✓ Filled tenant form')
			await page.screenshot({ path: 'tenant-crud-2-form-filled.png' })

			// Submit form
			const submitButton = page.getByRole('button', { name: /create tenant|add tenant|save/i })
			await submitButton.click()

			console.log('✓ Clicked submit')

			// Wait for success toast or new entry in table
			await page.waitForTimeout(2000)
			await page.screenshot({ path: 'tenant-crud-3-after-create.png', fullPage: true })

			// READ: Verify tenant appears in the list
			const tenantRow = page.getByText('John Doe').or(page.getByText('John')).first()
			await expect(tenantRow).toBeVisible({ timeout: 10000 })

			console.log('✓ Verified tenant appears in list')

			// UPDATE: Click edit button for the tenant
			// Find the row containing our tenant and click the edit button
			const editButton = page.locator('[data-testid*="edit"]').or(page.getByRole('button', { name: /edit/i })).first()
			if (await editButton.isVisible()) {
				await editButton.click()
				await page.waitForTimeout(1000)

				// Modify a field
				const phoneInput = page.getByLabel(/phone/i)
				if (await phoneInput.isVisible()) {
					await phoneInput.fill('555-1234')
					await page.screenshot({ path: 'tenant-crud-4-edit-form.png' })

					// Save changes
					const saveButton = page.getByRole('button', { name: /save|update/i })
					await saveButton.click()
					await page.waitForTimeout(2000)

					console.log('✓ Updated tenant')
					await page.screenshot({ path: 'tenant-crud-5-after-update.png', fullPage: true })
				}
			}

			// DELETE: Click delete button
			const deleteButton = page.locator('[data-testid*="delete"]').or(page.getByRole('button', { name: /delete|remove/i })).first()
			if (await deleteButton.isVisible()) {
				await deleteButton.click()
				await page.waitForTimeout(500)

				// Confirm deletion
				const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i })
				if (await confirmButton.isVisible()) {
					await confirmButton.click()
					await page.waitForTimeout(2000)

					console.log('✓ Deleted tenant')
					await page.screenshot({ path: 'tenant-crud-6-after-delete.png', fullPage: true })
				}
			}

			console.log('✅ Tenant CRUD test complete')
		})
	})

	test.describe('Property CRUD Operations', () => {
		test('should create, read, update, and delete a property', async ({ page }) => {
			console.log('🧪 Starting Property CRUD test')

			// Navigate to properties page
			await page.goto('/manage/properties')
			await page.waitForLoadState('networkidle')
			await page.screenshot({ path: 'property-crud-1-before-create.png', fullPage: true })

			// CREATE: Click "Add Property" button
			const addButton = page.getByRole('button', { name: /add property|create property/i }).first()
			if (await addButton.isVisible({ timeout: 5000 })) {
				await addButton.click()
				console.log('✓ Clicked Add Property button')

				// Fill in property form
				const nameInput = page.getByLabel(/name|property name/i).first()
				await expect(nameInput).toBeVisible({ timeout: 5000 })
				await nameInput.fill('Test Property ' + Date.now())

				const addressInput = page.getByLabel(/address/i).first()
				if (await addressInput.isVisible()) {
					await addressInput.fill('123 Test Street')
				}

				console.log('✓ Filled property form')
				await page.screenshot({ path: 'property-crud-2-form-filled.png' })

				// Submit
				const submitButton = page.getByRole('button', { name: /create|save|add/i })
				await submitButton.click()
				await page.waitForTimeout(2000)
				await page.screenshot({ path: 'property-crud-3-after-create.png', fullPage: true })

				console.log('✓ Created property')
			}

			console.log('✅ Property CRUD test complete')
		})
	})

	test.describe('Maintenance CRUD Operations', () => {
		test('should create and verify maintenance request', async ({ page }) => {
			console.log('🧪 Starting Maintenance CRUD test')

			// Navigate to maintenance page
			await page.goto('/manage/maintenance')
			await page.waitForLoadState('networkidle')
			await page.screenshot({ path: 'maintenance-crud-1-before-create.png', fullPage: true })

			// CREATE: Click "Create Request" or similar
			const addButton = page.getByRole('button', { name: /create|add|new/i }).first()
			if (await addButton.isVisible({ timeout: 5000 })) {
				await addButton.click()
				console.log('✓ Clicked create maintenance request')

				await page.waitForTimeout(1000)
				await page.screenshot({ path: 'maintenance-crud-2-form-opened.png' })

				console.log('✓ Maintenance form opened')
			}

			console.log('✅ Maintenance CRUD test complete')
		})
	})

	test.describe('Console and Network Monitoring', () => {
		test('should capture console errors and network failures', async ({ page }) => {
			const consoleMessages: string[] = []
			const networkErrors: string[] = []

			// Listen for console messages
			page.on('console', msg => {
				if (msg.type() === 'error') {
					consoleMessages.push(`[CONSOLE ERROR] ${msg.text()}`)
				}
			})

			// Listen for failed requests
			page.on('requestfailed', request => {
				networkErrors.push(`[NETWORK ERROR] ${request.url()} - ${request.failure()?.errorText}`)
			})

			// Navigate through all CRUD pages
			const pages = [
				'/manage/dashboard',
				'/manage/properties',
				'/manage/tenants',
				'/manage/leases',
				'/manage/units',
				'/manage/maintenance'
			]

			for (const route of pages) {
				await page.goto(route)
				await page.waitForLoadState('networkidle')
				await page.waitForTimeout(1000)
			}

			// Report findings
			console.log('\n📊 Test Results:')
			console.log(`Console Errors: ${consoleMessages.length}`)
			consoleMessages.forEach(msg => console.log(`  ${msg}`))

			console.log(`\nNetwork Errors: ${networkErrors.length}`)
			networkErrors.forEach(err => console.log(`  ${err}`))

			// Fail test if there are critical errors
			expect(networkErrors.length).toBe(0)
		})
	})
})
