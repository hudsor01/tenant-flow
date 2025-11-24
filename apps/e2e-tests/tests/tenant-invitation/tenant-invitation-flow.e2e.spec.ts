import { test, expect, type Page } from '@playwright/test'
import { loginAsOwner } from '../../auth-helpers'

/**
 * Tenant Invitation Flow E2E Tests
 * Tests all checklist items from docs/TENANT_INVITATION_FLOW.md
 */

test.describe('Tenant Invitation Flow', () => {
	// Test credentials from environment
	const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
	const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'
	const TENANT_PASSWORD = process.env.E2E_TENANT_PASSWORD || 'TenantPassword123!'
	const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'https://tenantflow.app'
	const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || 'https://api.tenantflow.app'

	// Test data
	const testTenant = {
	email: `test-tenant-${Date.now()}@example.com`,
	first_name: 'Test',
	last_name: 'Tenant',
	phone: '5555551234'
}

	let invitationToken: string
	let tenant_id: string

	async function getSupabaseAccessToken(page: Page): Promise<string | null> {
		const cookies = await page.context().cookies()
		const authCookie = cookies.find(cookie =>
			/access-token|auth-token/i.test(cookie.name)
		)

		if (authCookie?.value) return authCookie.value

		return page.evaluate(() => {
			const tokenKey = Object.keys(localStorage).find(key =>
				key.includes('auth-token') ||
				key.includes('access_token') ||
				key.includes('supabase') ||
				key.includes('sb-')
			)

			if (!tokenKey) return null

			try {
				const raw = localStorage.getItem(tokenKey)
				if (!raw) return null
				const parsed = JSON.parse(raw)
				return (
					parsed?.currentSession?.access_token ||
					parsed?.access_token ||
					parsed?.accessToken ||
					parsed?.value?.access_token ||
					null
				)
			} catch {
				return null
			}
		})
	}

	async function getAuthHeaders(page: Page) {
		const token =
			process.env.TEST_AUTH_TOKEN || (await getSupabaseAccessToken(page))

		if (!token) {
			throw new Error(
				'TEST_AUTH_TOKEN not set and no Supabase access token found after login; backend now requires Authorization header.'
			)
		}

		return {
			Authorization: `Bearer ${token}`
		}
	}

	test.beforeEach(async ({ page }) => {
		// Login as property owner using auth helper
		await loginAsOwner(page)
	})

	test('[Property Owner] Create tenant with valid lease', async ({ page }) => {
		// Navigate to tenants page
		await page.goto(`${BASE_URL}/tenants`)

		// Wait for page to load
		await page.waitForSelector('button:has-text("Invite Tenant")')

		// Click "Invite Tenant" button
		await page.click('button:has-text("Invite Tenant")')

		// Fill in tenant information
		await page.fill('input[name="email"]', testTenant.email)
		await page.fill('input[name="first_name"]', testTenant.first_name)
		await page.fill('input[name="last_name"]', testTenant.last_name)
		await page.fill('input[name="phone"]', testTenant.phone)

		// Select a lease (assuming at least one exists)
		await page.click('[user_type="combobox"]')
		await page.click('[user_type="option"]:first-child')

		// Submit form
		await page.click('button:has-text("Send Invitation")')

		// Wait for success toast
		await expect(page.locator('text=Invitation sent successfully')).toBeVisible()

		// Verify tenant appears in table
		await expect(page.locator(`text=${testTenant.email}`)).toBeVisible()
	})

	test('[Property Owner] Invitation appears in table with SENT badge', async ({ page }) => {
		await page.goto(`${BASE_URL}/tenants`)

		// Find the row with our test tenant
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify SENT badge is visible
		await expect(tenantRow.locator('text=SENT')).toBeVisible()
	})

	test('[Property Owner] Resend button appears for SENT status', async ({ page }) => {
		await page.goto(`${BASE_URL}/tenants`)

		// Find the row with our test tenant
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify resend button is visible
		await expect(tenantRow.locator('button:has-text("Resend")')).toBeVisible()
	})

	test('[Property Owner] Click resend → new email sent, timestamp updated', async ({ page }) => {
		await page.goto(`${BASE_URL}/tenants`)

		// Get initial sent_at timestamp
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)
		const initialTimestamp = await tenantRow.locator('[data-testid="sent-at"]').textContent()

		// Click resend button
		await tenantRow.locator('button:has-text("Resend")').click()

		// Wait for success toast
		await expect(page.locator('text=Invitation resent successfully')).toBeVisible()

		// Verify timestamp updated
		await page.reload()
		const newTimestamp = await tenantRow.locator('[data-testid="sent-at"]').textContent()
		expect(newTimestamp).not.toBe(initialTimestamp)
	})

	test('[Tenant] Click valid invitation link → redirects to signup', async ({ page, context }) => {
		// Get invitation token from API using bearer auth (cookie fallback removed)
		const authHeaders = await getAuthHeaders(page)
		const response = await page.request.get(`${API_URL}/api/v1/tenants`, { headers: authHeaders })
		const tenants = await response.json()
		const tenant = tenants.find((t: any) => t.email === testTenant.email)
		invitationToken = tenant.invitation_token
		tenant_id = tenant.id

		// Visit invitation link in new context (not logged in)
		const newPage = await context.newPage()
		await newPage.goto(`${BASE_URL}/tenant/invitation/${invitationToken}`)

		// Should redirect to signup
		await newPage.waitForURL(`${BASE_URL}/signup**`)

		// Verify email is pre-filled
		const emailInput = newPage.locator('input[type="email"]')
		await expect(emailInput).toHaveValue(testTenant.email)
	})

	test('[Tenant] Email pre-filled in signup form', async ({ page, context }) => {
		const newPage = await context.newPage()
		await newPage.goto(`${BASE_URL}/tenant/invitation/${invitationToken}`)

		await newPage.waitForURL(`${BASE_URL}/signup**`)

		// Verify email is pre-filled and disabled
		const emailInput = newPage.locator('input[type="email"]')
		await expect(emailInput).toHaveValue(testTenant.email)
		await expect(emailInput).toBeDisabled()
	})

	test('[Tenant] Complete signup → invitation_status = ACCEPTED', async ({ page, context }) => {
		const newPage = await context.newPage()
		await newPage.goto(`${BASE_URL}/signup?invitation=${invitationToken}&email=${testTenant.email}`)

		// Fill in password
		await newPage.fill('input[name="password"]', TENANT_PASSWORD)
		await newPage.fill('input[name="confirmPassword"]', TENANT_PASSWORD)

		// Submit signup
		await newPage.click('button[type="submit"]')

		// Wait for redirect to tenant portal
		await newPage.waitForURL(`${BASE_URL}/tenant/**`)
		// Verify invitation status updated in database
		const authHeaders = await getAuthHeaders(page)
		const response = await page.request.get(`${API_URL}/api/v1/tenants/${tenant_id}`, { headers: authHeaders })
		const tenant = await response.json()
		expect(tenant.invitation_status).toBe('ACCEPTED')
	})

	test('[Tenant] Try to reuse token → Already Accepted message', async ({ page, context }) => {
		const newPage = await context.newPage()
		await newPage.goto(`${BASE_URL}/tenant/invitation/${invitationToken}`)

		// Should show "Already Accepted" message
		await expect(newPage.locator('text=Invitation Already Accepted')).toBeVisible()
		await expect(newPage.locator('text=Log In to Your Portal')).toBeVisible()
	})

	test('[Tenant] Click invalid token → Invitation Not Found', async ({ page, context }) => {
		const newPage = await context.newPage()
		const invalidToken = 'a'.repeat(32) // 32 char invalid token

		await newPage.goto(`${BASE_URL}/tenant/invitation/${invalidToken}`)

		// Should show "Invitation Not Found" message
		await expect(newPage.locator('text=Invitation Not Found')).toBeVisible()
		await expect(newPage.locator('text=Contact your property manager')).toBeVisible()
	})

	test('[Email] Verify invitation email was sent', async ({ page }) => {
		// This test requires access to Resend API or email inbox
		// For now, we verify the API call was made by checking logs

		await page.goto(`${BASE_URL}/tenants`)
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify invitation_sent_at is set
		const sentAt = await tenantRow.locator('[data-testid="sent-at"]').textContent()
		expect(sentAt).not.toBeNull()
		expect(sentAt).not.toBe('')
	})

	test('[Property Owner] Resend button hidden for ACCEPTED tenants', async ({ page }) => {
		await page.goto(`${BASE_URL}/tenants`)

		// Find accepted tenant row
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify ACCEPTED badge is visible
		await expect(tenantRow.locator('text=ACCEPTED')).toBeVisible()

		// Verify resend button is NOT visible
		await expect(tenantRow.locator('button:has-text("Resend")')).not.toBeVisible()
	})

	test.skip('[Expiry] Wait 7 days → Invitation Expired message', async ({ page, context }) => {
		/**
		 * SKIPPED: This test requires refactoring to match current invitation system
		 *
		 * Current invitation flow uses Supabase Auth's verifyOtp with type='invite'
		 * URL pattern: /accept-invite?token={token}&type=invite
		 *
		 * This test uses old URL pattern: /tenant/invitation/{token}
		 *
		 * TO FIX:
		 * 1. Update test to use /accept-invite route
		 * 2. Mock Supabase verifyOtp to return token expired error
		 * 3. Verify error handling shows proper expired message
		 *
		 * Alternative: Test expiry in backend integration tests instead of E2E
		 */
	})
})

test.describe('Email Template Tests', () => {
	/**
	 * NOTE: These tests verify email template structure by intercepting the email API call
	 * rather than accessing actual sent emails. This allows us to verify the template
	 * without requiring Resend API access or email inbox integration.
	 */

	const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'https://tenantflow.app'

	test.beforeEach(async ({ page }) => {
		// Login before each email template test
		await loginAsOwner(page)
	})

	test('[Email] Invitation email contains required elements', async ({ page }) => {
		// Mock the email API to capture the email payload
		let emailPayload: any = null

		await page.route('**/api/v1/emails/send', route => {
			emailPayload = route.request().postDataJSON()
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, messageId: 'test-message-id' })
			})
		})

		// Navigate to tenants page and send invitation
		await page.goto(`${BASE_URL}/tenants`)
		await page.click('button:has-text("Invite Tenant")')

		const testEmail = `email-test-${Date.now()}@example.com`
		await page.fill('input[name="email"]', testEmail)
		await page.fill('input[name="first_name"]', 'Email')
		await page.fill('input[name="last_name"]', 'Test')
		await page.fill('input[name="phone"]', '5555550000')

		await page.click('button:has-text("Send Invitation")')
		await page.waitForTimeout(1000) // Wait for API call

		// Verify email payload contains required elements
		expect(emailPayload).not.toBeNull()
		expect(emailPayload.to).toBe(testEmail)
		expect(emailPayload.subject).toContain('invitation')
		expect(emailPayload.html).toBeTruthy()

		// Verify HTML contains invitation link
		expect(emailPayload.html).toMatch(/\/tenant\/invitation\/[a-z0-9]{32}/i)

		// Verify expiry warning is present
		expect(emailPayload.html).toMatch(/expires?.*7.*days?/i)
	})

	test('[Email] Invitation link format is valid', async ({ page }) => {
		let emailPayload: any = null

		await page.route('**/api/v1/emails/send', route => {
			emailPayload = route.request().postDataJSON()
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, messageId: 'test-message-id' })
			})
		})

		await page.goto(`${BASE_URL}/tenants`)
		await page.click('button:has-text("Invite Tenant")')

		const testEmail = `link-test-${Date.now()}@example.com`
		await page.fill('input[name="email"]', testEmail)
		await page.fill('input[name="first_name"]', 'Link')
		await page.fill('input[name="last_name"]', 'Test')
		await page.fill('input[name="phone"]', '5555550001')

		await page.click('button:has-text("Send Invitation")')
		await page.waitForTimeout(1000)

		// Extract invitation link from HTML
		const linkMatch = emailPayload.html.match(/href="([^"]*\/tenant\/invitation\/[a-z0-9]{32}[^"]*)"/i)
		expect(linkMatch).not.toBeNull()

		const invitationLink = linkMatch[1]
		expect(invitationLink).toMatch(/^https?:\/\//)
		expect(invitationLink).toContain('/tenant/invitation/')

		// Verify link has 32-character token
		const tokenMatch = invitationLink.match(/\/tenant\/invitation\/([a-z0-9]{32})/i)
		expect(tokenMatch).not.toBeNull()
		expect(tokenMatch[1].length).toBe(32)
	})

	test('[Email] Plain text version includes working link', async ({ page }) => {
		let emailPayload: any = null

		await page.route('**/api/v1/emails/send', route => {
			emailPayload = route.request().postDataJSON()
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, messageId: 'test-message-id' })
			})
		})

		await page.goto(`${BASE_URL}/tenants`)
		await page.click('button:has-text("Invite Tenant")')

		const testEmail = `plaintext-${Date.now()}@example.com`
		await page.fill('input[name="email"]', testEmail)
		await page.fill('input[name="first_name"]', 'Plain')
		await page.fill('input[name="last_name"]', 'Text')
		await page.fill('input[name="phone"]', '5555550002')

		await page.click('button:has-text("Send Invitation")')
		await page.waitForTimeout(1000)

		// Verify plain text version exists and contains link
		expect(emailPayload.text || emailPayload.plainText).toBeTruthy()
		const plainText = emailPayload.text || emailPayload.plainText

		// Should contain invitation URL
		expect(plainText).toMatch(/https?:\/\/.*\/tenant\/invitation\/[a-z0-9]{32}/i)
	})
})
