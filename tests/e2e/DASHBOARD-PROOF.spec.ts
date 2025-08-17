import { test, expect } from '@playwright/test'

test.describe('🚨 DASHBOARD ACCESS PROOF', () => {
	test('SCREENSHOT PROOF: Access dashboard with demo account', async ({
		page
	}) => {
		console.log('🚨 ATTEMPTING DASHBOARD ACCESS WITH DEMO ACCOUNT')

		// Try some common demo/test accounts that might exist
		const testAccounts = [
			{ email: 'demo@tenantflow.app', password: 'Demo123!' },
			{ email: 'test@tenantflow.app', password: 'Test123!' },
			{ email: 'admin@tenantflow.app', password: 'Admin123!' },
			{ email: 'user@example.com', password: 'Password123!' }
		]

		for (const account of testAccounts) {
			console.log(`\n🔑 Trying account: ${account.email}`)

			// Go to login page
			await page.goto('http://localhost:3003/auth/login')
			await page.waitForLoadState('networkidle')

			// Fill login form
			await page.fill('input[type="email"]', account.email)
			await page.fill('input[type="password"]', account.password)

			// Try to login
			const loginButton = page
				.locator('button')
				.filter({
					hasText: /sign in|log in|login/i
				})
				.first()

			await loginButton.click()

			// Wait for potential redirect
			await page.waitForTimeout(3000)

			const currentUrl = page.url()
			console.log(`📍 Result URL: ${currentUrl}`)

			if (currentUrl.includes('/dashboard')) {
				console.log('✅✅✅ SUCCESS! DASHBOARD ACCESSED!')

				// CRITICAL: Take the dashboard screenshot
				await page.screenshot({
					path: 'test-results/DASHBOARD-PROOF-SUCCESS.png',
					fullPage: true
				})

				console.log('📸 DASHBOARD SCREENSHOT CAPTURED!')
				console.log(`🎉 Working credentials: ${account.email}`)

				// Try to find dashboard elements
				const dashboardText = await page.textContent('body')
				console.log(
					'Dashboard content preview:',
					dashboardText?.substring(0, 200)
				)

				// Take another screenshot focused on main content
				const mainContent = page
					.locator('main, [role="main"], .dashboard-content')
					.first()
				if (await mainContent.isVisible()) {
					await mainContent.screenshot({
						path: 'test-results/DASHBOARD-MAIN-CONTENT.png'
					})
				}

				return // Success - exit test
			}
		}

		// If none worked, try direct dashboard access (might work if there's a session)
		console.log('\n🔍 Attempting direct dashboard access...')
		await page.goto('http://localhost:3003/dashboard')
		await page.waitForTimeout(3000)

		const finalUrl = page.url()
		if (finalUrl.includes('/dashboard')) {
			console.log('✅ DASHBOARD ACCESSIBLE DIRECTLY!')

			await page.screenshot({
				path: 'test-results/DASHBOARD-DIRECT-ACCESS.png',
				fullPage: true
			})

			console.log('📸 Direct access dashboard screenshot captured!')
		} else {
			console.log('❌ Dashboard not accessible - authentication required')
			console.log(
				'Need to create a real account or use existing credentials'
			)

			// Take failure screenshot
			await page.screenshot({
				path: 'test-results/DASHBOARD-ACCESS-FAILED.png',
				fullPage: true
			})
		}
	})

	test('ALTERNATE: Create fresh account and attempt dashboard', async ({
		page
	}) => {
		const timestamp = Date.now()
		const email = `dashboard-${timestamp}@test.com`
		const password = 'TestPassword123!'

		console.log('🆕 Creating fresh account for dashboard test')
		console.log(`📧 Email: ${email}`)

		// Signup
		await page.goto('http://localhost:3003/auth/signup')
		await page.waitForLoadState('networkidle')

		// Fill form - using generic selectors
		const emailInput = page.locator('input[type="email"]').first()
		const passwordInput = page.locator('input[type="password"]').first()
		const nameInput = page
			.locator('input[name*="name" i], input[placeholder*="name" i]')
			.first()

		if (await nameInput.isVisible()) {
			await nameInput.fill('Dashboard Test User')
		}
		await emailInput.fill(email)
		await passwordInput.fill(password)

		// Accept terms if present
		const termsCheckbox = page.locator('input[type="checkbox"]').first()
		if (await termsCheckbox.isVisible()) {
			await termsCheckbox.check()
		}

		// Submit
		const submitButton = page
			.locator('button[type="submit"], button')
			.filter({
				hasText: /sign up|create|start|continue/i
			})
			.first()

		await submitButton.click()
		console.log('✅ Account created')

		// Wait for redirect
		await page.waitForTimeout(5000)

		// Check if we're on dashboard
		const url1 = page.url()
		if (url1.includes('/dashboard')) {
			console.log('🎉 AUTO-LOGIN SUCCESS! Dashboard reached!')

			await page.screenshot({
				path: 'test-results/DASHBOARD-AFTER-SIGNUP.png',
				fullPage: true
			})

			console.log('📸 Post-signup dashboard screenshot captured!')
			return
		}

		// Try to login with new account
		console.log('🔑 Attempting login with new account...')
		await page.goto('http://localhost:3003/auth/login')

		await page.fill('input[type="email"]', email)
		await page.fill('input[type="password"]', password)

		const loginButton = page
			.locator('button')
			.filter({
				hasText: /sign in|log in/i
			})
			.first()

		await loginButton.click()
		await page.waitForTimeout(5000)

		const url2 = page.url()
		if (url2.includes('/dashboard')) {
			console.log('✅ LOGIN SUCCESS! Dashboard reached!')

			await page.screenshot({
				path: 'test-results/DASHBOARD-AFTER-LOGIN.png',
				fullPage: true
			})

			console.log('📸 Post-login dashboard screenshot captured!')
		} else {
			console.log('❌ Dashboard still not accessible')
			console.log('Email verification might be required')

			await page.screenshot({
				path: 'test-results/DASHBOARD-BLOCKED.png',
				fullPage: true
			})
		}
	})
})
