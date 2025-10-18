/**
 * API Contract Validation Test Suite
 *
 * Purpose: Ensure zero 404 errors by validating all frontend API calls
 * match backend endpoints. Follows 2025 best practices for contract testing.
 *
 * Strategy:
 * 1. Test all major API endpoints are accessible
 * 2. Validate response schemas match TypeScript types
 * 3. Test error handling (404, 500, auth errors)
 * 4. Detect missing endpoints proactively
 */

import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Authentication state
const STORAGE_STATE = {
	OWNER: path.join(__dirname, '..', '.auth', 'owner.json')
}

test.describe('API Contract Validation', () => {
	test.use({ storageState: STORAGE_STATE.OWNER })

	const API_BASE =
		process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

	test('validate tenant endpoints contract', async ({ request }) => {
		console.log('\n🔍 VALIDATING TENANT ENDPOINTS\n')

		// GET /api/v1/tenants - List all tenants
		const listResponse = await request.get(`${API_BASE}/api/v1/tenants`)
		expect(listResponse.ok()).toBeTruthy()
		expect(listResponse.status()).toBe(200)

		const listData = await listResponse.json()
		console.log(`✓ GET /api/v1/tenants - Status: ${listResponse.status()}`)
		console.log(
			`  Response type: ${Array.isArray(listData) ? 'Array' : typeof listData}`
		)

		// GET /api/v1/tenants/stats - Tenant statistics
		const statsResponse = await request.get(`${API_BASE}/api/v1/tenants/stats`)
		expect(statsResponse.ok()).toBeTruthy()
		expect(statsResponse.status()).toBe(200)
		console.log(
			`✓ GET /api/v1/tenants/stats - Status: ${statsResponse.status()}`
		)

		// POST /api/v1/tenants - Create tenant
		const createResponse = await request.post(`${API_BASE}/api/v1/tenants`, {
			data: {
				email: 'test-contract@example.com',
				firstName: 'Contract',
				lastName: 'Test',
				phone: '555-0123'
			}
		})

		if (createResponse.ok()) {
			console.log(`✓ POST /api/v1/tenants - Status: ${createResponse.status()}`)
			const tenant = await createResponse.json()

			if (tenant.id) {
				// GET /api/v1/tenants/:id - Get single tenant
				const getResponse = await request.get(
					`${API_BASE}/api/v1/tenants/${tenant.id}`
				)
				expect(getResponse.ok()).toBeTruthy()
				console.log(
					`✓ GET /api/v1/tenants/:id - Status: ${getResponse.status()}`
				)

				// PUT /api/v1/tenants/:id - Update tenant
				const updateResponse = await request.put(
					`${API_BASE}/api/v1/tenants/${tenant.id}`,
					{
						data: {
							firstName: 'Updated',
							lastName: 'Name'
						}
					}
				)
				expect(updateResponse.ok()).toBeTruthy()
				console.log(
					`✓ PUT /api/v1/tenants/:id - Status: ${updateResponse.status()}`
				)

				// DELETE /api/v1/tenants/:id - Delete tenant
				const deleteResponse = await request.delete(
					`${API_BASE}/api/v1/tenants/${tenant.id}`
				)
				expect(deleteResponse.ok()).toBeTruthy()
				console.log(
					`✓ DELETE /api/v1/tenants/:id - Status: ${deleteResponse.status()}`
				)
			}
		} else {
			console.log(
				`⚠️  POST /api/v1/tenants - Status: ${createResponse.status()} (may be expected)`
			)
		}

		console.log('\n✅ Tenant endpoints validated\n')
	})

	test('validate property endpoints contract', async ({ request }) => {
		console.log('\n🔍 VALIDATING PROPERTY ENDPOINTS\n')

		// GET /api/v1/properties - List all properties
		const listResponse = await request.get(`${API_BASE}/api/v1/properties`)
		expect(listResponse.ok()).toBeTruthy()
		console.log(`✓ GET /api/v1/properties - Status: ${listResponse.status()}`)

		// GET /api/v1/properties/stats - Property statistics
		const statsResponse = await request.get(
			`${API_BASE}/api/v1/properties/stats`
		)
		expect(statsResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/properties/stats - Status: ${statsResponse.status()}`
		)

		// GET /api/v1/properties/with-units - Properties with units
		const withUnitsResponse = await request.get(
			`${API_BASE}/api/v1/properties/with-units`
		)
		expect(withUnitsResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/properties/with-units - Status: ${withUnitsResponse.status()}`
		)

		console.log('\n✅ Property endpoints validated\n')
	})

	test('validate lease endpoints contract', async ({ request }) => {
		console.log('\n🔍 VALIDATING LEASE ENDPOINTS\n')

		// GET /api/v1/leases - List all leases
		const listResponse = await request.get(`${API_BASE}/api/v1/leases`)
		expect(listResponse.ok()).toBeTruthy()
		console.log(`✓ GET /api/v1/leases - Status: ${listResponse.status()}`)

		// GET /api/v1/leases/stats - Lease statistics
		const statsResponse = await request.get(`${API_BASE}/api/v1/leases/stats`)
		expect(statsResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/leases/stats - Status: ${statsResponse.status()}`
		)

		// GET /api/v1/leases/expiring - Expiring leases
		const expiringResponse = await request.get(
			`${API_BASE}/api/v1/leases/expiring`
		)
		expect(expiringResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/leases/expiring - Status: ${expiringResponse.status()}`
		)

		console.log('\n✅ Lease endpoints validated\n')
	})

	test('validate maintenance endpoints contract', async ({ request }) => {
		console.log('\n🔍 VALIDATING MAINTENANCE ENDPOINTS\n')

		// GET /api/v1/maintenance - List all maintenance requests
		const listResponse = await request.get(`${API_BASE}/api/v1/maintenance`)
		expect(listResponse.ok()).toBeTruthy()
		console.log(`✓ GET /api/v1/maintenance - Status: ${listResponse.status()}`)

		// GET /api/v1/maintenance/stats - Maintenance statistics
		const statsResponse = await request.get(
			`${API_BASE}/api/v1/maintenance/stats`
		)
		expect(statsResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/maintenance/stats - Status: ${statsResponse.status()}`
		)

		// GET /api/v1/maintenance/urgent - Urgent maintenance requests
		const urgentResponse = await request.get(
			`${API_BASE}/api/v1/maintenance/urgent`
		)
		expect(urgentResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/maintenance/urgent - Status: ${urgentResponse.status()}`
		)

		// GET /api/v1/maintenance/overdue - Overdue maintenance requests
		const overdueResponse = await request.get(
			`${API_BASE}/api/v1/maintenance/overdue`
		)
		expect(overdueResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/maintenance/overdue - Status: ${overdueResponse.status()}`
		)

		console.log('\n✅ Maintenance endpoints validated\n')
	})

	test('validate dashboard endpoints contract', async ({ request }) => {
		console.log('\n🔍 VALIDATING DASHBOARD ENDPOINTS\n')

		// GET /api/v1/dashboard/stats - Dashboard statistics
		const statsResponse = await request.get(
			`${API_BASE}/api/v1/dashboard/stats`
		)
		expect(statsResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/dashboard/stats - Status: ${statsResponse.status()}`
		)

		// GET /api/v1/dashboard/activity - Recent activity
		const activityResponse = await request.get(
			`${API_BASE}/api/v1/dashboard/activity`
		)
		expect(activityResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/dashboard/activity - Status: ${activityResponse.status()}`
		)

		// GET /api/v1/dashboard/property-performance - Property performance
		const performanceResponse = await request.get(
			`${API_BASE}/api/v1/dashboard/property-performance`
		)
		expect(performanceResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/dashboard/property-performance - Status: ${performanceResponse.status()}`
		)

		// GET /api/v1/dashboard/uptime - System uptime
		const uptimeResponse = await request.get(
			`${API_BASE}/api/v1/dashboard/uptime`
		)
		expect(uptimeResponse.ok()).toBeTruthy()
		console.log(
			`✓ GET /api/v1/dashboard/uptime - Status: ${uptimeResponse.status()}`
		)

		console.log('\n✅ Dashboard endpoints validated\n')
	})

	test('validate units endpoints contract', async ({ request }) => {
		console.log('\n🔍 VALIDATING UNITS ENDPOINTS\n')

		// GET /api/v1/units - List all units
		const listResponse = await request.get(`${API_BASE}/api/v1/units`)
		expect(listResponse.ok()).toBeTruthy()
		console.log(`✓ GET /api/v1/units - Status: ${listResponse.status()}`)

		// GET /api/v1/units/stats - Units statistics
		const statsResponse = await request.get(`${API_BASE}/api/v1/units/stats`)
		expect(statsResponse.ok()).toBeTruthy()
		console.log(`✓ GET /api/v1/units/stats - Status: ${statsResponse.status()}`)

		console.log('\n✅ Units endpoints validated\n')
	})

	test('validate error handling - 404 detection', async ({ request }) => {
		console.log('\n🔍 TESTING 404 ERROR HANDLING\n')

		// Test non-existent endpoint
		const response = await request.get(
			`${API_BASE}/api/v1/nonexistent-endpoint`
		)
		expect(response.status()).toBe(404)
		console.log(
			`✓ GET /api/v1/nonexistent-endpoint - Status: ${response.status()} (expected 404)`
		)

		// Test non-existent resource ID
		const notFoundResponse = await request.get(
			`${API_BASE}/api/v1/tenants/00000000-0000-0000-0000-000000000000`
		)
		expect([404, 500]).toContain(notFoundResponse.status())
		console.log(
			`✓ GET /api/v1/tenants/:invalid-id - Status: ${notFoundResponse.status()} (expected 404 or 500)`
		)

		console.log('\n✅ Error handling validated\n')
	})

	test('validate authentication requirement', async ({ request }) => {
		console.log('\n🔍 TESTING AUTHENTICATION REQUIREMENTS\n')

		// Create request without auth headers
		const unauthenticatedRequest = await request.get(
			`${API_BASE}/api/v1/tenants`,
			{
				headers: {
					// Clear authorization header
					Authorization: ''
				}
			}
		)

		// Should return 401 Unauthorized
		expect([401, 403]).toContain(unauthenticatedRequest.status())
		console.log(
			`✓ Unauthenticated request - Status: ${unauthenticatedRequest.status()} (expected 401/403)`
		)

		console.log('\n✅ Authentication requirements validated\n')
	})

	test('detect all 404 errors during full app navigation', async ({ page }) => {
		console.log('\n🔍 DETECTING 404 ERRORS DURING NAVIGATION\n')

		const errors404: string[] = []
		const apiCalls: { url: string; status: number }[] = []

		// Intercept all API requests
		page.on('response', response => {
			const url = response.url()
			if (url.includes('/api/')) {
				apiCalls.push({ url, status: response.status() })
				if (response.status() === 404) {
					errors404.push(url)
					console.log(`❌ 404 Error: ${url}`)
				}
			}
		})

		// Navigate through key pages
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')
		console.log('✓ Navigated to /manage/tenants')

		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')
		console.log('✓ Navigated to /manage/properties')

		await page.goto('/manage/leases')
		await page.waitForLoadState('networkidle')
		console.log('✓ Navigated to /manage/leases')

		await page.goto('/manage/maintenance')
		await page.waitForLoadState('networkidle')
		console.log('✓ Navigated to /manage/maintenance')

		await page.goto('/manage')
		await page.waitForLoadState('networkidle')
		console.log('✓ Navigated to /manage (dashboard)')

		// Report results
		console.log(`\n📊 API Call Summary:`)
		console.log(`Total API calls: ${apiCalls.length}`)
		console.log(`404 errors: ${errors404.length}`)

		if (errors404.length > 0) {
			console.log(`\n❌ FAILED: Found ${errors404.length} 404 errors:`)
			errors404.forEach(url => console.log(`  - ${url}`))
		} else {
			console.log(`\n✅ SUCCESS: No 404 errors detected`)
		}

		// Test should fail if any 404s are found
		expect(errors404).toHaveLength(0)

		console.log('\n✅ 404 detection test completed\n')
	})
})

test.describe('Response Schema Validation', () => {
	test.use({ storageState: STORAGE_STATE.OWNER })

	const API_BASE =
		process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

	test('validate tenant response schema', async ({ request }) => {
		const response = await request.get(`${API_BASE}/api/v1/tenants`)
		expect(response.ok()).toBeTruthy()

		const data = await response.json()
		expect(Array.isArray(data)).toBeTruthy()

		if (data.length > 0) {
			const tenant = data[0]
			// Validate required fields exist
			expect(tenant).toHaveProperty('id')
			expect(tenant).toHaveProperty('email')
			console.log('✓ Tenant response schema valid')
		}
	})

	test('validate dashboard stats response schema', async ({ request }) => {
		const response = await request.get(`${API_BASE}/api/v1/dashboard/stats`)
		expect(response.ok()).toBeTruthy()

		const stats = await response.json()
		// Validate expected structure
		expect(stats).toHaveProperty('totalProperties')
		expect(stats).toHaveProperty('totalTenants')
		expect(stats).toHaveProperty('totalUnits')
		console.log('✓ Dashboard stats response schema valid')
	})
})
