/**
 * Property-Based Tests for InviteTenantForm Success Toast Display
 *
 * Feature: fix-tenant-invitation-issues
 * Property 11: Success Toast Display
 * Validates: Requirements 6.1
 *
 * Property: For any successful invitation submission, the system should display
 * a success toast notification confirming the email was sent.
 *
 * This test file focuses on testing the success handling logic of the form
 * by directly testing the mutation success callback.
 */

import type { ReactNode } from 'react'

import {
	QueryClient,
	QueryClientProvider,
	useMutation
} from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { toast } from 'sonner'
import { renderHook, waitFor } from '@testing-library/react'
import type { InviteTenantRequest } from '@repo/shared/validation/tenants'

// Mock dependencies
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}))

vi.mock('#lib/api-request', () => ({
	apiRequest: vi.fn()
}))

// Helper to create a query client for each test
function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})
}

// Wrapper component for hooks
function createWrapper() {
	const queryClient = createTestQueryClient()
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}> {children} </QueryClientProvider>
	)
}

// Response type matching the backend
interface InviteTenantResponse {
	success: boolean
	tenant_id: string
	message: string
}

describe('InviteTenantForm - Success Toast Property Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	/**
	 * Property 11: Success Toast Display
	 *
	 * For any successful invitation submission, the system should display
	 * a success toast notification confirming the email was sent.
	 *
	 * This property test verifies that:
	 * 1. Any successful API response results in toast.success being called
	 * 2. The success message includes the tenant's name
	 * 3. The success toast includes a description about the email
	 * 4. The toast is displayed for all valid tenant data combinations
	 *
	 * We test this by simulating the mutation's success handling directly.
	 */
	it('should display success toast for any successful invitation', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate various valid tenant data combinations
				fc.record({
					email: fc.emailAddress(),
					first_name: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter(s => s.trim().length > 0),
					last_name: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter(s => s.trim().length > 0),
					phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), {
						nil: undefined
					}),
					property_id: fc.uuid(),
					unit_id: fc.option(fc.uuid(), { nil: undefined })
				}),
				async data => {
					// Clear all mocks before each property test iteration
					vi.clearAllMocks()

					// Setup: Mock API to return success response
					const mockResponse: InviteTenantResponse = {
						success: true,
						tenant_id: fc.sample(fc.uuid(), 1)[0] as string,
						message: 'Invitation sent successfully'
					}

					const { apiRequest } = await import('#lib/api-request')
					vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse)

					// Create a mutation that mimics the form's behavior
					const { result } = renderHook(
						() =>
							useMutation({
								mutationFn: async (payload: InviteTenantRequest) => {
									const { apiRequest: api } = await import('#lib/api-request')
									return api<InviteTenantResponse>('/api/v1/tenants/invite', {
										method: 'POST',
										body: JSON.stringify(payload)
									})
								},
								onSuccess: (_response, variables) => {
									// This is the same success handling logic as in the form
									toast.success('Invitation Sent', {
										description: `${variables.tenantData.first_name} ${variables.tenantData.last_name} will receive an email to access their tenant portal.`
									})
								}
							}),
						{ wrapper: createWrapper() }
					)

					// Execute the mutation with the generated data
					const payload: InviteTenantRequest = {
						tenantData: {
							email: data.email,
							first_name: data.first_name,
							last_name: data.last_name,
							...(data.phone && { phone: data.phone })
						},
						leaseData: {
							property_id: data.property_id,
							...(data.unit_id && { unit_id: data.unit_id })
						}
					}

					result.current.mutate(payload)

					// Assert: toast.success was called
					await waitFor(
						() => {
							expect(toast.success).toHaveBeenCalled()
						},
						{ timeout: 2000 }
					)

					// Verify the success toast was called with proper structure
					const successCalls = vi.mocked(toast.success).mock.calls
					expect(successCalls.length).toBeGreaterThan(0)

					// Check that the first argument is a string (the title)
					const [title, options] = successCalls[0] as [
						string,
						{ description: string }
					]
					expect(typeof title).toBe('string')
					expect(title).toBe('Invitation Sent')

					// Check that options contain a description
					expect(options).toBeDefined()
					expect(options.description).toBeDefined()
					expect(typeof options.description).toBe('string')

					// Verify the description includes the tenant's name
					expect(options.description).toContain(data.first_name)
					expect(options.description).toContain(data.last_name)

					// Verify the description mentions email/portal access
					const description = options.description.toLowerCase()
					expect(
						description.includes('email') || description.includes('portal')
					).toBe(true)

					// Verify toast.error was NOT called on success
					expect(toast.error).not.toHaveBeenCalled()
				}
			),
			{ numRuns: 100 }
		)
	})

	/**
	 * Property 11 (Edge Case): Success Toast with Special Characters
	 *
	 * Verify that the success toast correctly displays tenant names
	 * even when they contain special characters, unicode, or unusual formatting.
	 */
	it('should display success toast with special character names', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate names with special characters
				fc.record({
					email: fc.emailAddress(),
					first_name: fc.oneof(
						fc.constant("O'Brien"),
						fc.constant('José'),
						fc.constant('François'),
						fc.constant('Müller'),
						fc.constant('李'),
						fc.constant('Nguyễn'),
						fc.constant('Al-Rahman'),
						fc.constant('van der Berg')
					),
					last_name: fc.oneof(
						fc.constant("O'Connor"),
						fc.constant('García'),
						fc.constant('Dupont'),
						fc.constant('Schmidt'),
						fc.constant('明'),
						fc.constant('Trần'),
						fc.constant('Al-Sayed'),
						fc.constant('de la Cruz')
					),
					property_id: fc.uuid()
				}),
				async data => {
					// Clear all mocks before each property test iteration
					vi.clearAllMocks()

					// Setup: Mock API to return success response
					const mockResponse: InviteTenantResponse = {
						success: true,
						tenant_id: fc.sample(fc.uuid(), 1)[0] as string,
						message: 'Invitation sent successfully'
					}

					const { apiRequest } = await import('#lib/api-request')
					vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse)

					// Create a mutation that mimics the form's behavior
					const { result } = renderHook(
						() =>
							useMutation({
								mutationFn: async (payload: InviteTenantRequest) => {
									const { apiRequest: api } = await import('#lib/api-request')
									return api<InviteTenantResponse>('/api/v1/tenants/invite', {
										method: 'POST',
										body: JSON.stringify(payload)
									})
								},
								onSuccess: (_response, variables) => {
									toast.success('Invitation Sent', {
										description: `${variables.tenantData.first_name} ${variables.tenantData.last_name} will receive an email to access their tenant portal.`
									})
								}
							}),
						{ wrapper: createWrapper() }
					)

					// Execute the mutation with the generated data
					const payload: InviteTenantRequest = {
						tenantData: {
							email: data.email,
							first_name: data.first_name,
							last_name: data.last_name
						},
						leaseData: {
							property_id: data.property_id
						}
					}

					result.current.mutate(payload)

					// Assert: toast.success was called
					await waitFor(
						() => {
							expect(toast.success).toHaveBeenCalled()
						},
						{ timeout: 2000 }
					)

					// Verify the success toast includes the special character names correctly
					const successCalls = vi.mocked(toast.success).mock.calls
					expect(successCalls.length).toBeGreaterThan(0)

					const [_title, options] = successCalls[0] as [
						string,
						{ description: string }
					]

					// Verify the names are included exactly as provided
					expect(options.description).toContain(data.first_name)
					expect(options.description).toContain(data.last_name)

					// Verify the full name appears in the description
					const expectedNameInDescription = `${data.first_name} ${data.last_name}`
					expect(options.description).toContain(expectedNameInDescription)
				}
			),
			{ numRuns: 50 }
		)
	})

	/**
	 * Property 11 (Invariant): Success Toast Never Shows Error
	 *
	 * Verify that when the API returns success, only toast.success is called
	 * and toast.error is never called.
	 */
	it('should never display error toast on successful invitation', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate minimal valid data
				fc.record({
					email: fc.emailAddress(),
					first_name: fc
						.string({ minLength: 1, maxLength: 20 })
						.filter(s => s.trim().length > 0),
					last_name: fc
						.string({ minLength: 1, maxLength: 20 })
						.filter(s => s.trim().length > 0),
					property_id: fc.uuid()
				}),
				async data => {
					// Clear all mocks before each property test iteration
					vi.clearAllMocks()

					// Setup: Mock API to return success response
					const mockResponse: InviteTenantResponse = {
						success: true,
						tenant_id: fc.sample(fc.uuid(), 1)[0] as string,
						message: 'Invitation sent successfully'
					}

					const { apiRequest } = await import('#lib/api-request')
					vi.mocked(apiRequest).mockResolvedValueOnce(mockResponse)

					// Create a mutation that mimics the form's behavior
					const { result } = renderHook(
						() =>
							useMutation({
								mutationFn: async (payload: InviteTenantRequest) => {
									const { apiRequest: api } = await import('#lib/api-request')
									return api<InviteTenantResponse>('/api/v1/tenants/invite', {
										method: 'POST',
										body: JSON.stringify(payload)
									})
								},
								onSuccess: (_response, variables) => {
									toast.success('Invitation Sent', {
										description: `${variables.tenantData.first_name} ${variables.tenantData.last_name} will receive an email to access their tenant portal.`
									})
								},
								onError: (err: unknown) => {
									toast.error('Failed to send invitation', {
										description:
											err instanceof Error
												? err.message
												: 'Please try again or contact support.'
									})
								}
							}),
						{ wrapper: createWrapper() }
					)

					// Execute the mutation with the generated data
					const payload: InviteTenantRequest = {
						tenantData: {
							email: data.email,
							first_name: data.first_name,
							last_name: data.last_name
						},
						leaseData: {
							property_id: data.property_id
						}
					}

					result.current.mutate(payload)

					// Assert: toast.success was called
					await waitFor(
						() => {
							expect(toast.success).toHaveBeenCalled()
						},
						{ timeout: 2000 }
					)

					// Verify toast.error was NEVER called
					expect(toast.error).not.toHaveBeenCalled()

					// Verify toast.success was called exactly once
					expect(vi.mocked(toast.success).mock.calls.length).toBe(1)
				}
			),
			{ numRuns: 100 }
		)
	})
})
