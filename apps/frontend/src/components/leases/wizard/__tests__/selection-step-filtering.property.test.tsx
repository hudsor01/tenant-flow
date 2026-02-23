/**
 * Property-Based Tests for Selection Step Filtering
 *
 * Feature: lease-creation-wizard
 * Property 2: Unit filtering by property
 * Property 3: Tenant fetching
 *
 * Validates: Requirements 2.2, 2.3
 *
 * Note: After NestJS removal (phase-57), SelectionStep uses Supabase PostgREST
 * directly (no fetch calls to NestJS API). Tests mock #lib/supabase/client.
 */

import * as fc from 'fast-check'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SelectionStep } from '../selection-step'
import type { SelectionStepData } from '@repo/shared/validation/lease-wizard.schemas'

// Mock Supabase client - track calls per table
const mockFrom = vi.fn()

vi.mock('#lib/supabase/client', () => ({
	createClient: vi.fn(() => ({
		from: mockFrom
	}))
}))

// Helper to create a Supabase chain mock that resolves to given data.
// Uses a thenable pattern so the chain can be awaited at any point,
// while allowing .eq(), .neq(), .order() to be called in any order.
function createChainMock(resolvedData: unknown[]) {
	const result = { data: resolvedData, error: null }
	const chain: Record<string, unknown> = {
		select: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnThis(),
		// Make the chain thenable so it can be awaited
		then: vi.fn((resolve: (value: unknown) => unknown) =>
			Promise.resolve(result).then(resolve)
		)
	}
	return chain
}

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
				<SelectionStep data={data} onChange={onChange} />
			</QueryClientProvider>
		)
		// Allow initial queries to settle
		await new Promise(resolve => setTimeout(resolve, 0))
	})

	return result!
}

// Set up Supabase from() to route queries by table name
function setupSupabaseMock(options: {
	properties?: unknown[]
	units?: unknown[]
	tenants?: unknown[]
}) {
	const unitChain = createChainMock(options.units ?? [])
	const tenantChain = createChainMock(options.tenants ?? [])
	const propertyChain = createChainMock(options.properties ?? [])

	mockFrom.mockImplementation((table: string) => {
		if (table === 'properties') return propertyChain
		if (table === 'units') return unitChain
		if (table === 'tenants') return tenantChain
		return createChainMock([])
	})

	return { unitChain, tenantChain, propertyChain }
}

describe('Selection Step Filtering - Property Tests', () => {
	beforeEach(() => {
		mockFrom.mockReset()
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
					async propertyId => {
						const { unitChain } = setupSupabaseMock({
							properties: [
								{
									id: propertyId,
									name: 'Test',
									address_line1: '123 Main',
									city: 'Austin',
									state: 'TX'
								}
							],
							units: [],
							tenants: []
						})

						const onChange = vi.fn()

						await renderSelectionStep({ property_id: propertyId }, onChange)

						// Wait for units query to be made
						await waitFor(
							() => {
								expect(mockFrom).toHaveBeenCalledWith('units')
							},
							{ timeout: 3000 }
						)

						// PROPERTY ASSERTION: Units query was made via Supabase PostgREST
						// The .eq() call on the chain performs property_id filtering
						expect(unitChain.eq).toHaveBeenCalledWith(
							'property_id',
							propertyId
						)

						cleanup()
					}
				),
				{ numRuns: 15 }
			)
		})

		it('should NOT request units when no property is selected', async () => {
			setupSupabaseMock({
				properties: [],
				units: [],
				tenants: []
			})

			const onChange = vi.fn()

			await renderSelectionStep({}, onChange) // No property_id

			// Wait for properties and tenants to be fetched
			await waitFor(
				() => {
					expect(mockFrom).toHaveBeenCalledWith('properties')
					expect(mockFrom).toHaveBeenCalledWith('tenants')
				},
				{ timeout: 3000 }
			)

			// PROPERTY ASSERTION: Units query should NOT be made without property_id
			// (enabled: !!data.property_id = false prevents the query)
			const unitCalls = mockFrom.mock.calls.filter(
				(call: unknown[]) => call[0] === 'units'
			)
			expect(unitCalls).toHaveLength(0)
		})

		it('should request units with correct property_id for various property IDs', async () => {
			// Test multiple specific property IDs
			const propertyIds = fc.sample(fc.uuid(), 5)

			for (const propertyId of propertyIds) {
				mockFrom.mockReset()

				const { unitChain } = setupSupabaseMock({
					properties: [
						{
							id: propertyId,
							name: 'Test',
							address_line1: '123 Main',
							city: 'Austin',
							state: 'TX'
						}
					],
					units: [],
					tenants: []
				})

				const onChange = vi.fn()

				await renderSelectionStep({ property_id: propertyId }, onChange)

				await waitFor(
					() => {
						expect(mockFrom).toHaveBeenCalledWith('units')
					},
					{ timeout: 3000 }
				)

				// PROPERTY ASSERTION: Units query uses correct property_id filter
				expect(unitChain.eq).toHaveBeenCalledWith('property_id', propertyId)

				cleanup() // Manual cleanup within property iteration
			}
		})
	})

	/**
	 * Property 3: Tenant fetching behavior
	 * Tenants should be fetched when the component mounts.
	 *
	 * **Feature: lease-creation-wizard, Property 3: Tenant filtering**
	 * **Validates: Requirements 2.3**
	 */
	describe('Property 3: Tenant fetching', () => {
		it('should fetch tenants when component mounts', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(
						fc.record({
							id: fc.uuid(),
							first_name: fc.string({ minLength: 1, maxLength: 30 }),
							last_name: fc.string({ minLength: 1, maxLength: 30 }),
							email: fc.emailAddress()
						}),
						{ minLength: 0, maxLength: 5 }
					),
					async tenants => {
						mockFrom.mockReset()
						setupSupabaseMock({
							properties: [],
							units: [],
							tenants
						})

						const onChange = vi.fn()

						await renderSelectionStep({}, onChange)

						// Wait for tenants query
						await waitFor(
							() => {
								expect(mockFrom).toHaveBeenCalledWith('tenants')
							},
							{ timeout: 3000 }
						)

						// PROPERTY ASSERTION: Tenants endpoint should be called
						const tenantCalls = mockFrom.mock.calls.filter(
							(call: unknown[]) => call[0] === 'tenants'
						)
						expect(tenantCalls.length).toBeGreaterThan(0)

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
					async propertyId => {
						mockFrom.mockReset()
						setupSupabaseMock({
							properties: propertyId
								? [
										{
											id: propertyId,
											name: 'Test',
											address_line1: '123 Main',
											city: 'Austin',
											state: 'TX'
										}
									]
								: [],
							units: [],
							tenants: []
						})

						const onChange = vi.fn()

						await renderSelectionStep(
							propertyId ? { property_id: propertyId } : {},
							onChange
						)

						await waitFor(
							() => {
								expect(mockFrom).toHaveBeenCalledWith('tenants')
							},
							{ timeout: 3000 }
						)

						// PROPERTY ASSERTION: Tenants should always be fetched
						// (no 'enabled' condition on tenants query unlike units)
						const tenantCalls = mockFrom.mock.calls.filter(
							(call: unknown[]) => call[0] === 'tenants'
						)
						expect(tenantCalls.length).toBeGreaterThan(0)

						cleanup() // Manual cleanup within property iteration
					}
				),
				{ numRuns: 10 }
			)
		})
	})

	/**
	 * Property: Supabase query structure validation
	 * All queries should use Supabase PostgREST (no fetch/Authorization headers needed).
	 */
	describe('Property: Supabase query structure', () => {
		it('should make queries via supabase client (not fetch)', async () => {
			setupSupabaseMock({
				properties: [
					{
						id: 'prop-1',
						name: 'Test',
						address_line1: '123 Main',
						city: 'Austin',
						state: 'TX'
					}
				],
				units: [],
				tenants: []
			})

			const onChange = vi.fn()

			await renderSelectionStep({ property_id: 'prop-1' }, onChange)

			await waitFor(
				() => {
					expect(mockFrom).toHaveBeenCalledWith('properties')
					expect(mockFrom).toHaveBeenCalledWith('units')
					expect(mockFrom).toHaveBeenCalledWith('tenants')
				},
				{ timeout: 3000 }
			)

			// ASSERTION: All data fetching uses supabase.from(), not global fetch
			// The mockFrom tracks all table queries
			const tableNames = mockFrom.mock.calls.map((call: unknown[]) => call[0])
			expect(tableNames).toContain('properties')
			expect(tableNames).toContain('tenants')
		})
	})
})
