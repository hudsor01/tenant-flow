/**
 * API Contract Tests
 *
 * Validates that backend API responses match expected TypeScript types
 * Ensures frontend-backend contract is maintained
 *
 * Contract Testing Benefits:
 * - Catch breaking changes early
 * - Validate response structure
 * - Ensure type safety across layers
 * - Document API behavior
 */

import { test, expect } from '@playwright/test'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'

// Helper to validate response structure matches expected schema
function validateSchema(actual: any, expected: Record<string, string>) {
	for (const [key, type] of Object.entries(expected)) {
		expect(actual).toHaveProperty(key)

		const actualType = typeof actual[key]
		if (actualType === 'object' && actual[key] !== null) {
			if (Array.isArray(actual[key])) {
				expect(actualType).toBe('object') // Arrays are objects
			} else {
				expect(actualType).toBe('object')
			}
		} else {
			expect(actualType).toBe(type)
		}
	}
}

test.describe('Health Endpoint Contract', () => {
	test('GET /api/v1/health should match contract', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/health`)

		expect(response.ok()).toBeTruthy()

		const body = await response.json()

		// Validate response structure
		validateSchema(body, {
			status: 'string'
		})

		expect(body.status).toBe('ok')
	})
})

test.describe('Properties Endpoints Contract', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('GET /api/v1/properties should match contract', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/properties`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
			}
		})

		// Should require authentication
		expect([200, 401]).toContain(response.status())

		if (response.status() === 200) {
			const body = await response.json()

			// Expect array of properties
			expect(Array.isArray(body)).toBeTruthy()

			// If properties exist, validate structure
			if (body.length > 0) {
				const property = body[0]

				validateSchema(property, {
					id: 'string',
					name: 'string',
					address: 'string',
					city: 'string',
					state: 'string',
					zipCode: 'string',
					propertyType: 'string',
					status: 'string'
				})

				// Validate enum values
				expect(['RESIDENTIAL', 'COMMERCIAL', 'MULTI_FAMILY', 'INDUSTRIAL']).toContain(property.propertyType)
				expect(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).toContain(property.status)
			}
		}
	})

	test('POST /api/v1/properties should match contract', async ({ request }) => {
		const newProperty = {
			name: 'Test Property',
			address: '123 Test St',
			city: 'Test City',
			state: 'CA',
			zipCode: '12345',
			propertyType: 'RESIDENTIAL',
			totalUnits: 1,
			yearBuilt: 2020
		}

		const response = await request.post(`${API_URL}/api/v1/properties`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`,
				'Content-Type': 'application/json'
			},
			data: newProperty
		})

		// Should require authentication
		expect([200, 201, 401, 400]).toContain(response.status())

		if ([200, 201].includes(response.status())) {
			const body = await response.json()

			// Validate created property has all fields
			validateSchema(body, {
				id: 'string',
				name: 'string',
				address: 'string',
				city: 'string',
				state: 'string',
				zipCode: 'string',
				propertyType: 'string'
			})
		}
	})
})

test.describe('Tenants Endpoints Contract', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('GET /api/v1/tenants should match contract', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/tenants`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
			}
		})

		expect([200, 401]).toContain(response.status())

		if (response.status() === 200) {
			const body = await response.json()

			expect(Array.isArray(body)).toBeTruthy()

			if (body.length > 0) {
				const tenant = body[0]

				validateSchema(tenant, {
					id: 'string',
					firstName: 'string',
					lastName: 'string',
					email: 'string',
					phone: 'string',
					status: 'string'
				})

				// Validate tenant status enum
				expect(['ACTIVE', 'INACTIVE', 'PENDING', 'EVICTED']).toContain(tenant.status)

				// Validate email format
				expect(tenant.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
			}
		}
	})

	test('POST /api/v1/tenants should validate required fields', async ({ request }) => {
		const invalidTenant = {
			// Missing required fields
			firstName: 'Test'
		}

		const response = await request.post(`${API_URL}/api/v1/tenants`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`,
				'Content-Type': 'application/json'
			},
			data: invalidTenant
		})

		// Should return validation error
		expect([400, 401]).toContain(response.status())

		if (response.status() === 400) {
			const body = await response.json()

			// Validate error response structure
			expect(body).toHaveProperty('statusCode')
			expect(body).toHaveProperty('message')
			expect(body.statusCode).toBe(400)
		}
	})
})

test.describe('Leases Endpoints Contract', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('GET /api/v1/leases should match contract', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/leases`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
			}
		})

		expect([200, 401]).toContain(response.status())

		if (response.status() === 200) {
			const body = await response.json()

			expect(Array.isArray(body)).toBeTruthy()

			if (body.length > 0) {
				const lease = body[0]

				validateSchema(lease, {
					id: 'string',
					tenantId: 'string',
					unitId: 'string',
					startDate: 'string',
					endDate: 'string',
					monthlyRent: 'number',
					securityDeposit: 'number',
					status: 'string'
				})

				// Validate lease status enum
				expect(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).toContain(lease.status)

				// Validate date format (ISO 8601)
				expect(lease.startDate).toMatch(/^\d{4}-\d{2}-\d{2}/)
				expect(lease.endDate).toMatch(/^\d{4}-\d{2}-\d{2}/)

				// Validate numeric values are positive
				expect(lease.monthlyRent).toBeGreaterThanOrEqual(0)
				expect(lease.securityDeposit).toBeGreaterThanOrEqual(0)
			}
		}
	})

	test('GET /api/v1/leases/:id should match contract', async ({ request }) => {
		// First get list to find a valid lease ID
		const listResponse = await request.get(`${API_URL}/api/v1/leases`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
			}
		})

		if (listResponse.status() === 200) {
			const leases = await listResponse.json()

			if (leases.length > 0) {
				const leaseId = leases[0].id

				// Get specific lease
				const response = await request.get(`${API_URL}/api/v1/leases/${leaseId}`, {
					headers: {
						Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
					}
				})

				expect([200, 401, 404]).toContain(response.status())

				if (response.status() === 200) {
					const body = await response.json()

					// Single lease should have same structure as list item
					validateSchema(body, {
						id: 'string',
						tenantId: 'string',
						unitId: 'string',
						startDate: 'string',
						endDate: 'string',
						monthlyRent: 'number',
						status: 'string'
					})
				}
			}
		}
	})
})

test.describe('Units Endpoints Contract', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('GET /api/v1/units should match contract', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/units`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
			}
		})

		expect([200, 401]).toContain(response.status())

		if (response.status() === 200) {
			const body = await response.json()

			expect(Array.isArray(body)).toBeTruthy()

			if (body.length > 0) {
				const unit = body[0]

				validateSchema(unit, {
					id: 'string',
					propertyId: 'string',
					unitNumber: 'string',
					bedrooms: 'number',
					bathrooms: 'number',
					squareFeet: 'number',
					status: 'string'
				})

				// Validate unit status enum
				expect(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE']).toContain(unit.status)

				// Validate numeric values are reasonable
				expect(unit.bedrooms).toBeGreaterThanOrEqual(0)
				expect(unit.bathrooms).toBeGreaterThanOrEqual(0)
				expect(unit.squareFeet).toBeGreaterThan(0)
			}
		}
	})
})

test.describe('Maintenance Endpoints Contract', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('GET /api/v1/maintenance should match contract', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/maintenance`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
			}
		})

		expect([200, 401]).toContain(response.status())

		if (response.status() === 200) {
			const body = await response.json()

			expect(Array.isArray(body)).toBeTruthy()

			if (body.length > 0) {
				const maintenance = body[0]

				validateSchema(maintenance, {
					id: 'string',
					propertyId: 'string',
					unitId: 'string',
					title: 'string',
					description: 'string',
					priority: 'string',
					status: 'string',
					category: 'string'
				})

				// Validate priority enum
				expect(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).toContain(maintenance.priority)

				// Validate status enum
				expect(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).toContain(maintenance.status)

				// Validate category enum
				expect(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'GENERAL', 'OTHER']).toContain(
					maintenance.category
				)
			}
		}
	})
})

test.describe('Error Response Contract', () => {
	test('404 errors should follow standard format', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/nonexistent-endpoint-12345`)

		expect(response.status()).toBe(404)

		const body = await response.json()

		// Standard error format
		validateSchema(body, {
			statusCode: 'number',
			message: 'string'
		})

		expect(body.statusCode).toBe(404)
	})

	test('401 errors should follow standard format', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/properties`)

		expect(response.status()).toBe(401)

		const body = await response.json()

		validateSchema(body, {
			statusCode: 'number',
			message: 'string'
		})

		expect(body.statusCode).toBe(401)
	})

	test('400 validation errors should include details', async ({ request }) => {
		const response = await request.post(`${API_URL}/api/v1/properties`, {
			headers: {
				'Content-Type': 'application/json'
			},
			data: { invalid: 'data' }
		})

		// Either 400 (validation) or 401 (auth required)
		expect([400, 401]).toContain(response.status())

		const body = await response.json()

		validateSchema(body, {
			statusCode: 'number',
			message: 'string'
		})
	})
})

test.describe('Pagination Contract', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('paginated endpoints should include metadata', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/properties?limit=10&offset=0`, {
			headers: {
				Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}`
			}
		})

		expect([200, 401]).toContain(response.status())

		if (response.status() === 200) {
			const body = await response.json()

			// Validate pagination structure
			if (body.data) {
				// If using envelope pattern
				expect(Array.isArray(body.data)).toBeTruthy()
				expect(body).toHaveProperty('total')
			} else {
				// If returning array directly
				expect(Array.isArray(body)).toBeTruthy()
			}
		}
	})
})
