/**
 * Playwright API Mock Handlers
 * Uses native page.route() for API mocking in E2E tests
 *
 * Usage in tests:
 *   import { setupApiMocks } from '../mocks/api-handlers'
 *   test.beforeEach(async ({ page }) => {
 *     await setupApiMocks(page)
 *   })
 */

import type { Page, Route } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'ApiHandlersMock' })

// API Base URL patterns
const API_PATTERN = '**/api/v1/**'
const SUPABASE_AUTH_PATTERN = '**/auth/v1/**'
const SUPABASE_REST_PATTERN = '**/rest/v1/**'

// Mock data factories
const mockData = {
	properties: () => [
		{
			id: 'prop-1',
			name: 'Sunset Apartments',
			address: '123 Main St',
			city: 'Austin',
			state: 'TX',
			postal_code: '78701',
			property_type: 'apartment',
			units: 12,
			created_at: new Date().toISOString()
		},
		{
			id: 'prop-2',
			name: 'Downtown Lofts',
			address: '456 Center Ave',
			city: 'Austin',
			state: 'TX',
			postal_code: '78702',
			property_type: 'condo',
			units: 24,
			created_at: new Date().toISOString()
		}
	],
	propertyStats: () => ({
		total: 2,
		occupied: 8,
		vacant: 4,
		occupancyRate: 66.7,
		totalMonthlyRent: 15000,
		averageRent: 1250
	}),
	tenants: () => [
		{
			id: 'tenant-1',
			first_name: 'John',
			last_name: 'Doe',
			email: 'john.doe@example.com',
			phone: '555-1234',
			created_at: new Date().toISOString()
		}
	],
	tenantStats: () => ({
		total: 1,
		active: 1,
		inactive: 0,
		newThisMonth: 0
	}),
	leases: () => ({
		data: [
			{
				id: 'lease-1',
				primary_tenant_id: 'tenant-1',
				unit_id: 'unit-1',
				start_date: '2024-01-01',
				end_date: '2025-01-01',
				rent_amount: 1500,
				security_deposit: 1500,
				lease_status: 'ACTIVE'
			}
		],
		total: 1
	}),
	maintenance: () => ({
		data: [
			{
				id: 'maint-1',
				title: 'Fix AC Unit',
				description: 'Air conditioning not cooling',
				status: 'OPEN',
				priority: 'HIGH',
				created_at: new Date().toISOString()
			}
		],
		total: 1
	}),
	analytics: () => ({
		occupancyRate: 85,
		totalRevenue: 45000,
		avgRentPerUnit: 1500,
		maintenanceRequests: 5
	}),
	metricTrend: () => ({
		current: 85,
		previous: 80,
		change: 5,
		trend: 'up'
	}),
	timeSeries: () => ({
		data: Array.from({ length: 30 }, (_, i) => ({
			date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
			value: 80 + Math.random() * 10
		}))
	}),
	activity: () => ({
		data: [
			{
				id: 'act-1',
				type: 'payment',
				description: 'Rent payment received',
				timestamp: new Date().toISOString()
			}
		]
	}),
	performance: () => ({
		properties: [
			{ id: 'prop-1', name: 'Sunset Apartments', occupancy: 90, revenue: 15000 }
		]
	}),
	invitations: () => ({
		data: [],
		total: 0
	}),
	paymentSummary: () => ({
		totalPaid: 5000,
		totalPending: 1500,
		totalOverdue: 0
	})
}

// Route handlers
const handlers: Record<string, (route: Route) => Promise<void>> = {
	// Properties
	'GET /api/v1/properties': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.properties())
		})
	},
	'GET /api/v1/properties/stats': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.propertyStats())
		})
	},

	// Tenants
	'GET /api/v1/tenants': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.tenants())
		})
	},
	'GET /api/v1/tenants/stats': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.tenantStats())
		})
	},
	'GET /api/v1/tenants/payments/summary': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.paymentSummary())
		})
	},
	'GET /api/v1/tenants/invitations': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.invitations())
		})
	},

	// Leases
	'GET /api/v1/leases': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.leases())
		})
	},

	// Maintenance
	'GET /api/v1/maintenance': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.maintenance())
		})
	},

	// Analytics & Reports
	'GET /api/v1/owner/analytics/page-data': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.analytics())
		})
	},
	'GET /api/v1/owner/analytics/activity': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.activity())
		})
	},
	'GET /api/v1/owner/properties/performance': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.performance())
		})
	},
	'GET /api/v1/owner/reports/metric-trend': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.metricTrend())
		})
	},
	'GET /api/v1/owner/reports/time-series': async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(mockData.timeSeries())
		})
	}
}

/**
 * Setup API mocks for a Playwright page
 * Call this in test.beforeEach() to mock all API calls
 */
export async function setupApiMocks(page: Page): Promise<void> {
	await page.route(API_PATTERN, async (route) => {
		const url = new URL(route.request().url())
		const method = route.request().method()
		const pathname = url.pathname

		// Build handler key
		const handlerKey = `${method} ${pathname}`

		// Find matching handler
		const handler = handlers[handlerKey]

		if (handler) {
			await handler(route)
		} else {
			// Default: return empty success response for unhandled routes
			logger.warn(`[Mock] Unhandled: ${method} ${pathname}`)
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ data: [], total: 0 })
			})
		}
	})
}

/**
 * Setup selective API mocks (only mock specific endpoints)
 */
export async function setupSelectiveMocks(
	page: Page,
	endpoints: string[]
): Promise<void> {
	await page.route(API_PATTERN, async (route) => {
		const url = new URL(route.request().url())
		const method = route.request().method()
		const pathname = url.pathname
		const handlerKey = `${method} ${pathname}`

		if (endpoints.some((ep) => pathname.includes(ep))) {
			const handler = handlers[handlerKey]
			if (handler) {
				await handler(route)
				return
			}
		}

		// Continue to real server for non-mocked endpoints
		await route.continue()
	})
}

/**
 * Create a custom mock response for a specific endpoint
 */
export function createMockHandler(
	data: unknown,
	status: number = 200
): (route: Route) => Promise<void> {
	return async (route: Route) => {
		await route.fulfill({
			status,
			contentType: 'application/json',
			body: JSON.stringify(data)
		})
	}
}

/**
 * Mock an error response
 */
export function createErrorHandler(
	message: string,
	status: number = 500
): (route: Route) => Promise<void> {
	return async (route: Route) => {
		await route.fulfill({
			status,
			contentType: 'application/json',
			body: JSON.stringify({ error: message, statusCode: status })
		})
	}
}

export { mockData }
