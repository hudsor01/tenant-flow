import { test, expect } from '@playwright/test'

test.describe.only('Signup User Experience Analysis', () => {
	test('analyze complete signup journey from landing to trial', async ({
		page
	}) => {
		// Start at the landing page
		await page.goto('http://localhost:3000')

		// Take screenshot of landing page
		await page.screenshot({
			path: 'ux-analysis-1-landing.png',
			fullPage: true
		})

		// Wait for page to fully load
		await page.waitForLoadState('networkidle')

		// Log initial observations
		console.log('=== LANDING PAGE ANALYSIS ===')

		// Check for CTAs on landing page
		const ctaButtons = await page
			.locator(
				'button:has-text("Start Free Trial"), a:has-text("Start Free Trial"), button:has-text("Get Started"), a:has-text("Get Started"), button:has-text("Sign Up"), a:has-text("Sign Up")'
			)
			.all()
		console.log(`Found ${ctaButtons.length} CTA buttons on landing page`)

		// Check hero section
		const heroSection = await page.locator('h1').first().textContent()
		console.log(`Hero headline: ${heroSection}`)

		// Check if pricing is visible
		const pricingVisible = await page.locator('text=/\\$[0-9]+/').count()
		console.log(`Pricing mentions visible: ${pricingVisible}`)

		// Look for the most prominent CTA
		let signupButton = null

		// Try different selectors for signup/trial buttons
		const selectors = [
			'button:has-text("Start Free Trial")',
			'a:has-text("Start Free Trial")',
			'button:has-text("Get Started")',
			'a:has-text("Get Started")',
			'button:has-text("Sign Up")',
			'a:has-text("Sign Up")',
			'[href*="signup"]',
			'[href*="auth/signup"]'
		]

		for (const selector of selectors) {
			const element = page.locator(selector).first()
			if ((await element.count()) > 0) {
				signupButton = element
				console.log(`Found signup button with selector: ${selector}`)
				break
			}
		}

		if (!signupButton) {
			console.log('ERROR: No signup button found on landing page!')
			throw new Error('No signup button found')
		}

		// Measure time and clicks to get to signup
		const startTime = Date.now()

		// Click the signup button
		await signupButton.click()

		// Wait for navigation
		await page.waitForURL('**/auth/signup', { timeout: 10000 })

		const timeToSignupPage = Date.now() - startTime
		console.log(`\nTime to reach signup page: ${timeToSignupPage}ms`)
		console.log('Clicks required: 1')

		// Take screenshot of signup page
		await page.screenshot({
			path: 'ux-analysis-2-signup-page.png',
			fullPage: true
		})

		console.log('\n=== SIGNUP PAGE ANALYSIS ===')

		// Analyze signup form
		const formFields = await page.locator('input, select, textarea').all()
		console.log(`Total form fields: ${formFields.length}`)

		// Check for each expected field
		const fields = {
			name: await page
				.locator(
					'input[name="name"], input[placeholder*="name" i], input[id*="name" i]'
				)
				.count(),
			email: await page
				.locator(
					'input[type="email"], input[name="email"], input[placeholder*="email" i]'
				)
				.count(),
			password: await page.locator('input[type="password"]').count(),
			company: await page
				.locator(
					'input[name*="company" i], input[placeholder*="company" i], input[placeholder*="organization" i]'
				)
				.count(),
			phone: await page
				.locator(
					'input[type="tel"], input[name*="phone" i], input[placeholder*="phone" i]'
				)
				.count()
		}

		console.log('Form fields detected:')
		for (const [field, count] of Object.entries(fields)) {
			console.log(`  - ${field}: ${count > 0 ? 'Yes' : 'No'}`)
		}

		// Check for password requirements display
		const passwordRequirements = await page
			.locator(
				'text=/.*8.*characters.*|.*uppercase.*|.*lowercase.*|.*number.*/i'
			)
			.count()
		console.log(
			`Password requirements visible: ${passwordRequirements > 0 ? 'Yes' : 'No'}`
		)

		// Check for social login options
		const googleLogin = await page
			.locator('button:has-text("Google")')
			.count()
		const githubLogin = await page
			.locator('button:has-text("GitHub")')
			.count()
		console.log(
			`Social login options: Google(${googleLogin > 0}), GitHub(${githubLogin > 0})`
		)

		// Check for terms and privacy policy
		const termsLink = await page.locator('a[href*="terms"]').count()
		const privacyLink = await page.locator('a[href*="privacy"]').count()
		console.log(
			`Legal links: Terms(${termsLink > 0}), Privacy(${privacyLink > 0})`
		)

		// Check for progress indicators
		const progressBar = await page
			.locator('[role="progressbar"], .progress, [class*="progress"]')
			.count()
		console.log(`Progress indicator present: ${progressBar > 0}`)

		// Fill out the form to test the flow
		console.log('\n=== FORM INTERACTION ANALYSIS ===')

		// Try to fill the form
		const testData = {
			name: 'Test User',
			email: `test${Date.now()}@example.com`,
			password: 'TestPass123!',
			company: 'Test Company'
		}

		// Fill name field
		const nameField = page
			.locator(
				'input[name="name"], input[placeholder*="name" i], input[id*="name" i]'
			)
			.first()
		if ((await nameField.count()) > 0) {
			await nameField.fill(testData.name)
			console.log('✓ Filled name field')
		}

		// Fill email field
		const emailField = page
			.locator(
				'input[type="email"], input[name="email"], input[placeholder*="email" i]'
			)
			.first()
		if ((await emailField.count()) > 0) {
			await emailField.fill(testData.email)
			console.log('✓ Filled email field')
		}

		// Fill password field
		const passwordField = page.locator('input[type="password"]').first()
		if ((await passwordField.count()) > 0) {
			await passwordField.fill(testData.password)
			console.log('✓ Filled password field')

			// Check if password strength indicator appears
			await page.waitForTimeout(500)
			const strengthIndicator = await page
				.locator(
					'[class*="strength"], [class*="strong"], [class*="weak"]'
				)
				.count()
			console.log(
				`Password strength indicator: ${strengthIndicator > 0 ? 'Yes' : 'No'}`
			)
		}

		// Check if there's a confirm password field
		const confirmPasswordFields = await page
			.locator('input[type="password"]')
			.all()
		if (confirmPasswordFields.length > 1) {
			await confirmPasswordFields[1].fill(testData.password)
			console.log('✓ Filled confirm password field')
		}

		// Fill company/organization field if present
		const companyField = page
			.locator(
				'input[name*="company" i], input[placeholder*="company" i], input[placeholder*="organization" i]'
			)
			.first()
		if ((await companyField.count()) > 0) {
			await companyField.fill(testData.company)
			console.log('✓ Filled company field')
		}

		// Take screenshot of filled form
		await page.screenshot({
			path: 'ux-analysis-3-form-filled.png',
			fullPage: true
		})

		// Check for submit button
		const submitButton = await page
			.locator(
				'button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account"), button:has-text("Start Free Trial")'
			)
			.first()
		const submitText = await submitButton.textContent()
		console.log(`\nSubmit button text: "${submitText}"`)

		// Check if button is enabled
		const isEnabled = await submitButton.isEnabled()
		console.log(`Submit button enabled: ${isEnabled}`)

		// Analyze form validation
		console.log('\n=== VALIDATION ANALYSIS ===')

		// Clear email and try to submit to test validation
		await emailField.clear()
		await submitButton.click()
		await page.waitForTimeout(500)

		// Check for error messages
		const errorMessages = await page
			.locator(
				'.error, [class*="error"], [role="alert"], .text-red-500, .text-destructive'
			)
			.all()
		console.log(`Error messages shown: ${errorMessages.length}`)

		// Restore email
		await emailField.fill(testData.email)

		// Check for inline validation
		await emailField.fill('invalid-email')
		await emailField.blur()
		await page.waitForTimeout(500)
		const inlineError = await page
			.locator('.error, [class*="error"], [role="alert"]')
			.count()
		console.log(`Inline validation: ${inlineError > 0 ? 'Yes' : 'No'}`)

		// Restore valid email
		await emailField.fill(testData.email)

		console.log('\n=== UX FRICTION POINTS ===')

		// Count total required actions
		const requiredFields = await page
			.locator(
				'input[required], input[aria-required="true"], input:has(+ span:has-text("*"))'
			)
			.count()
		console.log(`Required fields: ${requiredFields}`)

		// Check for helpful features
		const autoComplete = await page.locator('input[autocomplete]').count()
		console.log(`Autocomplete enabled fields: ${autoComplete}`)

		// Check for loading states
		await submitButton.click()
		await page.waitForTimeout(100)
		const loadingIndicator = await page
			.locator('.spinner, [class*="loading"], [class*="spin"]')
			.count()
		console.log(
			`Loading indicator on submit: ${loadingIndicator > 0 ? 'Yes' : 'No'}`
		)

		// Take final screenshot
		await page.screenshot({
			path: 'ux-analysis-4-final-state.png',
			fullPage: true
		})

		console.log('\n=== RECOMMENDATIONS ===')
		console.log(
			'Based on the analysis, here are the UX issues and recommendations...'
		)
	})
})
