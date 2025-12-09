/**
 * Property-Based Tests for Selection Step Filtering
 *
 * Feature: lease-creation-wizard
 * Property 2: Unit filtering by property
 * Property 3: Tenant filtering by unit availability
 *
 * Validates: Requirements 2.2, 2.3
 */

import * as fc from 'fast-check'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectionStep } from '../selection-step'
import type { SelectionStepData } from '@repo/shared/validation/lease-wizard.schemas'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create QueryClient for testing
function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 }
		}
	})
}

// Helper to render SelectionStep with QueryClient and proper async handling
async function renderSelectionStep(
	data: Partial<SelectionStepData>,
	onChange: (data: Partial<SelectionStepData>) => void
) {
	const queryClient = createTestQueryClient()
	let result: ReturnType<typeof render>

	await act(async () => {
		result = render(
			<QueryClientProvider client={queryClient}>
				<SelectionStep data={data} onChange={onChange} token="test-token" />
			</QueryClientProvider>
		)
		// Allow initial queries to settle
		await new Promise(resolve => setTimeout(resolve, 0))
	})

	return result!
}

describe('Selection Step Filtering - Property Tests', () => {
	beforeEach(() => {
		mockFetch.mockReset()
	})

	// Note: cleanup() is handled globally by unit-setup.ts afterEach

	/**
	 * Property 2: Unit filtering by property
	 * For any selected property, only units belonging to that property should be requested.
	 *
	 * **Feature: lease-creation-wizard, Property 2: Unit filtering by property**
	 * **Validates: Requirements 2.2**
	 */
	describe('Property 2: Unit filtering by property', () => {
		it('should request units with property_id filter when property is selected', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.uuid(), // property_id
					async (propertyId) => {
						const fetchedUrls: string[] = []

						mockFetch.mockImplementation((url: string) => {
							fetchedUrls.push(url)

							if (url.includes('/api/v1/properties')) {
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: [{ id: propertyId, name: 'Test', address_line1: '123 Main', city: 'Austin', state: 'TX' }] })
								})
							}

							if (url.includes('/api/v1/units')) {
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: [] })
								})
							}

							if (url.includes('/api/v1/tenants')) {
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: [] })
								})
							}

							return Promise.resolve({ ok: false })
						})

						const onChange = vi.fn()

						await renderSelectionStep({ property_id: propertyId }, onChange)

						// Wait for units query to be made
						await waitFor(
							() => {
								const unitUrl = fetchedUrls.find(url => url.includes('/api/v1/units'))
								expect(unitUrl).toBeDefined()
							},
							{ timeout: 3000 }
						)

						// PROPERTY ASSERTION: Units request must include the selected property_id as filter
						const unitUrl = fetchedUrls.find(url => url.includes('/api/v1/units'))
						expect(unitUrl).toContain(`property_id=${propertyId}`)

						cleanup()
					}
				),
				{ numRuns: 15 }
			)
		})

		it('should NOT request units when no property is selected', async () => {
			const fetchedUrls: string[] = []

			mockFetch.mockImplementation((url: string) => {
				fetchedUrls.push(url)

				if (url.includes('/api/v1/properties')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ data: [] })
					})
				}

				if (url.includes('/api/v1/tenants')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ data: [] })
					})
				}

				return Promise.resolve({ ok: false })
			})

			const onChange = vi.fn()

			await renderSelectionStep({}, onChange) // No property_id

			// Wait for properties and tenants to be fetched
			await waitFor(
				() => {
					expect(fetchedUrls.some(url => url.includes('/api/v1/properties'))).toBe(true)
					expect(fetchedUrls.some(url => url.includes('/api/v1/tenants'))).toBe(true)
				},
				{ timeout: 3000 }
			)

			// Give a bit more time for any additional requests
			await new Promise(resolve => setTimeout(resolve, 100))

			// PROPERTY ASSERTION: No units request should be made without property_id
			expect(fetchedUrls.some(url => url.includes('/api/v1/units'))).toBe(false)
		})

		it('should request units with correct property_id for various property IDs', async () => {
			// Test multiple specific property IDs
			const propertyIds = fc.sample(fc.uuid(), 5)

			for (const propertyId of propertyIds) {
				const fetchedUrls: string[] = []

				mockFetch.mockImplementation((url: string) => {
					fetchedUrls.push(url)

					if (url.includes('/api/v1/properties')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ data: [{ id: propertyId, name: 'Test', address_line1: '123 Main', city: 'Austin', state: 'TX' }] })
						})
					}

					if (url.includes('/api/v1/units')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ data: [] })
						})
					}

					if (url.includes('/api/v1/tenants')) {
						return Promise.resolve({
							ok: true,
							json: () => Promise.resolve({ data: [] })
						})
					}

					return Promise.resolve({ ok: false })
				})

				const onChange = vi.fn()

				await renderSelectionStep({ property_id: propertyId }, onChange)

				await waitFor(
					() => {
						expect(fetchedUrls.some(url => url.includes('/api/v1/units'))).toBe(true)
					},
					{ timeout: 3000 }
				)

				const unitUrl = fetchedUrls.find(url => url.includes('/api/v1/units'))
				expect(unitUrl).toContain(`property_id=${propertyId}`)

				cleanup() // Manual cleanup within property iteration
			}
		})
	})

	/**
	 * Property 3: Tenant fetching behavior
	 * Tenants should be fetched when the component mounts (with token).
	 *
	 * **Feature: lease-creation-wizard, Property 3: Tenant filtering**
	 * **Validates: Requirements 2.3**
	 */
	describe('Property 3: Tenant fetching', () => {
		it('should fetch tenants when token is available', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(
						fc.record({
							id: fc.uuid(),
							first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
							last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
							email: fc.emailAddress()
						}),
						{ minLength: 0, maxLength: 5 }
					),
					async (tenants) => {
						let tenantsFetched = false
						let _returnedTenants: unknown[] = []

						mockFetch.mockImplementation((url: string) => {
							if (url.includes('/api/v1/properties')) {
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: [] })
								})
							}

							if (url.includes('/api/v1/tenants')) {
								tenantsFetched = true
								_returnedTenants = tenants
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: tenants })
								})
							}

							return Promise.resolve({ ok: false })
						})

						const onChange = vi.fn()

						await renderSelectionStep({}, onChange)

						// Wait for tenants query
						await waitFor(
							() => {
								expect(tenantsFetched).toBe(true)
							},
							{ timeout: 3000 }
						)

						// PROPERTY ASSERTION: Tenants endpoint should be called
						expect(tenantsFetched).toBe(true)

						cleanup() // Manual cleanup within property iteration
					}
				),
				{ numRuns: 10 }
			)
		})

		it('should fetch tenants regardless of property selection', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.option(fc.uuid(), { nil: undefined }), // optional property_id
					async (propertyId) => {
						let tenantsFetched = false

						mockFetch.mockImplementation((url: string) => {
							if (url.includes('/api/v1/properties')) {
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: propertyId ? [{ id: propertyId, name: 'Test', address_line1: '123 Main', city: 'Austin', state: 'TX' }] : [] })
								})
							}

							if (url.includes('/api/v1/units')) {
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: [] })
								})
							}

							if (url.includes('/api/v1/tenants')) {
								tenantsFetched = true
								return Promise.resolve({
									ok: true,
									json: () => Promise.resolve({ data: [] })
								})
							}

							return Promise.resolve({ ok: false })
						})

						const onChange = vi.fn()

						await renderSelectionStep(
							propertyId ? { property_id: propertyId } : {},
							onChange
						)

						await waitFor(
							() => {
								expect(tenantsFetched).toBe(true)
							},
							{ timeout: 3000 }
						)

						// PROPERTY ASSERTION: Tenants should always be fetched (independent of property)
						expect(tenantsFetched).toBe(true)

						cleanup() // Manual cleanup within property iteration
					}
				),
				{ numRuns: 10 }
			)
		})
	})

	/**
	 * Property: API request structure validation
	 * All requests should include the authorization header.
	 */
	describe('Property: API request structure', () => {
		it('should include authorization header in all requests', async () => {
			const requestHeaders: Record<string, string>[] = []

			mockFetch.mockImplementation((url: string, options?: RequestInit) => {
				if (options?.headers) {
					requestHeaders.push(options.headers as Record<string, string>)
				}

				if (url.includes('/api/v1/properties')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ data: [{ id: 'prop-1', name: 'Test', address_line1: '123 Main', city: 'Austin', state: 'TX' }] })
					})
				}

				if (url.includes('/api/v1/units')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ data: [] })
					})
				}

				if (url.includes('/api/v1/tenants')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ data: [] })
					})
				}

				return Promise.resolve({ ok: false })
			})

			const onChange = vi.fn()

			await renderSelectionStep({ property_id: 'prop-1' }, onChange)

			await waitFor(
				() => {
					expect(requestHeaders.length).toBeGreaterThan(0)
				},
				{ timeout: 3000 }
			)

			// PROPERTY ASSERTION: All requests should have Authorization header
			for (const headers of requestHeaders) {
				expect(headers.Authorization).toBe('Bearer test-token')
			}
		})
	})
})
