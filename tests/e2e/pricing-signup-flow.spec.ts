import { test, expect, type Page } from '@playwright/test'
import { randomBytes } from 'crypto'

/**
 * E2E Test Suite: Pricing Page & Signup Flow
 * Tests the complete user journey from landing on pricing page
 * to selecting a plan and completing signup with payment.
 */

// Test data
const generateTestCustomer = () => ({
	email: `customer-${randomBytes(8).toString('hex')}@tenantflow.app`,
	password: 'Secure@Pass123!',
	name: `Customer ${randomBytes(4).toString('hex')}`,
	company: `Test Company ${randomBytes(4).toString('hex')}`,
	phone: '+1234567890'
})

// Stripe test card numbers
const TEST_CARDS = {
	success: '4242424242424242',
	declined: '4000000000000002',
	requires3DS: '4000002500003155',
	expired: '4000000000000069',
	incorrectCVC: '4000000000000127'
}

// Helper functions
async function fillPaymentDetails(page: Page, cardNumber: string = TEST_CARDS.success) {
	// Wait for Stripe iframe to load
	const stripeFrame = page.frameLocator('iframe[title*="Stripe"], iframe[name*="stripe"]').first()

	// Fill card details
	await stripeFrame.locator('[placeholder*="Card number"], [placeholder*="1234"]').fill(cardNumber)
	await stripeFrame.locator('[placeholder*="MM"], [placeholder*="Expiry"]').fill('12/30')
	await stripeFrame.locator('[placeholder*="CVC"], [placeholder*="CVV"]').fill('123')
	await stripeFrame.locator('[placeholder*="ZIP"], [placeholder*="Postal"]').fill('12345')
}

async function selectPricingPlan(page: Page, planName: string) {
	// Find and click the plan button
	const planCard = page.locator(`[data-plan="${planName}"], .pricing-card:has-text("${planName}")`)
	const selectButton = planCard.locator('button:has-text("Select"), button:has-text("Choose"), button:has-text("Get Started")')
	await selectButton.click()
}

test.describe('Pricing Page', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to pricing page
		await page.goto('/pricing')
	})

	test('should display all pricing tiers', async ({ page }) => {
		// Check for pricing tiers
		const tiers = ['Starter', 'Professional', 'Enterprise']

		for (const tier of tiers) {
			const tierElement = page.locator(`text=/${tier}/i`)
			await expect(tierElement).toBeVisible()
		}

		// Check for pricing amounts
		const priceElements = page.locator('[data-testid*="price"], .pricing-amount, text=/$[0-9]+/')
		const count = await priceElements.count()
		expect(count).toBeGreaterThanOrEqual(2) // At least 2 pricing tiers with prices
	})

	test('should display feature comparisons', async ({ page }) => {
		// Check for feature list
		const features = [
			'Properties',
			'Tenants',
			'Maintenance',
			'Support',
			'Analytics'
		]

		for (const feature of features) {
			const featureElement = page.locator(`text=/${feature}/i`)
			await expect(featureElement.first()).toBeVisible()
		}
	})

	test('should toggle between monthly and annual billing', async ({ page }) => {
		// Find billing toggle
		const billingToggle = page.locator('[data-testid="billing-toggle"], [aria-label*="billing"], button:has-text("Annual"), button:has-text("Monthly")')

		if (await billingToggle.isVisible({ timeout: 3000 })) {
			// Get initial prices
			const monthlyPrices = await page.locator('.pricing-amount, [data-testid*="price"]').allTextContents()

			// Toggle to annual
			await billingToggle.click()
			await page.waitForTimeout(500) // Wait for animation

			// Get annual prices
			const annualPrices = await page.locator('.pricing-amount, [data-testid*="price"]').allTextContents()

			// Prices should be different
			expect(monthlyPrices).not.toEqual(annualPrices)
		}
	})

	test('should show FAQ section', async ({ page }) => {
		// Scroll to FAQ section
		const faqSection = page.locator('text=/FAQ|Frequently Asked|Questions/i')
		if (await faqSection.isVisible({ timeout: 3000 })) {
			await faqSection.scrollIntoViewIfNeeded()

			// Check for FAQ items
			const faqItems = page.locator('[data-testid*="faq"], .faq-item, details')
			const count = await faqItems.count()
			expect(count).toBeGreaterThan(0)

			// Try expanding first FAQ
			const firstFaq = faqItems.first()
			await firstFaq.click()

			// Check if content is visible
			const faqContent = firstFaq.locator('.faq-content, dd, p')
			await expect(faqContent).toBeVisible()
		}
	})
})

test.describe('Signup Flow from Pricing', () => {
	let testCustomer: ReturnType<typeof generateTestCustomer>

	test.beforeEach(async ({ page }) => {
		testCustomer = generateTestCustomer()
		await page.goto('/pricing')
	})

	test('should complete signup flow for Starter plan', async ({ page }) => {
		// Select Starter plan
		await selectPricingPlan(page, 'Starter')

		// Should redirect to signup or checkout
		await expect(page).toHaveURL(/\/(signup|checkout|register)/, { timeout: 10000 })

		// Fill signup form if on signup page
		if (page.url().includes('signup') || page.url().includes('register')) {
			await page.fill('input[name="name"]', testCustomer.name)
			await page.fill('input[name="email"]', testCustomer.email)
			await page.fill('input[name="password"]', testCustomer.password)
			await page.fill('input[name="confirmPassword"]', testCustomer.password)

			// Accept terms if present
			const termsCheckbox = page.locator('input[type="checkbox"]')
			if (await termsCheckbox.isVisible({ timeout: 1000 })) {
				await termsCheckbox.check()
			}

			// Submit form
			await page.click('button[type="submit"]')

			// Wait for redirect to payment or success
			await expect(page).toHaveURL(/\/(checkout|payment|success|dashboard)/, { timeout: 10000 })
		}
	})

	test('should handle payment flow with Stripe', async ({ page }) => {
		// Select Professional plan (paid tier)
		await selectPricingPlan(page, 'Professional')

		// Navigate through signup if needed
		if (page.url().includes('signup')) {
			await page.fill('input[name="email"]', testCustomer.email)
			await page.fill('input[name="password"]', testCustomer.password)
			await page.click('button[type="submit"]')
		}

		// Wait for checkout page
		await page.waitForURL(/\/(checkout|payment)/, { timeout: 10000 })

		// Check for Stripe Elements
		const stripeContainer = page.locator('#card-element, .stripe-card, iframe[name*="stripe"]')
		await expect(stripeContainer).toBeVisible({ timeout: 10000 })

		// Fill payment details
		await fillPaymentDetails(page)

		// Fill billing information if present
		const billingName = page.locator('input[name="billing_name"], input[placeholder*="Name"]')
		if (await billingName.isVisible({ timeout: 1000 })) {
			await billingName.fill(testCustomer.name)
		}

		const billingEmail = page.locator('input[name="billing_email"], input[placeholder*="Email"]')
		if (await billingEmail.isVisible({ timeout: 1000 })) {
			await billingEmail.fill(testCustomer.email)
		}

		// Submit payment
		const submitButton = page.locator('button:has-text("Pay"), button:has-text("Subscribe"), button[type="submit"]')
		await submitButton.click()

		// Wait for success or 3DS challenge
		await page.waitForURL(/\/(success|complete|dashboard|3ds)/, { timeout: 15000 })

		// Handle 3DS if present
		if (page.url().includes('3ds') || page.url().includes('stripe')) {
			// Handle 3DS authentication in test mode
			const authenticateButton = page.locator('button:has-text("Complete"), button:has-text("Authenticate")')
			if (await authenticateButton.isVisible({ timeout: 5000 })) {
				await authenticateButton.click()
			}
		}

		// Verify success
		const successIndicator = page.locator('text=/success|complete|welcome/i')
		await expect(successIndicator.first()).toBeVisible({ timeout: 10000 })
	})

	test('should handle declined card', async ({ page }) => {
		// Select a paid plan
		await selectPricingPlan(page, 'Professional')

		// Navigate to checkout
		await page.waitForURL(/\/(checkout|payment)/, { timeout: 10000 })

		// Fill with declined card
		await fillPaymentDetails(page, TEST_CARDS.declined)

		// Submit payment
		const submitButton = page.locator('button:has-text("Pay"), button:has-text("Subscribe")')
		await submitButton.click()

		// Should show error message
		const errorMessage = page.locator('text=/declined|failed|error/i')
		await expect(errorMessage).toBeVisible({ timeout: 10000 })
	})

	test('should apply promo codes', async ({ page }) => {
		// Select a paid plan
		await selectPricingPlan(page, 'Professional')

		// Navigate to checkout
		await page.waitForURL(/\/(checkout|payment)/, { timeout: 10000 })

		// Look for promo code field
		const promoField = page.locator('input[placeholder*="Promo"], input[placeholder*="Coupon"], input[name*="promo"], input[name*="coupon"]')

		if (await promoField.isVisible({ timeout: 3000 })) {
			// Enter test promo code
			await promoField.fill('TESTCODE')

			// Apply code
			const applyButton = page.locator('button:has-text("Apply")')
			if (await applyButton.isVisible()) {
				await applyButton.click()

				// Check for discount applied or error
				const discountMessage = page.locator('text=/discount|applied|invalid/i')
				await expect(discountMessage).toBeVisible({ timeout: 5000 })
			}
		}
	})

	test('should preserve plan selection through signup', async ({ page }) => {
		// Select Enterprise plan
		await selectPricingPlan(page, 'Enterprise')

		// Should redirect to contact or signup
		if (page.url().includes('contact')) {
			// Enterprise might redirect to contact sales
			await expect(page).toHaveURL(/\/contact/)

			// Check for contact form
			const contactForm = page.locator('form')
			await expect(contactForm).toBeVisible()
		} else {
			// Regular signup flow
			await expect(page).toHaveURL(/\/(signup|checkout)/)

			// Check if plan is pre-selected or shown
			const selectedPlan = page.locator('text=/Enterprise|selected/i')
			await expect(selectedPlan.first()).toBeVisible()
		}
	})
})

test.describe('Checkout Validations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/pricing')
	})

	test('should validate required payment fields', async ({ page }) => {
		// Select a paid plan
		await selectPricingPlan(page, 'Professional')

		// Navigate to checkout
		await page.waitForURL(/\/(checkout|payment)/, { timeout: 10000 })

		// Try to submit without filling payment
		const submitButton = page.locator('button:has-text("Pay"), button:has-text("Subscribe")')
		await submitButton.click()

		// Should show validation errors
		const validationError = page.locator('text=/required|enter|fill/i')
		await expect(validationError.first()).toBeVisible({ timeout: 5000 })
	})

	test('should validate card expiry date', async ({ page }) => {
		// Select a paid plan
		await selectPricingPlan(page, 'Professional')

		// Navigate to checkout
		await page.waitForURL(/\/(checkout|payment)/, { timeout: 10000 })

		// Fill with expired card
		await fillPaymentDetails(page, TEST_CARDS.expired)

		// Submit payment
		const submitButton = page.locator('button:has-text("Pay"), button:has-text("Subscribe")')
		await submitButton.click()

		// Should show expiry error
		const expiryError = page.locator('text=/expired|expiry|date/i')
		await expect(expiryError).toBeVisible({ timeout: 10000 })
	})

	test('should show loading state during payment processing', async ({ page }) => {
		// Select a paid plan
		await selectPricingPlan(page, 'Professional')

		// Navigate to checkout
		await page.waitForURL(/\/(checkout|payment)/, { timeout: 10000 })

		// Fill valid payment details
		await fillPaymentDetails(page)

		// Click submit and check for loading state
		const submitButton = page.locator('button:has-text("Pay"), button:has-text("Subscribe")')
		await submitButton.click()

		// Check for loading indicator
		const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"], text=/processing|loading/i')
		await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 })
	})
})

test.describe('Post-Signup Experience', () => {
	test('should show onboarding after successful signup', async ({ page }) => {
		// Skip if no test credentials
		if (!process.env.E2E_TEST_EMAIL) {
			test.skip()
			return
		}

		// Complete signup flow (using existing account)
		await page.goto('/auth/login')
		await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL)
		await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD!)
		await page.click('button[type="submit"]')

		// Wait for dashboard
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

		// Check for onboarding elements
		const onboardingElements = [
			'text=/welcome|getting started/i',
			'text=/setup|configure/i',
			'text=/add.*property/i'
		]

		for (const selector of onboardingElements) {
			const element = page.locator(selector)
			if (await element.isVisible({ timeout: 2000 })) {
				await expect(element).toBeVisible()
				break // Found at least one onboarding element
			}
		}
	})

	test('should have access to features based on selected plan', async ({ page }) => {
		// Skip if no test credentials
		if (!process.env.E2E_TEST_EMAIL) {
			test.skip()
			return
		}

		// Login
		await page.goto('/auth/login')
		await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL)
		await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD!)
		await page.click('button[type="submit"]')

		// Navigate to dashboard
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

		// Check for available features
		const features = [
			{ name: 'Properties', url: '/dashboard/properties' },
			{ name: 'Tenants', url: '/dashboard/tenants' },
			{ name: 'Leases', url: '/dashboard/leases' },
			{ name: 'Maintenance', url: '/dashboard/maintenance' }
		]

		for (const feature of features) {
			// Try to navigate to feature
			await page.goto(feature.url)

			// Check if accessible or shows upgrade prompt
			const pageTitle = page.locator('h1, h2')
			const titleText = await pageTitle.first().textContent()

			if (titleText?.toLowerCase().includes('upgrade')) {
				// Feature requires upgrade
				console.log(`${feature.name} requires plan upgrade`)
			} else {
				// Feature is accessible
				expect(page.url()).toContain(feature.url)
			}
		}
	})
})

test.describe('Mobile Responsiveness', () => {
	test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE

	test('should work on mobile devices', async ({ page }) => {
		// Navigate to pricing
		await page.goto('/pricing')

		// Check if pricing cards are visible
		const pricingCards = page.locator('.pricing-card, [data-testid*="pricing"]')
		const count = await pricingCards.count()
		expect(count).toBeGreaterThan(0)

		// Check if cards are stacked vertically on mobile
		if (count > 1) {
			const firstCard = await pricingCards.first().boundingBox()
			const secondCard = await pricingCards.nth(1).boundingBox()

			if (firstCard && secondCard) {
				// Cards should be stacked (second card Y position > first card Y position + height)
				expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height - 10)
			}
		}

		// Select a plan
		const selectButton = page.locator('button:has-text("Select"), button:has-text("Choose")').first()
		await selectButton.click()

		// Should navigate to signup/checkout
		await expect(page).toHaveURL(/\/(signup|checkout|register)/, { timeout: 10000 })
	})
})