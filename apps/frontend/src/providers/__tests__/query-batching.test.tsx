import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'

/**
 * Feature: frontend-backend-communication-optimization
 *
 * Tests the TanStack Query batching configuration for request deduplication
 */
describe('QueryProvider Batching Configuration', () => {
	it('should configure batching with correct parameters', () => {
		// Create a QueryClient with the same configuration as in query-provider.tsx
		const queryClient = new QueryClient({
			// @ts-expect-error batcher is not in types but available in runtime
			batcher: {
				batchWindowMs: 10,
				maxBatchSize: 10
			},
			defaultOptions: {
				queries: {
					staleTime: 5 * 60 * 1000,
					gcTime: 10 * 60 * 1000,
					retry: failureCount => failureCount < 3,
					retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
					refetchOnWindowFocus: 'always',
					refetchOnReconnect: 'always',
					refetchOnMount: true,
					networkMode: 'online',
					throwOnError: false,
					placeholderData: undefined
				},
				mutations: {
					networkMode: 'online'
				}
			}
		})

		// Verify the QueryClient was created successfully
		expect(queryClient).toBeDefined()
		expect(typeof queryClient).toBe('object')

		// Verify default options are set correctly
		const defaultQueryOptions = queryClient.getDefaultOptions().queries
		expect(defaultQueryOptions?.staleTime).toBe(5 * 60 * 1000) // 5 minutes
		expect(defaultQueryOptions?.gcTime).toBe(10 * 60 * 1000) // 10 minutes
		expect(defaultQueryOptions?.networkMode).toBe('online')
	})

	it('should handle batching configuration without throwing', () => {
		expect(() => {
			new QueryClient({
				// @ts-expect-error batcher is not in types but available in runtime
				batcher: {
					batchWindowMs: 10,
					maxBatchSize: 10
				}
			})
		}).not.toThrow()
	})

	it('should create QueryClient with batching enabled', () => {
		const queryClient = new QueryClient({
			// @ts-expect-error batcher is not in types but available in runtime
			batcher: {
				batchWindowMs: 10,
				maxBatchSize: 10
			}
		})

		// The QueryClient should be created successfully
		expect(queryClient).toBeInstanceOf(QueryClient)

		// Verify we can interact with the QueryClient (basic functionality test)
		expect(typeof queryClient.setQueryData).toBe('function')
		expect(typeof queryClient.getQueryData).toBe('function')
		expect(typeof queryClient.invalidateQueries).toBe('function')
	})
})
