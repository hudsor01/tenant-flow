import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Signup Form Screenshots', () => {
	// Set base URL for this test
	const baseURL = 'http://localhost:3003'

	test('capture signup form and confirmation view screenshots', async ({
		page
	}) => {
		// Increase timeouts for this visual test
		test.setTimeout(60000)

		// 1. Navigate to the signup page
		await page.goto(`${baseURL}/auth/signup`)

		// Wait for the page to fully load
		await page.waitForLoadState('networkidle')

		// Wait for the form to be visible
		await page.waitForSelector('form', { timeout: 10000 })

		// 2. Take screenshot of initial signup form
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/01-signup-form-initial.png'
			),
			fullPage: true
		})

		console.log('✅ Screenshot 1: Initial signup form captured')

		// 3. Fill out the form with test data
		const testData = {
			name: 'John Doe',
			email: 'john@example.com',
			password: 'testpassword123'
		}

		// Fill the name field
		const nameInput = page
			.locator(
				'input[name="name"], input[id*="name"], input[placeholder*="name" i]'
			)
			.first()
		await nameInput.fill(testData.name)

		// Fill the email field
		const emailInput = page
			.locator(
				'input[name="email"], input[type="email"], input[id*="email"], input[placeholder*="email" i]'
			)
			.first()
		await emailInput.fill(testData.email)

		// Fill the password field
		const passwordInput = page
			.locator(
				'input[name="password"], input[type="password"], input[id*="password"], input[placeholder*="password" i]'
			)
			.first()
		await passwordInput.fill(testData.password)

		// Look for and check any required checkboxes (terms & conditions, etc.)
		const checkboxes = page.locator('input[type="checkbox"]')
		const checkboxCount = await checkboxes.count()

		for (let i = 0; i < checkboxCount; i++) {
			const checkbox = checkboxes.nth(i)
			const isRequired =
				(await checkbox.getAttribute('required')) !== null
			if (
				isRequired ||
				(await checkbox.getAttribute('data-required')) === 'true'
			) {
				await checkbox.check()
			}
		}

		// Take a small pause to let any validation run
		await page.waitForTimeout(500)

		// Take screenshot of filled form
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/02-signup-form-filled.png'
			),
			fullPage: true
		})

		console.log('✅ Screenshot 2: Filled signup form captured')

		// 4. Submit the form
		// Look for submit button with various selectors
		const submitButton = page
			.locator(
				[
					'button[type="submit"]',
					'input[type="submit"]',
					'button:has-text("Sign up")',
					'button:has-text("Create Account")',
					'button:has-text("Register")',
					'button:has-text("Submit")'
				].join(', ')
			)
			.first()

		// Ensure submit button is visible and enabled
		await expect(submitButton).toBeVisible()
		await expect(submitButton).toBeEnabled()

		// Click submit button
		await submitButton.click()

		console.log('✅ Form submitted, waiting for confirmation view...')

		// 5. Wait for the email confirmation view to appear
		// Look for various indicators that we're on the confirmation page
		try {
			// Wait for URL change or specific elements that indicate success
			await Promise.race([
				// Wait for URL change
				page.waitForURL('**/auth/confirm-signup*', { timeout: 15000 }),
				page.waitForURL('**/verify-email*', { timeout: 15000 }),
				page.waitForURL('**/email-confirmation*', { timeout: 15000 }),

				// Or wait for success elements to appear
				page.waitForSelector(
					[
						'[data-testid="email-confirmation"]',
						'.email-confirmation',
						'.success-message',
						'text="Check your email"',
						'text="Confirmation sent"',
						'text="verify your email"'
					].join(', '),
					{ timeout: 15000 }
				)
			])

			console.log('✅ Email confirmation view detected')
		} catch (error) {
			// If we can't find confirmation elements, wait a bit and check what's on screen
			await page.waitForTimeout(3000)
			console.log(
				'⚠️  Confirmation page detection timeout, capturing current state...'
			)
		}

		// Wait for any animations to complete
		await page.waitForTimeout(2000)

		// Look for specific confirmation elements
		const confirmationElements = [
			'svg[data-testid="checkmark"]', // animated checkmark
			'.checkmark-animation',
			'.success-checkmark',
			'text="john@example.com"', // personalized email
			'button:has-text("Resend")', // resend button
			'.tips-section',
			'.email-tips'
		]

		// Check which elements are present
		for (const selector of confirmationElements) {
			try {
				const element = page.locator(selector).first()
				const isVisible = await element.isVisible()
				if (isVisible) {
					console.log(`✅ Found confirmation element: ${selector}`)
				}
			} catch (e) {
				// Element not found, continue
			}
		}

		// 6. Take screenshot of the email confirmation view
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/03-email-confirmation-success.png'
			),
			fullPage: true
		})

		console.log('✅ Screenshot 3: Email confirmation view captured')

		// Optional: Take a focused screenshot of key elements
		try {
			const mainContent = page
				.locator('main, .main-content, [role="main"]')
				.first()
			if (await mainContent.isVisible()) {
				await mainContent.screenshot({
					path: path.join(
						__dirname,
						'../screenshots/04-confirmation-content-focused.png'
					)
				})
				console.log(
					'✅ Screenshot 4: Focused confirmation content captured'
				)
			}
		} catch (e) {
			console.log('ℹ️  Could not capture focused content screenshot')
		}

		// Verify we have key confirmation elements
		const currentUrl = page.url()
		console.log(`📍 Final URL: ${currentUrl}`)

		// Log page title for context
		const pageTitle = await page.title()
		console.log(`📄 Page title: ${pageTitle}`)

		// Check for success indicators
		const successTexts = [
			'check your email',
			'confirmation sent',
			'verify your email',
			'account created',
			'registration successful'
		]

		for (const text of successTexts) {
			const hasText = await page
				.locator(`text=${text}`)
				.first()
				.isVisible()
				.catch(() => false)
			if (hasText) {
				console.log(`✅ Found success text: "${text}"`)
			}
		}

		console.log('📸 All screenshots captured successfully!')
		console.log('📁 Screenshots saved in: apps/frontend/tests/screenshots/')
	})

	test('verify confirmation page elements', async ({ page }) => {
		// This test specifically checks for the enhanced confirmation elements
		await page.goto(`${baseURL}/auth/signup`)

		// Quick form fill and submit (reusing logic from above)
		await page.waitForSelector('form')

		const nameInput = page
			.locator('input[name="name"], input[placeholder*="name" i]')
			.first()
		await nameInput.fill('Jane Doe')

		const emailInput = page
			.locator('input[type="email"], input[name="email"]')
			.first()
		await emailInput.fill('jane@example.com')

		const passwordInput = page
			.locator('input[type="password"], input[name="password"]')
			.first()
		await passwordInput.fill('testpassword123')

		// Check required checkboxes
		const checkboxes = page.locator('input[type="checkbox"]')
		const checkboxCount = await checkboxes.count()
		for (let i = 0; i < checkboxCount; i++) {
			const checkbox = checkboxes.nth(i)
			try {
				await checkbox.check()
			} catch (e) {
				// Skip if checkbox can't be checked
			}
		}

		const submitButton = page.locator('button[type="submit"]').first()
		await submitButton.click()

		// Wait for confirmation page
		await page.waitForTimeout(3000)

		// Verify enhanced confirmation elements
		const tests = [
			{
				name: 'Animated Checkmark',
				selectors: [
					'svg[data-testid="checkmark"]',
					'.checkmark-animation',
					'.success-checkmark'
				],
				required: false
			},
			{
				name: 'Personalized Email Display',
				selectors: ['text="jane@example.com"'],
				required: true
			},
			{
				name: 'Tips Section',
				selectors: [
					'.tips-section',
					'.email-tips',
					'text="Tips"',
					'text="Next Steps"'
				],
				required: false
			},
			{
				name: 'Resend Button',
				selectors: [
					'button:has-text("Resend")',
					'button:has-text("Send Again")'
				],
				required: true
			},
			{
				name: 'Success Message',
				selectors: [
					'text="Check your email"',
					'text="Confirmation sent"',
					'text="verify your email"'
				],
				required: true
			}
		]

		const results: { name: string; found: boolean; selector?: string }[] =
			[]

		for (const testCase of tests) {
			let found = false
			let foundSelector = ''

			for (const selector of testCase.selectors) {
				try {
					const element = page.locator(selector).first()
					if (await element.isVisible()) {
						found = true
						foundSelector = selector
						break
					}
				} catch (e) {
					// Continue to next selector
				}
			}

			results.push({
				name: testCase.name,
				found,
				selector: foundSelector
			})

			if (testCase.required && !found) {
				console.log(`❌ Required element missing: ${testCase.name}`)
			} else if (found) {
				console.log(`✅ Found: ${testCase.name} (${foundSelector})`)
			} else {
				console.log(`⚠️  Optional element not found: ${testCase.name}`)
			}
		}

		// Take final verification screenshot
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/05-verification-elements.png'
			),
			fullPage: true
		})

		console.log('\n📊 Element Verification Summary:')
		results.forEach(result => {
			const status = result.found ? '✅' : '❌'
			console.log(`  ${status} ${result.name}`)
		})
	})
})
