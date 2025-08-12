/**
 * SIMPLE AUTH FLOW TEST
 *
 * A focused test to verify the exact signup/login flow
 */

import { chromium } from '@playwright/test'

async function testAuthFlow() {
	console.log('🚀 Starting Auth Flow Test...')

	const browser = await chromium.launch({ headless: false })
	const context = await browser.newContext()
	const page = await context.newPage()

	// Monitor network requests
	const requests = []
	page.on('request', request => {
		const url = request.url()
		if (
			url.includes('supabase') ||
			url.includes('api.tenantflow') ||
			url.includes('auth')
		) {
			requests.push({
				method: request.method(),
				url: url,
				timestamp: new Date().toISOString()
			})
			console.log(`🌐 REQUEST: ${request.method()} ${url}`)
		}
	})

	page.on('response', response => {
		const url = response.url()
		if (
			url.includes('supabase') ||
			url.includes('api.tenantflow') ||
			url.includes('auth')
		) {
			console.log(
				`📡 RESPONSE: ${response.status()} ${response.request().method()} ${url}`
			)
		}
	})

	// Monitor console for errors
	page.on('console', msg => {
		if (msg.type() === 'error') {
			console.log(`🚨 CONSOLE ERROR: ${msg.text()}`)
		} else if (
			msg.text().includes('auth') ||
			msg.text().includes('supabase')
		) {
			console.log(`📝 CONSOLE: ${msg.text()}`)
		}
	})

	try {
		// Test 1: Navigate to signup page
		console.log('\n1. Testing signup page load...')
		await page.goto('http://localhost:3001/auth/signup')
		await page.waitForLoadState('networkidle')

		const hasForm = (await page.locator('form').count()) > 0
		console.log(`   Form present: ${hasForm ? '✅' : '❌'}`)

		if (!hasForm) {
			console.log('❌ No form found, stopping test')
			return
		}

		// Test 2: Check Supabase client in browser
		console.log('\n2. Testing Supabase client...')
		const supabaseTest = await page.evaluate(async () => {
			try {
				// Wait for Next.js hydration
				await new Promise(resolve => setTimeout(resolve, 2000))

				// Check if config is available
				const configModule = await import('/src/lib/config.js')
				const config = configModule.config

				console.log('Config loaded:', {
					hasSupabaseUrl: !!config.supabase.url,
					hasSupabaseKey: !!config.supabase.anonKey,
					apiUrl: config.api.baseURL
				})

				// Check if Supabase client works
				const supabaseModule = await import('/src/lib/supabase.js')
				const { supabase } = supabaseModule

				console.log('Supabase client loaded:', !!supabase)

				// Test basic auth operations
				const { data: sessionData, error: sessionError } =
					await supabase.auth.getSession()
				console.log('Session test:', {
					hasSession: !!sessionData.session,
					error: sessionError?.message
				})

				const { data: userData, error: userError } =
					await supabase.auth.getUser()
				console.log('User test:', {
					hasUser: !!userData.user,
					error: userError?.message
				})

				return {
					configAvailable: true,
					supabaseUrl: config.supabase.url,
					hasAnonKey: !!config.supabase.anonKey,
					clientWorking: true,
					sessionTest: {
						success: !sessionError,
						error: sessionError?.message
					},
					userTest: { success: !userError, error: userError?.message }
				}
			} catch (error) {
				console.error('Supabase test error:', error)
				return { error: error.message }
			}
		})

		console.log(
			'   Supabase Test Results:',
			JSON.stringify(supabaseTest, null, 2)
		)

		// Test 3: Try signup flow
		console.log('\n3. Testing signup flow...')

		const testUser = {
			name: 'Test User Auth',
			email: `test.auth.${Date.now()}@example.com`,
			password: process.env.TEST_PASSWORD || 'TestPassword123!'
		}

		console.log(`   Test user: ${testUser.email}`)

		// Fill form
		await page.fill('input[name="fullName"]', testUser.name)
		await page.fill('input[name="email"]', testUser.email)
		await page.fill('input[name="password"]', testUser.password)
		await page.fill('input[name="confirmPassword"]', testUser.password)
		await page.check('#terms')

		console.log('   ✅ Form filled')

		// Wait for form validation
		await page.waitForTimeout(2000)

		// Check if submit button is enabled
		const submitButton = page.locator('button[type="submit"]')
		const isDisabled = await submitButton.isDisabled()
		console.log(`   Submit button disabled: ${isDisabled ? '❌' : '✅'}`)

		// Submit form
		console.log('   🚀 Submitting form...')
		await submitButton.click()

		// Wait for response
		await page.waitForTimeout(5000)

		// Check result
		const currentUrl = page.url()
		const pageText = await page.locator('body').innerText()

		console.log(`   Current URL: ${currentUrl}`)

		if (
			pageText.includes('check your email') ||
			pageText.includes('verification')
		) {
			console.log('   ✅ SUCCESS: Email verification message found')
		} else if (pageText.includes('error') || pageText.includes('Error')) {
			const errorText = pageText.match(/.*error.*/gi)?.[0]
			console.log(`   ❌ ERROR: ${errorText}`)
		} else {
			console.log('   ⚠️  UNCLEAR: No clear success or error message')
			console.log(
				`   Page content sample: ${pageText.substring(0, 200)}...`
			)
		}

		// Test 4: Check login page
		console.log('\n4. Testing login page...')
		await page.goto('http://localhost:3001/auth/login')
		await page.waitForLoadState('networkidle')

		const hasLoginForm = (await page.locator('form').count()) > 0
		console.log(`   Login form present: ${hasLoginForm ? '✅' : '❌'}`)

		console.log('\n📊 NETWORK REQUESTS SUMMARY:')
		requests.forEach(req => {
			console.log(`   ${req.method} ${req.url}`)
		})
	} catch (error) {
		console.error('❌ Test failed:', error.message)
	} finally {
		await browser.close()
	}
}

// Run the test
testAuthFlow().catch(console.error)
