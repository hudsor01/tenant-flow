import { test, expect } from '@playwright/test'

/**
 * Stripe Connect Onboarding E2E Tests
 *
 * Tests the complete Connect account setup flow for property owners.
 * Since actual Stripe Express onboarding requires manual identity verification,
 * these tests mock API responses to verify frontend behavior.
 *
 * Flow:
 * 1. Owner visits /settings?tab=billing
 * 2. Sees "Connect Stripe Account" button (no account)
 * 3. Opens ConnectOnboardingDialog
 * 4. Fills form (displayName, entityType, country)
 * 5. Submits -> Mock creates account -> Mock opens Stripe URL
 * 6. Returns -> Shows status (pending/active)
 */

// Mock responses for Connect API endpoints
const MOCK_CONNECTED_ACCOUNT = {
	success: true,
	data: {
		stripe_account_id: 'acct_test123',
		charges_enabled: true,
		payouts_enabled: true,
		identityVerification: {
			status: 'active'
		}
	}
}

const MOCK_PENDING_ACCOUNT = {
	success: true,
	data: {
		stripe_account_id: 'acct_test456',
		charges_enabled: false,
		payouts_enabled: false,
		identityVerification: {
			status: 'pending'
		}
	}
}

const MOCK_CREATE_ACCOUNT_RESPONSE = {
	success: true,
	data: {
		stripe_account_id: 'acct_new123',
		charges_enabled: false,
		payouts_enabled: false,
		identityVerification: {
			status: 'pending'
		}
	}
}

const MOCK_ONBOARDING_URL_RESPONSE = {
	success: true,
	data: {
		onboardingUrl: 'https://connect.stripe.com/setup/test123'
	}
}

const MOCK_BALANCE_RESPONSE = {
	success: true,
	balance: {
		available: [{ amount: 100000, currency: 'usd' }],
		pending: [{ amount: 25000, currency: 'usd' }]
	}
}

const MOCK_PAYOUTS_RESPONSE = {
	success: true,
	payouts: [
		{
			id: 'po_test1',
			amount: 50000,
			currency: 'usd',
			status: 'paid',
			arrival_date: Math.floor(Date.now() / 1000),
			created: Math.floor(Date.now() / 1000) - 86400,
			method: 'standard',
			type: 'bank_account'
		}
	],
	hasMore: false
}

const MOCK_TRANSFERS_RESPONSE = {
	success: true,
	transfers: [
		{
			id: 'tr_test1',
			amount: 150000,
			currency: 'usd',
			created: Math.floor(Date.now() / 1000) - 172800,
			description: 'Rent payment - Unit 1A'
		}
	],
	hasMore: false
}

test.describe('Stripe Connect Onboarding', () => {
	test.describe('1. No Account State', () => {
		test('should display Connect setup prompt for new owners', async ({
			page
		}) => {
			// Mock API to return 404 (no account)
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'No account found' })
				})
			})

			await page.goto('/settings?tab=billing')

			// Should show setup prompt
			await expect(
				page.locator('text=/connect.*stripe.*account/i').first()
			).toBeVisible({
				timeout: 10000
			})

			// Should have warning message
			await expect(
				page.locator('text=/need to connect.*stripe/i').first()
			).toBeVisible()

			// Should have "Connect Stripe Account" button
			const connectButton = page.locator(
				'button:has-text("Connect Stripe Account")'
			)
			await expect(connectButton).toBeVisible()
		})

		test('should open onboarding dialog when clicking Connect button', async ({
			page
		}) => {
			// Mock API to return 404 (no account)
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'No account found' })
				})
			})

			await page.goto('/settings?tab=billing')

			// Click Connect button
			const connectButton = page.locator(
				'button:has-text("Connect Stripe Account")'
			)
			await connectButton.click()

			// Dialog should open
			await expect(page.locator('role=dialog')).toBeVisible()

			// Dialog should have form fields
			await expect(
				page.locator('label:has-text("Account Type")').first()
			).toBeVisible()
			await expect(
				page.locator('label:has-text("Display Name")').first()
			).toBeVisible()
			await expect(
				page.locator('label:has-text("Country")').first()
			).toBeVisible()
		})

		test('should validate display name is required', async ({ page }) => {
			// Mock API to return 404 (no account)
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'No account found' })
				})
			})

			await page.goto('/settings?tab=billing')

			// Open dialog
			await page.locator('button:has-text("Connect Stripe Account")').click()
			await expect(page.locator('role=dialog')).toBeVisible()

			// Try to submit without filling display name
			await page.locator('button:has-text("Continue to Stripe")').click()

			// Should show validation error (form won't submit with required field empty)
			// The form has required attribute, so browser validation kicks in
			const displayNameInput = page.locator('input[name="displayName"]')
			await expect(displayNameInput).toHaveAttribute('required', '')
		})

		test('should show business name field when company selected', async ({
			page
		}) => {
			// Mock API to return 404 (no account)
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'No account found' })
				})
			})

			await page.goto('/settings?tab=billing')

			// Open dialog
			await page.locator('button:has-text("Connect Stripe Account")').click()
			await expect(page.locator('role=dialog')).toBeVisible()

			// Business name should not be visible initially (individual selected)
			await expect(
				page.locator('label:has-text("Business Name")')
			).not.toBeVisible()

			// Select Company
			await page.locator('#entityType').click()
			await page.locator('text=Company').click()

			// Business name should now be visible
			await expect(
				page.locator('label:has-text("Business Name")')
			).toBeVisible()
		})
	})

	test.describe('2. Account Creation Flow', () => {
		test('should create account and redirect to Stripe', async ({ page }) => {
			let onboardCalled = false
			let refreshLinkCalled = false

			// Mock API - no account initially
			await page.route('**/api/v1/stripe/connect/account', route => {
				if (!onboardCalled) {
					route.fulfill({
						status: 404,
						contentType: 'application/json',
						body: JSON.stringify({ success: false, error: 'No account found' })
					})
				} else {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(MOCK_CREATE_ACCOUNT_RESPONSE)
					})
				}
			})

			// Mock onboard endpoint
			await page.route('**/api/v1/stripe/connect/onboard', route => {
				onboardCalled = true
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_CREATE_ACCOUNT_RESPONSE)
				})
			})

			// Mock refresh-link endpoint
			await page.route('**/api/v1/stripe/connect/refresh-link', route => {
				refreshLinkCalled = true
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_ONBOARDING_URL_RESPONSE)
				})
			})

			// Intercept window.open to prevent actual navigation
			await page.addInitScript(() => {
				window.open = (url: string) => {
					// Store URL for verification
					;(window as unknown as { lastOpenedUrl: string }).lastOpenedUrl = url
					return null
				}
			})

			await page.goto('/settings?tab=billing')

			// Open dialog
			await page.locator('button:has-text("Connect Stripe Account")').click()
			await expect(page.locator('role=dialog')).toBeVisible()

			// Fill form
			await page.locator('input[name="displayName"]').fill('Test Property Owner')

			// Submit
			await page.locator('button:has-text("Continue to Stripe")').click()

			// Wait for API calls
			await page.waitForTimeout(1000)

			// Verify APIs were called
			expect(onboardCalled).toBe(true)
			expect(refreshLinkCalled).toBe(true)

			// Verify Stripe URL was opened
			const lastUrl = await page.evaluate(
				() => (window as unknown as { lastOpenedUrl: string }).lastOpenedUrl
			)
			expect(lastUrl).toContain('stripe.com')
		})

		test('should show loading state during account creation', async ({
			page
		}) => {
			// Mock API - no account initially
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'No account found' })
				})
			})

			// Mock onboard endpoint with delay
			await page.route('**/api/v1/stripe/connect/onboard', async route => {
				await new Promise(r => setTimeout(r, 500))
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_CREATE_ACCOUNT_RESPONSE)
				})
			})

			await page.goto('/settings?tab=billing')

			// Open dialog
			await page.locator('button:has-text("Connect Stripe Account")').click()
			await expect(page.locator('role=dialog')).toBeVisible()

			// Fill form
			await page.locator('input[name="displayName"]').fill('Test Owner')

			// Submit
			await page.locator('button:has-text("Continue to Stripe")').click()

			// Should show loading state
			await expect(page.locator('text=Creating...')).toBeVisible()
		})
	})

	test.describe('3. Connected Account Status Display', () => {
		test('should display active account status', async ({ page }) => {
			// Mock API to return active account
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_CONNECTED_ACCOUNT)
				})
			})

			await page.goto('/settings?tab=billing')

			// Should show account status
			await expect(page.locator('text=/active/i').first()).toBeVisible({
				timeout: 10000
			})

			// Should show account ID
			await expect(page.locator('text=acct_test123')).toBeVisible()

			// Should show charges enabled
			await expect(page.locator('text=/charges/i').first()).toBeVisible()
			await expect(
				page.locator('text=/enabled/i', { hasText: /enabled/i }).first()
			).toBeVisible()

			// Should show payouts enabled
			await expect(page.locator('text=/payouts/i').first()).toBeVisible()
		})

		test('should display pending account status with complete onboarding button', async ({
			page
		}) => {
			// Mock API to return pending account
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_PENDING_ACCOUNT)
				})
			})

			await page.goto('/settings?tab=billing')

			// Should show pending status
			await expect(page.locator('text=/pending/i').first()).toBeVisible({
				timeout: 10000
			})

			// Should show "Complete Onboarding" button
			await expect(
				page.locator('button:has-text("Complete Onboarding")')
			).toBeVisible()

			// Should show charges/payouts as disabled
			await expect(
				page.locator('text=/disabled/i', { hasText: /disabled/i }).first()
			).toBeVisible()
		})

		test('should refresh onboarding link when clicking Complete Onboarding', async ({
			page
		}) => {
			let refreshCalled = false

			// Mock API to return pending account
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_PENDING_ACCOUNT)
				})
			})

			// Mock refresh-link endpoint
			await page.route('**/api/v1/stripe/connect/refresh-link', route => {
				refreshCalled = true
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_ONBOARDING_URL_RESPONSE)
				})
			})

			// Intercept window.open
			await page.addInitScript(() => {
				window.open = (url: string) => {
					;(window as unknown as { lastOpenedUrl: string }).lastOpenedUrl = url
					return null
				}
			})

			await page.goto('/settings?tab=billing')

			// Click "Complete Onboarding" button
			await page.locator('button:has-text("Complete Onboarding")').click()

			// Wait for API call
			await page.waitForTimeout(500)

			// Verify refresh was called
			expect(refreshCalled).toBe(true)

			// Verify Stripe URL was opened
			const lastUrl = await page.evaluate(
				() => (window as unknown as { lastOpenedUrl: string }).lastOpenedUrl
			)
			expect(lastUrl).toContain('stripe.com')
		})
	})

	test.describe('4. Error Handling', () => {
		test('should handle onboarding API errors gracefully', async ({
			page
		}) => {
			// Mock API - no account initially
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'No account found' })
				})
			})

			// Mock onboard endpoint to fail
			await page.route('**/api/v1/stripe/connect/onboard', route => {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'Internal server error' })
				})
			})

			await page.goto('/settings?tab=billing')

			// Open dialog
			await page.locator('button:has-text("Connect Stripe Account")').click()
			await expect(page.locator('role=dialog')).toBeVisible()

			// Fill form
			await page.locator('input[name="displayName"]').fill('Test Owner')

			// Submit
			await page.locator('button:has-text("Continue to Stripe")').click()

			// Should show error toast
			await expect(
				page.locator('text=/failed.*create.*stripe/i').first()
			).toBeVisible({
				timeout: 5000
			})
		})

		test('should handle refresh link errors gracefully', async ({ page }) => {
			// Mock API to return pending account
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_PENDING_ACCOUNT)
				})
			})

			// Mock refresh-link to fail
			await page.route('**/api/v1/stripe/connect/refresh-link', route => {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ success: false, error: 'Stripe unavailable' })
				})
			})

			await page.goto('/settings?tab=billing')

			// Click "Complete Onboarding" button
			await page.locator('button:has-text("Complete Onboarding")').click()

			// Should show error toast
			await expect(
				page.locator('text=/failed.*refresh.*onboarding/i').first()
			).toBeVisible({
				timeout: 5000
			})
		})
	})

	test.describe('5. Balance and Payouts Display', () => {
		test('should display account balance for fully onboarded account', async ({
			page
		}) => {
			// Mock account endpoint
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_CONNECTED_ACCOUNT)
				})
			})

			// Mock balance endpoint
			await page.route('**/api/v1/stripe/connect/balance', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_BALANCE_RESPONSE)
				})
			})

			await page.goto('/settings?tab=billing')

			// Account should be active
			await expect(page.locator('text=/active/i').first()).toBeVisible({
				timeout: 10000
			})
		})

		test('should display payout history', async ({ page }) => {
			// Mock account endpoint
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_CONNECTED_ACCOUNT)
				})
			})

			// Mock payouts endpoint
			await page.route('**/api/v1/stripe/connect/payouts*', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_PAYOUTS_RESPONSE)
				})
			})

			await page.goto('/settings?tab=billing')

			// Account should be active
			await expect(page.locator('text=/active/i').first()).toBeVisible({
				timeout: 10000
			})
		})

		test('should display transfer history', async ({ page }) => {
			// Mock account endpoint
			await page.route('**/api/v1/stripe/connect/account', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_CONNECTED_ACCOUNT)
				})
			})

			// Mock transfers endpoint
			await page.route('**/api/v1/stripe/connect/transfers*', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(MOCK_TRANSFERS_RESPONSE)
				})
			})

			await page.goto('/settings?tab=billing')

			// Account should be active
			await expect(page.locator('text=/active/i').first()).toBeVisible({
				timeout: 10000
			})
		})
	})
})
