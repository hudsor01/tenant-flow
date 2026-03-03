/**
 * Playwright API Mock Handlers
 * Uses native page.route() for API mocking in E2E tests
 *
 * Architecture: Supabase PostgREST + Edge Functions
 * - PostgREST: **/rest/v1/** (auto-generated REST from DB schema, RLS enforced)
 * - Edge Functions: **/functions/v1/** (Stripe, PDF, DocuSeal)
 * - Auth: **/auth/v1/** (Supabase Auth)
 *
 * Usage in tests:
 *   import { setupApiMocks } from '../mocks/api-handlers'
 *   test.beforeEach(async ({ page }) => {
 *     await setupApiMocks(page)
 *   })
 */

import type { Page, Route } from '@playwright/test'

// Supabase API URL patterns
const SUPABASE_REST_PATTERN = '**/rest/v1/**'
const SUPABASE_AUTH_PATTERN = '**/auth/v1/**'
const SUPABASE_FUNCTIONS_PATTERN = '**/functions/v1/**'

// Mock data factories
const mockData = {
	properties: () => [
		{
			id: 'prop-1',
			name: 'Sunset Apartments',
			address_line1: '123 Main St',
			city: 'Austin',
			state: 'TX',
			postal_code: '78701',
			property_type: 'apartment',
			status: 'active',
			created_at: new Date().toISOString(),
		},
		{
			id: 'prop-2',
			name: 'Downtown Lofts',
			address_line1: '456 Center Ave',
			city: 'Austin',
			state: 'TX',
			postal_code: '78702',
			property_type: 'condo',
			status: 'active',
			created_at: new Date().toISOString(),
		},
	],
	tenants: () => [
		{
			id: 'tenant-1',
			user_id: 'user-1',
			created_at: new Date().toISOString(),
		},
	],
	leases: () => [
		{
			id: 'lease-1',
			primary_tenant_id: 'tenant-1',
			unit_id: 'unit-1',
			start_date: '2024-01-01',
			end_date: '2025-01-01',
			rent_amount: 1500,
			security_deposit: 1500,
			lease_status: 'active',
		},
	],
	maintenance_requests: () => [
		{
			id: 'maint-1',
			title: 'Fix AC Unit',
			description: 'Air conditioning not cooling',
			status: 'open',
			priority: 'high',
			created_at: new Date().toISOString(),
		},
	],
	vendors: () => [
		{
			id: 'vendor-1',
			name: 'ABC Plumbing',
			trade: 'plumbing',
			status: 'active',
		},
	],
}

/**
 * Setup API mocks for a Playwright page.
 * Intercepts Supabase PostgREST calls and returns mock data.
 * Call this in test.beforeEach() to mock all API calls.
 */
export async function setupApiMocks(page: Page): Promise<void> {
	await page.route(SUPABASE_REST_PATTERN, async (route) => {
		const url = new URL(route.request().url())
		const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0]

		const tableHandlers: Record<
			string,
			() => unknown[] | Record<string, unknown>
		> = {
			properties: mockData.properties,
			tenants: mockData.tenants,
			leases: mockData.leases,
			maintenance_requests: mockData.maintenance_requests,
			vendors: mockData.vendors,
		}

		const handler = table ? tableHandlers[table] : undefined

		if (handler) {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(handler()),
			})
		} else {
			// Default: return empty array for unhandled PostgREST tables
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([]),
			})
		}
	})
}

/**
 * Setup selective API mocks (only mock specific tables)
 */
export async function setupSelectiveMocks(
	page: Page,
	tables: string[],
): Promise<void> {
	await page.route(SUPABASE_REST_PATTERN, async (route) => {
		const url = new URL(route.request().url())
		const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0]

		if (table && tables.includes(table)) {
			const tableHandlers: Record<
				string,
				() => unknown[] | Record<string, unknown>
			> = {
				properties: mockData.properties,
				tenants: mockData.tenants,
				leases: mockData.leases,
				maintenance_requests: mockData.maintenance_requests,
				vendors: mockData.vendors,
			}

			const handler = tableHandlers[table]
			if (handler) {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(handler()),
				})
				return
			}
		}

		// Continue to real server for non-mocked tables
		await route.continue()
	})
}

/**
 * Create a custom mock response for a specific PostgREST table or Edge Function
 */
export function createMockHandler(
	data: unknown,
	status: number = 200,
): (route: Route) => Promise<void> {
	return async (route: Route) => {
		await route.fulfill({
			status,
			contentType: 'application/json',
			body: JSON.stringify(data),
		})
	}
}

/**
 * Create an error mock response
 */
export function createErrorHandler(
	message: string,
	status: number = 500,
): (route: Route) => Promise<void> {
	return async (route: Route) => {
		await route.fulfill({
			status,
			contentType: 'application/json',
			body: JSON.stringify({ error: message, statusCode: status }),
		})
	}
}

export {
	mockData,
	SUPABASE_REST_PATTERN,
	SUPABASE_AUTH_PATTERN,
	SUPABASE_FUNCTIONS_PATTERN,
}
