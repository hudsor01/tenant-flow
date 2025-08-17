import { test, expect } from '@playwright/test'
import path from 'path'

// Only run on chromium for cleaner output
test.use({
	...test.use,
	viewport: { width: 1280, height: 720 }
})

test.describe('Signup Form Visual Capture - Focused', () => {
	const baseURL = 'http://localhost:3003'

	test('capture high-quality signup screenshots', async ({ page }) => {
		test.setTimeout(60000)

		console.log('🚀 Starting signup screenshot capture...')

		// Navigate to signup page
		await page.goto(`${baseURL}/auth/signup`)
		await page.waitForLoadState('networkidle')
		await page.waitForSelector('form', { timeout: 10000 })

		// Screenshot 1: Initial form
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/signup-01-initial-form.png'
			),
			fullPage: true
		})
		console.log('✅ Captured: Initial signup form')

		// Fill form
		const testData = {
			name: 'John Doe',
			email: 'john.doe@example.com',
			password: 'SecurePassword123!'
		}

		// Smart field detection
		await page
			.locator(
				'input[name="name"], input[placeholder*="name" i], input[id*="name"]'
			)
			.first()
			.fill(testData.name)
		await page
			.locator(
				'input[type="email"], input[name="email"], input[placeholder*="email" i]'
			)
			.first()
			.fill(testData.email)
		await page
			.locator(
				'input[type="password"], input[name="password"], input[placeholder*="password" i]'
			)
			.first()
			.fill(testData.password)

		// Check any required checkboxes
		const checkboxes = page.locator('input[type="checkbox"]')
		const count = await checkboxes.count()
		for (let i = 0; i < count; i++) {
			try {
				await checkboxes.nth(i).check({ timeout: 1000 })
			} catch (e) {
				// Skip if can't check
			}
		}

		await page.waitForTimeout(500) // Let form settle

		// Screenshot 2: Filled form
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/signup-02-filled-form.png'
			),
			fullPage: true
		})
		console.log('✅ Captured: Filled signup form')

		// Submit form
		const submitBtn = page
			.locator(
				'button[type="submit"], button:has-text("Sign up"), button:has-text("Create Account")'
			)
			.first()
		await expect(submitBtn).toBeVisible()
		await submitBtn.click()

		console.log('📤 Form submitted, waiting for response...')

		// Wait for potential page changes
		await page.waitForTimeout(3000)

		// Screenshot 3: Post-submit state
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/signup-03-post-submit.png'
			),
			fullPage: true
		})
		console.log('✅ Captured: Post-submit state')

		// Log current state
		const currentUrl = page.url()
		const pageTitle = await page.title()
		console.log(`📍 Current URL: ${currentUrl}`)
		console.log(`📄 Page Title: ${pageTitle}`)

		// Check for various success elements
		const successSelectors = [
			'text="check your email"',
			'text="confirmation sent"',
			'text="verify your email"',
			'text="account created"',
			'[data-testid="email-confirmation"]',
			'.email-confirmation',
			'.success-message'
		]

		let foundElements = []
		for (const selector of successSelectors) {
			try {
				const element = page.locator(selector).first()
				if (await element.isVisible({ timeout: 1000 })) {
					foundElements.push(selector)
				}
			} catch (e) {
				// Element not found
			}
		}

		if (foundElements.length > 0) {
			console.log('✅ Success elements found:', foundElements)

			// Take focused screenshot of success area
			try {
				const mainContent = page
					.locator('main, [role="main"], .main-content')
					.first()
				if (await mainContent.isVisible()) {
					await mainContent.screenshot({
						path: path.join(
							__dirname,
							'../screenshots/signup-04-success-focused.png'
						)
					})
					console.log('✅ Captured: Focused success content')
				}
			} catch (e) {
				console.log('ℹ️  Could not capture focused success area')
			}
		} else {
			console.log('⚠️  No obvious success elements found')
		}

		// Check if email appears on page (confirmation)
		const hasEmail = await page
			.locator(`text="${testData.email}"`)
			.first()
			.isVisible()
			.catch(() => false)
		if (hasEmail) {
			console.log(`✅ Found personalized email: ${testData.email}`)
		}

		// Check for resend button
		const hasResend = await page
			.locator('button:has-text("Resend"), button:has-text("Send Again")')
			.first()
			.isVisible()
			.catch(() => false)
		if (hasResend) {
			console.log('✅ Found resend functionality')
		}

		// Final diagnostic screenshot
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/signup-05-final-state.png'
			),
			fullPage: true
		})
		console.log('✅ Captured: Final diagnostic view')

		console.log('\n📸 Screenshot capture complete!')
		console.log('📁 All images saved to: apps/frontend/tests/screenshots/')
		console.log('\nFiles created:')
		console.log('  - signup-01-initial-form.png')
		console.log('  - signup-02-filled-form.png')
		console.log('  - signup-03-post-submit.png')
		console.log('  - signup-04-success-focused.png (if success detected)')
		console.log('  - signup-05-final-state.png')
	})

	test('analyze confirmation page structure', async ({ page }) => {
		// Quick signup to analyze confirmation structure
		await page.goto(`${baseURL}/auth/signup`)
		await page.waitForSelector('form')

		// Quick form fill
		await page
			.locator('input[name="name"], input[placeholder*="name" i]')
			.first()
			.fill('Jane Smith')
		await page
			.locator('input[type="email"], input[name="email"]')
			.first()
			.fill('jane.smith@example.com')
		await page
			.locator('input[type="password"], input[name="password"]')
			.first()
			.fill('TestPassword123!')

		// Check checkboxes
		const checkboxes = page.locator('input[type="checkbox"]')
		const count = await checkboxes.count()
		for (let i = 0; i < count; i++) {
			try {
				await checkboxes.nth(i).check({ timeout: 1000 })
			} catch (e) {
				// Continue
			}
		}

		// Submit
		await page.locator('button[type="submit"]').first().click()
		await page.waitForTimeout(3000)

		// Analyze page structure
		console.log('\n🔍 Analyzing confirmation page structure:')

		// Get all text content
		const bodyText = await page.locator('body').innerText()
		const lowerText = bodyText.toLowerCase()

		const keywords = [
			'email',
			'confirm',
			'verify',
			'check',
			'sent',
			'inbox',
			'resend'
		]
		const foundKeywords = keywords.filter(keyword =>
			lowerText.includes(keyword)
		)
		console.log('📝 Found keywords:', foundKeywords)

		// Check for interactive elements
		const buttons = await page.locator('button').count()
		const links = await page.locator('a').count()
		const inputs = await page.locator('input').count()

		console.log(
			`🎛️  Interactive elements: ${buttons} buttons, ${links} links, ${inputs} inputs`
		)

		// Look for email address display
		const emailMatch = bodyText.match(
			/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
		)
		if (emailMatch) {
			console.log('📧 Found email display:', emailMatch[0])
		}

		// Check for SVG (potential icons/checkmarks)
		const svgCount = await page.locator('svg').count()
		console.log(`🎨 Found ${svgCount} SVG elements (potential icons)`)

		// Take analysis screenshot
		await page.screenshot({
			path: path.join(
				__dirname,
				'../screenshots/signup-06-structure-analysis.png'
			),
			fullPage: true
		})

		console.log('✅ Structure analysis complete')
	})
})
