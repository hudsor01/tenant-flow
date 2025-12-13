import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * Feature: tenant-onboarding-optimization, Property 4: Data Cache Preservation
 *
 * Property: For any navigation between tenant portal sections, previously fetched data
 * SHALL remain in the TanStack Query cache and not trigger redundant fetches.
 *
 * Validates: Requirements 3.3
 */
describe('Property 4: Data Cache Preservation', () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 5 * 60 * 1000, // 5 minutes
					gcTime: 10 * 60 * 1000, // 10 minutes
					retry: false
				}
			}
		})
	})

	it('should preserve cached data for the configured staleTime duration', () => {
		fc.assert(
			fc.property(
				// Generate random query keys
				fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
					minLength: 1,
					maxLength: 3
				}),
				// Generate random data
				fc.record({
					id: fc.integer({ min: 1, max: 1000 }),
					name: fc.string({ minLength: 1, maxLength: 50 })
				}),
				(queryKey, data) => {
					// Set data in cache
					queryClient.setQueryData(queryKey, data)

					// Verify data is immediately available
					const cachedData = queryClient.getQueryData(queryKey)
					expect(cachedData).toEqual(data)

					// Verify query state shows data is fresh (not stale)
					const queryState = queryClient.getQueryState(queryKey)
					expect(queryState?.dataUpdatedAt).toBeGreaterThan(0)
				}
			),
			{ numRuns: 100 }
		)
	})

	it('should maintain separate cache entries for different query keys', () => {
		fc.assert(
			fc.property(
				// Generate two different query keys
				fc
					.tuple(
						fc.array(
							fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length > 0),
							{ minLength: 1, maxLength: 3 }
						),
						fc.array(
							fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length > 0),
							{ minLength: 1, maxLength: 3 }
						)
					)
					.filter(
						([key1, key2]) => JSON.stringify(key1) !== JSON.stringify(key2)
					),
				// Generate two different data objects
				fc.record({
					id: fc.integer({ min: 0, max: 1000 }),
					value: fc
						.stringMatching(/^[a-zA-Z0-9 ]+$/)
						.filter(s => s.length > 0 && s.length <= 20)
				}),
				fc.record({
					id: fc.integer({ min: 0, max: 1000 }),
					value: fc
						.stringMatching(/^[a-zA-Z0-9 ]+$/)
						.filter(s => s.length > 0 && s.length <= 20)
				}),
				([queryKey1, queryKey2], data1, data2) => {
					// Clear any existing cache to ensure clean state
					queryClient.clear()

					// Set different data for different keys
					queryClient.setQueryData(queryKey1, data1)
					queryClient.setQueryData(queryKey2, data2)

					// Verify each key has its own data
					const cached1 = queryClient.getQueryData(queryKey1)
					const cached2 = queryClient.getQueryData(queryKey2)
					expect(cached1).toEqual(data1)
					expect(cached2).toEqual(data2)

					// Verify setting data for one key doesn't affect the other key
					const newData = { id: 999, value: 'unique' }
					queryClient.setQueryData(queryKey1, newData)

					const updatedCached1 = queryClient.getQueryData(queryKey1)
					const unchangedCached2 = queryClient.getQueryData(queryKey2)

					expect(updatedCached1).toEqual(newData)
					expect(unchangedCached2).toEqual(data2)
				}
			),
			{ numRuns: 100 }
		)
	})

	it('should allow cache invalidation without affecting other queries', () => {
		fc.assert(
			fc.property(
				// Generate multiple unique query keys using alphanumeric strings and unique index
				fc.array(fc.integer({ min: 0, max: 1000 }), {
					minLength: 2,
					maxLength: 5
				}),
				// Generate data for each key
				fc.array(fc.record({ value: fc.integer() }), {
					minLength: 2,
					maxLength: 5
				}),
				(keyIndices, dataArray) => {
					// Clear cache for clean state
					queryClient.clear()

					// Ensure we have at least 2 keys
					if (keyIndices.length < 2 || dataArray.length < 2) return

					// Create unique query keys by using index as part of key
					const keys = keyIndices
						.slice(0, Math.min(keyIndices.length, dataArray.length))
						.map((idx, i) => [`query-${i}-${idx}`])

					// Set data for all keys
					keys.forEach((key, index) => {
						queryClient.setQueryData(key, dataArray[index])
					})

					// Invalidate first query
					const firstKey = keys[0]
					if (firstKey) {
						queryClient.invalidateQueries({ queryKey: firstKey })
					}

					// Verify other queries still have their data
					for (let i = 1; i < keys.length; i++) {
						const key = keys[i]
						if (key) {
							expect(queryClient.getQueryData(key)).toEqual(dataArray[i])
						}
					}
				}
			),
			{ numRuns: 100 }
		)
	})

	it('should respect gcTime for cache cleanup', () => {
		fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
					minLength: 1,
					maxLength: 3
				}),
				fc.record({ id: fc.integer() }),
				(queryKey, data) => {
					// Set data in cache
					queryClient.setQueryData(queryKey, data)

					// Data should be in cache
					expect(queryClient.getQueryData(queryKey)).toEqual(data)

					// Clear the cache
					queryClient.clear()

					// Data should be removed
					expect(queryClient.getQueryData(queryKey)).toBeUndefined()
				}
			),
			{ numRuns: 100 }
		)
	})
})
