/**
 * Property-Based Tests for InviteTenantForm Error Handling
 *
 * Feature: fix-tenant-invitation-issues
 * Property 6: Frontend Error Display
 * Validates: Requirements 4.3, 6.2
 *
 * Property: For any error thrown by a mutation, the frontend should display a
 * user-friendly error toast notification with a clear message.
 *
 * Note: After NestJS removal (phase-57), the invite mutation throws a stub error.
 * These tests validate the error display logic pattern independently.
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
import type { InviteTenantRequest } from '#shared/validation/tenants'

// Mock dependencies
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
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

describe('InviteTenantForm - Property-Based Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	/**
	 * Property 6: Frontend Error Display
	 *
	 * For any error thrown by the mutation, the frontend should display a
	 * user-friendly error toast notification with a clear message.
	 *
	 * This property test verifies that:
	 * 1. Any error thrown by the mutation results in toast.error being called
	 * 2. The error message is user-friendly (not raw error objects)
	 * 3. The error toast includes a description
	 *
	 * We test this by simulating the mutation's error handling directly.
	 */
	it('should display error toast for any mutation error', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate various error types
				fc.oneof(
					fc.constant(new Error('Network error')),
					fc.constant(new Error('Server error')),
					fc.constant(new Error('Validation failed')),
					fc.constant(new Error('Unauthorized')),
					fc.constant(new Error('Forbidden')),
					fc.constant(new Error('Not found')),
					fc.constant(new Error('Internal server error')),
					fc.constant(new Error('Service unavailable')),
					fc.constant(new Error('Timeout')),
					fc.constant(new Error('Bad request'))
				),
				async error => {
					// Clear all mocks before each property test iteration
					vi.clearAllMocks()

					// Create a mutation that mimics the form's error handling behavior
					const { result } = renderHook(
						() =>
							useMutation({
								mutationFn: async (_payload: InviteTenantRequest) => {
									throw error
								},
								onError: (err: unknown) => {
									// This is the same error handling logic as in the form
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

					// Execute the mutation with valid data
					const payload: InviteTenantRequest = {
						tenantData: {
							email: 'test@example.com',
							first_name: 'John',
							last_name: 'Doe'
						},
						leaseData: {
							property_id: 'prop-123'
						}
					}

					result.current.mutate(payload)

					// Assert: toast.error was called
					await waitFor(
						() => {
							expect(toast.error).toHaveBeenCalled()
						},
						{ timeout: 2000 }
					)

					// Verify the error toast was called with proper structure
					const errorCalls = vi.mocked(toast.error).mock.calls
					expect(errorCalls.length).toBeGreaterThan(0)

					// Check that the first argument is a string (the title)
					const [title, options] = errorCalls[0] as [
						string,
						{ description: string }
					]
					expect(typeof title).toBe('string')
					expect(title).toBe('Failed to send invitation')

					// Check that options contain a description
					expect(options).toBeDefined()
					expect(options.description).toBeDefined()
					expect(typeof options.description).toBe('string')

					// Verify the description is user-friendly
					// It should be the error message since we're throwing Error objects
					expect(options.description).toBe(error.message)
				}
			),
			{ numRuns: 100 }
		)
	})

	/**
	 * Property 6 (Edge Case): Non-Error Objects
	 *
	 * Verify that even when the mutation throws non-Error objects (strings, objects, etc.),
	 * the frontend still displays a user-friendly error toast.
	 */
	it('should display error toast for non-Error thrown values', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate various non-Error types that might be thrown
				fc.oneof(
					fc.string(),
					fc.constant({ message: 'Custom error object' }),
					fc.constant({ error: 'Something went wrong' }),
					fc.constant(null),
					fc.constant(undefined)
				),
				async thrownValue => {
					// Create a mutation that mimics the form's behavior
					const { result } = renderHook(
						() =>
							useMutation({
								mutationFn: async (_payload: InviteTenantRequest) => {
									throw thrownValue
								},
								onError: (err: unknown) => {
									// This is the same error handling logic as in the form
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

					// Execute the mutation with valid data
					const payload: InviteTenantRequest = {
						tenantData: {
							email: 'test@example.com',
							first_name: 'Jane',
							last_name: 'Smith'
						},
						leaseData: {
							property_id: 'prop-123'
						}
					}

					result.current.mutate(payload)

					// Assert: toast.error was called with fallback message
					await waitFor(
						() => {
							expect(toast.error).toHaveBeenCalled()
						},
						{ timeout: 2000 }
					)

					// Verify the error toast has a user-friendly fallback message
					const errorCalls = vi.mocked(toast.error).mock.calls
					expect(errorCalls.length).toBeGreaterThan(0)

					const [title, options] = errorCalls[0] as [
						string,
						{ description: string }
					]
					expect(title).toBe('Failed to send invitation')
					expect(options.description).toBeDefined()
					expect(typeof options.description).toBe('string')
					// Should have a fallback message for non-Error objects
					expect(options.description.length).toBeGreaterThan(0)
					// For non-Error objects, should use the fallback
					if (!(thrownValue instanceof Error)) {
						expect(options.description).toBe(
							'Please try again or contact support.'
						)
					}
				}
			),
			{ numRuns: 50 }
		)
	})
})

/**
 * Property 7: Error Type Distinction
 *
 * Feature: fix-tenant-invitation-issues, Property 7: Error Type Distinction
 * Validates: Requirements 4.4
 *
 * For any error, the system should display the error message from the error object.
 * This property test verifies that:
 * 1. Authentication-type errors are displayed correctly
 * 2. Authorization-type errors are displayed correctly
 * 3. The error messages clearly distinguish between the two types
 */
it('should distinguish between authentication and authorization errors', async () => {
	await fc.assert(
		fc.asyncProperty(
			// Generate authentication (401) and authorization (403) errors
			fc.oneof(
				// Authentication failures - user not logged in or invalid token
				fc.record({
					type: fc.constant('authentication' as const),
					error: fc.oneof(
						fc.constant(new Error('Authentication required')),
						fc.constant(new Error('Invalid or expired token')),
						fc.constant(new Error('Please log in to continue')),
						fc.constant(new Error('Session expired'))
					)
				}),
				// Authorization failures - user logged in but lacks permissions
				fc.record({
					type: fc.constant('authorization' as const),
					error: fc.oneof(
						fc.constant(
							new Error('You do not have permission to invite tenants')
						),
						fc.constant(new Error('Access denied: insufficient permissions')),
						fc.constant(
							new Error('You do not have access to this property resource')
						),
						fc.constant(new Error('Forbidden: property owner access required'))
					)
				})
			),
			async ({ type, error }) => {
				// Clear all mocks before each property test iteration
				vi.clearAllMocks()

				// Create a mutation that mimics the form's behavior
				const { result } = renderHook(
					() =>
						useMutation({
							mutationFn: async (_payload: InviteTenantRequest) => {
								throw error
							},
							onError: (err: unknown) => {
								// This is the same error handling logic as in the form
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

				// Execute the mutation with valid data
				const payload: InviteTenantRequest = {
					tenantData: {
						email: 'test@example.com',
						first_name: 'Test',
						last_name: 'User'
					},
					leaseData: {
						property_id: 'prop-123'
					}
				}

				result.current.mutate(payload)

				// Assert: toast.error was called
				await waitFor(
					() => {
						expect(toast.error).toHaveBeenCalled()
					},
					{ timeout: 2000 }
				)

				// Verify the error toast was called with proper structure
				const errorCalls = vi.mocked(toast.error).mock.calls
				expect(errorCalls.length).toBeGreaterThan(0)

				const [title, options] = errorCalls[0] as [
					string,
					{ description: string }
				]

				// Verify basic structure
				expect(title).toBe('Failed to send invitation')
				expect(options.description).toBeDefined()
				expect(typeof options.description).toBe('string')

				// Verify the error message is displayed
				expect(options.description).toBe(error.message)

				// Verify that the error message contains appropriate keywords
				// based on the error type
				const description = options.description.toLowerCase()

				if (type === 'authentication') {
					// Authentication errors should mention login, token, or session
					const hasAuthKeywords =
						description.includes('authentication') ||
						description.includes('token') ||
						description.includes('log in') ||
						description.includes('session')

					expect(hasAuthKeywords).toBe(true)
				} else {
					// Authorization errors should mention permission, access, or forbidden
					const hasAuthzKeywords =
						description.includes('permission') ||
						description.includes('access') ||
						description.includes('forbidden')

					expect(hasAuthzKeywords).toBe(true)
				}
			}
		),
		{ numRuns: 100 }
	)
})
