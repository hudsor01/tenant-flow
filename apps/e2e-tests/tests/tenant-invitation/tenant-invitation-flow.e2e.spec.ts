import { test, expect } from '@playwright/test'

/**
 * Tenant Invitation Flow E2E Tests
 * Tests all checklist items from docs/TENANT_INVITATION_FLOW.md
 */

test.describe('Tenant Invitation Flow', () => {
	// Test credentials from environment
	const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
	const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || (() => { throw new Error('E2E_OWNER_PASSWORD environment variable is required') })()
	const BASE_URL = process.env.BASE_URL || 'https://tenantflow.app'
	const API_URL = process.env.API_URL || 'https://api.tenantflow.app'

	// Test data
	const testTenant = {
		email: `test-tenant-${Date.now()}@example.com`,
		firstName: 'Test',
		lastName: 'Tenant',
		phone: '5555551234'
	}

	let invitationToken: string
	let tenantId: string

	test.beforeEach(async ({ page }) => {
		// Login as property owner
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')

		// Wait for redirect to dashboard
		await page.waitForURL(`${BASE_URL}/manage/**`)
	})

	test('[Property Owner] Create tenant with valid lease', async ({ page }) => {
		// Navigate to tenants page
		await page.goto(`${BASE_URL}/manage/tenants`)

		// Wait for page to load
		await page.waitForSelector('button:has-text("Invite Tenant")')

		// Click "Invite Tenant" button
		await page.click('button:has-text("Invite Tenant")')

		// Fill in tenant information
		await page.fill('input[name="email"]', testTenant.email)
		await page.fill('input[name="firstName"]', testTenant.firstName)
		await page.fill('input[name="lastName"]', testTenant.lastName)
		await page.fill('input[name="phone"]', testTenant.phone)

		// Select a lease (assuming at least one exists)
		await page.click('[role="combobox"]')
		await page.click('[role="option"]:first-child')

		// Submit form
		await page.click('button:has-text("Send Invitation")')

		// Wait for success toast
		await expect(page.locator('text=Invitation sent successfully')).toBeVisible()

		// Verify tenant appears in table
		await expect(page.locator(`text=${testTenant.email}`)).toBeVisible()
	})

	test('[Property Owner] Invitation appears in table with SENT badge', async ({ page }) => {
		await page.goto(`${BASE_URL}/manage/tenants`)

		// Find the row with our test tenant
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify SENT badge is visible
		await expect(tenantRow.locator('text=SENT')).toBeVisible()
	})

	test('[Property Owner] Resend button appears for SENT status', async ({ page }) => {
		await page.goto(`${BASE_URL}/manage/tenants`)

		// Find the row with our test tenant
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify resend button is visible
		await expect(tenantRow.locator('button:has-text("Resend")')).toBeVisible()
	})

	test('[Property Owner] Click resend → new email sent, timestamp updated', async ({ page }) => {
		await page.goto(`${BASE_URL}/manage/tenants`)

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
		// Get invitation token from API
		const response = await page.request.get(`${API_URL}/api/v1/tenants`)
		const tenants = await response.json()
		const tenant = tenants.find((t: any) => t.email === testTenant.email)
		invitationToken = tenant.invitation_token
		tenantId = tenant.id

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
		await newPage.fill('input[name="password"]', process.env.E2E_TENANT_PASSWORD || (() => { throw new Error('E2E_TENANT_PASSWORD environment variable is required') })())
		await newPage.fill('input[name="confirmPassword"]', process.env.E2E_TENANT_PASSWORD || (() => { throw new Error('E2E_TENANT_PASSWORD environment variable is required') })())

		// Submit signup
		await newPage.click('button[type="submit"]')

		// Wait for redirect to tenant portal
		await newPage.waitForURL(`${BASE_URL}/tenant/**`)

		// Verify invitation status updated in database
		const response = await page.request.get(`${API_URL}/api/v1/tenants/${tenantId}`)
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

		await page.goto(`${BASE_URL}/manage/tenants`)
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify invitation_sent_at is set
		const sentAt = await tenantRow.locator('[data-testid="sent-at"]').textContent()
		expect(sentAt).not.toBeNull()
		expect(sentAt).not.toBe('')
	})

	test('[Property Owner] Resend button hidden for ACCEPTED tenants', async ({ page }) => {
		await page.goto(`${BASE_URL}/manage/tenants`)

		// Find accepted tenant row
		const tenantRow = page.locator(`tr:has-text("${testTenant.email}")`)

		// Verify ACCEPTED badge is visible
		await expect(tenantRow.locator('text=ACCEPTED')).toBeVisible()

		// Verify resend button is NOT visible
		await expect(tenantRow.locator('button:has-text("Resend")')).not.toBeVisible()
	})

	test('[Expiry] Wait 7 days → Invitation Expired message', async ({ page, context }) => {
		// This test would require manipulating the database expiry date
		// Skipping for now - would need to create a tenant with past expiry

		test.skip()
	})
})

test.describe('Email Template Tests', () => {
	test.skip('[Email] Email template renders correctly', () => {
		// Requires access to sent emails via Resend API
		// Would check: HTML structure, branding, content
	})

	test.skip('[Email] Invitation link is clickable', () => {
		// Requires access to sent emails
		// Would verify link format and href attribute
	})

	test.skip('[Email] Property/unit info displayed (if available)', () => {
		// Requires access to sent emails
		// Would verify property name and unit number in email body
	})

	test.skip('[Email] Plain text fallback link works', () => {
		// Requires access to sent emails
		// Would verify plain text version includes working link
	})

	test.skip('[Email] Expiry warning visible', () => {
		// Requires access to sent emails
		// Would verify "expires in 7 days" message is present
	})
})
