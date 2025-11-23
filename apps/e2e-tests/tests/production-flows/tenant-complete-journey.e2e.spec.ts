import { test, expect, type Page } from '@playwright/test'

/**
 * Complete Tenant Journey E2E Test
 * Tests the full tenant experience from invitation to portal usage:
 * 1. Receive invitation
 * 2. Accept invitation and create account
 * 3. Login to tenant portal
 * 4. View lease details
 * 5. Submit maintenance request
 * 6. Make rent payment
 * 7. View payment history
 * 8. Update profile
 */

test.describe('Complete Tenant Journey - Production Flow', () => {
	const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'test-owner@tenantflow.app'
	const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'
	const TENANT_PASSWORD = process.env.E2E_TENANT_PASSWORD || 'TenantPass123!'
	const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'

	let ownerAuthToken: string
	let tenantEmail: string
	let invitationToken: string
	let tenantId: string
	let propertyId: string
	let unitId: string

	async function getAuthToken(page: Page): Promise<string> {
		const token = await page.evaluate(() => {
			const keys = Object.keys(localStorage)
			const authKey = keys.find(k => k.includes('supabase') || k.includes('sb-'))
			if (!authKey) return null

			try {
				const data = JSON.parse(localStorage.getItem(authKey) || '{}')
				return data?.currentSession?.access_token ||
					   data?.access_token ||
					   data?.session?.access_token ||
					   null
			} catch {
				return null
			}
		})

		if (!token) throw new Error('No auth token found after login')
		return token
	}

	test.beforeAll(async ({ browser }) => {
		// Setup: Owner creates tenant invitation
		const context = await browser.newContext()
		const page = await context.newPage()

		// Login as owner
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/manage/**`, { timeout: 10000 })

		ownerAuthToken = await getAuthToken(page)

		// Create a property and unit for the tenant
		const propertyResponse = await page.request.post(`${API_URL}/api/v1/properties`, {
			headers: {
				'Authorization': `Bearer ${ownerAuthToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				name: `E2E Tenant Test Property ${Date.now()}`,
				address: '123 Tenant Test St',
				city: 'Austin',
				state: 'TX',
				postal_code: '78701',
				property_type: 'APARTMENT'
			}
		})
		const property = await propertyResponse.json()
		propertyId = property.id

		const unitResponse = await page.request.post(`${API_URL}/api/v1/units`, {
			headers: {
				'Authorization': `Bearer ${ownerAuthToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				property_id: propertyId,
				unit_number: 'Unit 201',
				bedrooms: 2,
				bathrooms: 2,
				monthly_rent: 1500
			}
		})
		const unit = await unitResponse.json()
		unitId = unit.id

		// Create tenant invitation
		tenantEmail = `e2e-tenant-${Date.now()}@test.com`

		await page.goto(`${BASE_URL}/manage/tenants`)
		await page.waitForSelector('button:has-text("Invite Tenant")')
		await page.click('button:has-text("Invite Tenant")')

		await page.fill('input[name="email"]', tenantEmail)
		await page.fill('input[name="first_name"]', 'E2E')
		await page.fill('input[name="last_name"]', 'Tenant')
		await page.fill('input[name="phone"]', '5125551234')

		// Select the unit
		await page.click('[role="combobox"]')
		await page.click(`[role="option"]:has-text("Unit 201")`)

		await page.click('button:has-text("Send Invitation")')
		await page.waitForSelector('text=/Invitation sent|Success/')

		// Get invitation token from API
		const tenantsResponse = await page.request.get(`${API_URL}/api/v1/tenants`, {
			headers: { Authorization: `Bearer ${ownerAuthToken}` }
		})
		const tenants = await tenantsResponse.json()
		const tenant = tenants.find((t: any) => t.email === tenantEmail)
		invitationToken = tenant.invitation_token
		tenantId = tenant.id

		await context.close()
	})

	test('1. Tenant: Receive and view invitation', async ({ page }) => {
		// Navigate to invitation link
		await page.goto(`${BASE_URL}/tenant/invitation/${invitationToken}`)

		// Should redirect to signup
		await page.waitForURL(`${BASE_URL}/signup**`)

		// Verify email is pre-filled
		const emailInput = page.locator('input[type="email"]')
		await expect(emailInput).toHaveValue(tenantEmail)
		await expect(emailInput).toBeDisabled()
	})

	test('2. Tenant: Complete signup and accept invitation', async ({ page }) => {
		await page.goto(`${BASE_URL}/signup?invitation=${invitationToken}&email=${tenantEmail}`)

		// Fill password fields
		await page.fill('input[name="password"]', TENANT_PASSWORD)
		await page.fill('input[name="confirmPassword"]', TENANT_PASSWORD)

		// Accept terms if checkbox exists
		const termsCheckbox = page.locator('input[type="checkbox"]')
		if (await termsCheckbox.isVisible()) {
			await termsCheckbox.check()
		}

		// Submit signup
		await page.click('button[type="submit"]')

		// Wait for redirect to tenant portal
		await page.waitForURL(`${BASE_URL}/tenant/**`, { timeout: 10000 })

		// Verify we're in tenant portal
		expect(page.url()).toContain('/tenant')
	})

	test('3. Tenant: Login to portal', async ({ page }) => {
		await page.goto(`${BASE_URL}/login`)

		// Fill credentials
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)

		// Submit login
		await page.click('button[type="submit"]')

		// Wait for redirect to tenant portal
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Verify tenant dashboard loads
		await expect(page.locator('h1:has-text("Dashboard"), h1:has-text("Portal")')).toBeVisible()
	})

	test('4. Tenant: View lease details', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Navigate to lease page
		await page.goto(`${BASE_URL}/tenant/lease`)

		// Verify lease information is displayed
		await expect(page.locator('text=Unit 201, text=Monthly Rent, text=Lease Agreement')).toBeVisible()
	})

	test('5. Tenant: Submit maintenance request', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Navigate to maintenance page
		await page.goto(`${BASE_URL}/tenant/maintenance`)

		// Click "New Request"
		await page.click('button:has-text("New Request"), button:has-text("Submit Request")')

		// Fill maintenance request form
		await page.fill('input[name="title"]', 'Broken AC Unit')
		await page.fill('textarea[name="description"]', 'The air conditioning unit is not working properly')

		// Select category
		await page.click('[role="combobox"]')
		await page.click('[role="option"]:has-text("HVAC")')

		// Submit request
		await page.click('button[type="submit"]:has-text("Submit")')

		// Verify success
		await expect(page.locator('text=/Request submitted|Success/')).toBeVisible()
		await expect(page.locator('text=Broken AC Unit')).toBeVisible()
	})

	test('6. Tenant: Make rent payment', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Navigate to payments page
		await page.goto(`${BASE_URL}/tenant/payments`)

		// Look for "Pay Rent" or payment button
		const payButton = page.locator('button:has-text("Pay Rent"), button:has-text("Make Payment")')
		if (await payButton.isVisible()) {
			await payButton.click()

			// Verify payment form/page loads
			await expect(page.locator('text=/Payment|Amount|Stripe/')).toBeVisible()
		} else {
			// If no payment button, verify payment history page loads
			await expect(page.locator('h1:has-text("Payments"), text=Payment History')).toBeVisible()
		}
	})

	test('7. Tenant: View payment history', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Navigate to payment history
		await page.goto(`${BASE_URL}/tenant/payments/history`)

		// Verify payment history page loads
		await expect(page.locator('h1:has-text("Payment History"), h1:has-text("Payments")')).toBeVisible()

		// Verify table or empty state
		const hasPayments = await page.locator('table tbody tr').count()
		const hasEmptyState = await page.locator('text=No payments').isVisible()
		expect(hasPayments > 0 || hasEmptyState).toBeTruthy()
	})

	test('8. Tenant: Update profile settings', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Navigate to settings
		await page.goto(`${BASE_URL}/tenant/settings`)

		// Verify profile fields
		await expect(page.locator('input[name="email"], input[name="first_name"]')).toBeVisible()

		// Update phone number
		const phoneInput = page.locator('input[name="phone"]')
		if (await phoneInput.isVisible()) {
			await phoneInput.fill('5125559999')

			// Save changes
			await page.click('button:has-text("Save"), button:has-text("Update")')

			// Verify success
			await expect(page.locator('text=/Updated|Success/')).toBeVisible()
		}
	})

	test('9. Tenant: Access all portal pages', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Test all tenant portal routes
		const routes = [
			{ path: '/tenant', heading: 'Dashboard|Portal' },
			{ path: '/tenant/lease', heading: 'Lease' },
			{ path: '/tenant/maintenance', heading: 'Maintenance' },
			{ path: '/tenant/payments', heading: 'Payments' },
			{ path: '/tenant/settings', heading: 'Settings' }
		]

		for (const route of routes) {
			await page.goto(`${BASE_URL}${route.path}`)
			await page.waitForSelector(`h1:has-text("${route.heading}")`, { timeout: 5000 })
			expect(page.url()).toContain(route.path)
		}
	})

	test('10. Tenant: Logout successfully', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', tenantEmail)
		await page.fill('input[type="password"]', TENANT_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/tenant/**`)

		// Click logout
		const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")')
		await logoutButton.click()

		// Verify redirect to login
		await page.waitForURL(`${BASE_URL}/login`)
		await expect(page.locator('input[type="email"]')).toBeVisible()
	})
})
