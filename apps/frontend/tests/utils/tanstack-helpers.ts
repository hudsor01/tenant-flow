/**
 * TanStack Query test utilities for Playwright tests
 * Provides helpers for testing optimistic updates, cache behavior, and network conditions
 */

import { expect, Page, Response } from '@playwright/test'
import type { QueryClient } from '@tanstack/react-query'
import type { TestProperty } from '../fixtures/property-data.js'

// Extend Window interface for test environment
declare global {
	interface Window {
		__QUERY_CLIENT__?: QueryClient
	}
}

/**
 * TanStack Query cache inspection utilities
 */
export class TanStackQueryHelper {
	constructor(private page: Page) {}

	/**
	 * Get query data from TanStack Query cache
	 */
	async getQueryData(queryKey: string[]) {
		return await this.page.evaluate(key => {
			const queryClient = window.__QUERY_CLIENT__
			if (!queryClient) {
				throw new Error(
					"QueryClient not found on window. Make sure it's exposed for testing."
				)
			}
			return queryClient.getQueryData(key)
		}, queryKey)
	}

	/**
	 * Get all queries in cache
	 */
	async getAllQueries() {
		return await this.page.evaluate(() => {
			const queryClient = window.__QUERY_CLIENT__
			if (!queryClient) return []
			return queryClient
				.getQueryCache()
				.getAll()
				.map(query => ({
					queryKey: query.queryKey,
					state: query.state
				}))
		})
	}

	/**
	 * Wait for query to be in specific state
	 */
	async waitForQueryState(
		queryKey: string[],
		state: 'success' | 'error' | 'loading'
	) {
		await this.page.waitForFunction(
			({ key, targetState }) => {
				const queryClient = window.__QUERY_CLIENT__
				if (!queryClient) return false
				const query = queryClient.getQueryCache().find({ queryKey: key })
				return query?.state?.status === targetState
			},
			{ key: queryKey, targetState: state },
			{ timeout: 10000 }
		)
	}

	/**
	 * Invalidate specific queries (trigger refetch)
	 */
	async invalidateQueries(queryKey: string[]) {
		await this.page.evaluate(key => {
			const queryClient = window.__QUERY_CLIENT__
			if (queryClient) {
				queryClient.invalidateQueries({ queryKey: key })
			}
		}, queryKey)
	}

	/**
	 * Clear all cache
	 */
	async clearCache() {
		await this.page.evaluate(() => {
			const queryClient = window.__QUERY_CLIENT__
			if (queryClient) {
				queryClient.clear()
			}
		})
	}

	/**
	 * Get mutation state
	 */
	async getMutationState() {
		return await this.page.evaluate(() => {
			const queryClient = window.__QUERY_CLIENT__
			if (!queryClient) return []
			return queryClient
				.getMutationCache()
				.getAll()
				.map(mutation => ({
					state: mutation.state,
					mutationKey: mutation.options.mutationKey
				}))
		})
	}
}

/**
 * Network condition simulation utilities
 */
export class NetworkSimulator {
	constructor(private page: Page) {}

	/**
	 * Simulate slow network conditions
	 */
	async simulateSlowNetwork() {
		await this.page.route('**/api/**', async route => {
			// Add 2 second delay to all API calls
			await new Promise(resolve => setTimeout(resolve, 2000))
			await route.continue()
		})
	}

	/**
	 * Simulate network failures for specific endpoints
	 */
	async simulateNetworkFailure(endpoint: string, errorCode = 500) {
		await this.page.route(`**${endpoint}**`, async route => {
			await route.fulfill({
				status: errorCode,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Network error' })
			})
		})
	}

	/**
	 * Simulate intermittent failures (50% failure rate)
	 */
	async simulateIntermittentFailures(endpoint: string) {
		let requestCount = 0
		await this.page.route(`**${endpoint}**`, async route => {
			requestCount++
			if (requestCount % 2 === 0) {
				await route.abort('failed')
			} else {
				await route.continue()
			}
		})
	}

	/**
	 * Mock successful API response
	 */
	async mockSuccessResponse(endpoint: string, data: unknown) {
		await this.page.route(`**${endpoint}**`, async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(data)
			})
		})
	}

	/**
	 * Reset all network mocks
	 */
	async resetNetworkMocks() {
		await this.page.unrouteAll()
	}
}

/**
 * Property table interaction utilities
 */
export class PropertyTableHelper {
	constructor(private page: Page) {}

	/**
	 * Get all property rows from the table
	 */
	async getPropertyRows() {
		return await this.page.locator('table tbody tr').all()
	}

	/**
	 * Get property count from table
	 */
	async getPropertyCount() {
		const rows = await this.getPropertyRows()
		// Filter out empty state row if it exists
		const emptyRow = await this.page
			.locator('table tbody tr')
			.filter({ hasText: 'No properties found' })
		const hasEmptyRow = (await emptyRow.count()) > 0
		return hasEmptyRow ? 0 : rows.length
	}

	/**
	 * Get property by name from table
	 */
	getPropertyByName(name: string) {
		return this.page.locator(`table tbody tr:has-text("${name}")`)
	}

	/**
	 * Wait for property to appear in table
	 */
	async waitForPropertyInTable(name: string, timeout: number = 10000) {
		await this.getPropertyByName(name).waitFor({
			state: 'visible',
			timeout
		})
	}

	/**
	 * Wait for property to disappear from table
	 */
	async waitForPropertyToDisappear(name: string, timeout: number = 10000) {
		await this.getPropertyByName(name).waitFor({
			state: 'hidden',
			timeout
		})
	}

	/**
	 * Scroll to load more trigger element
	 */
	async scrollToLoadMore() {
		const loadMoreTrigger = this.page.locator(
			'[data-testid="load-more-trigger"], .load-more-trigger, [ref="loadMoreRef"]'
		)
		if ((await loadMoreTrigger.count()) > 0) {
			await loadMoreTrigger.scrollIntoViewIfNeeded()
		} else {
			// Fallback: scroll to bottom of table
			await this.page.locator('table tbody tr').last().scrollIntoViewIfNeeded()
		}
	}

	/**
	 * Wait for loading indicator to appear/disappear
	 */
	async waitForLoading(
		shouldBeVisible: boolean = true,
		timeout: number = 5000
	) {
		const loadingIndicator = this.page.locator(
			'text="Loading more properties..."'
		)
		if (shouldBeVisible) {
			await expect(loadingIndicator).toBeVisible({ timeout })
		} else {
			await expect(loadingIndicator).toBeHidden({ timeout })
		}
	}

	/**
	 * Check if infinite scroll has reached the end
	 */
	async isAtEnd() {
		const loadMoreTrigger = this.page.locator(
			'[data-testid="load-more-trigger"]'
		)
		return (await loadMoreTrigger.count()) === 0
	}
}

/**
 * Dashboard stats helper for verifying optimistic updates
 */
export class DashboardStatsHelper {
	constructor(private page: Page) {}

	/**
	 * Get total properties count from dashboard stats
	 */
	async getTotalPropertiesCount(): Promise<number> {
		const statsCard = this.page.locator(
			'[data-testid="total-properties"], .metrics-card:has-text("Total Properties")'
		)
		const countText = await statsCard
			.locator('.value, [data-testid="property-count"]')
			.textContent()
		return parseInt(countText?.replace(/,/g, '') || '0')
	}

	/**
	 * Wait for stats to update to specific value
	 */
	async waitForStatsUpdate(expectedCount: number, timeout: number = 10000) {
		await expect(async () => {
			const actualCount = await this.getTotalPropertiesCount()
			expect(actualCount).toBe(expectedCount)
		}).toPass({ timeout })
	}
}

/**
 * Property form interaction utilities
 */
export class PropertyFormHelper {
	constructor(private page: Page) {}

	/**
	 * Fill and submit new property form
	 */
	async createProperty(property: Partial<TestProperty>) {
		// Open new property dialog
		await this.page.click('button:has-text("New Property")')

		// Fill form fields
		if (property.name) {
			await this.page.fill('input[name="name"]', property.name)
		}
		if (property.address_line1) {
			await this.page.fill('input[name="address"]', property.address_line1)
		}
		if (property.city) {
			await this.page.fill('input[name="city"]', property.city)
		}
		if (property.state) {
			await this.page.fill('input[name="state"]', property.state)
		}
		if (property.postal_code) {
			await this.page.fill('input[name="postal_code"]', property.postal_code)
		}
		if (property.property_type) {
			await this.page.click('button[user_type="combobox"]')
			await this.page.click(`[data-value="${property.property_type}"]`)
		}

		// Submit form
		await this.page.click('button[type="submit"]')
	}

	/**
	 * Wait for form submission to complete
	 */
	async waitForFormSubmission() {
		// Wait for dialog to close
		await expect(this.page.locator('[user_type="dialog"]')).toBeHidden()
	}
}

/**
 * Performance measurement utilities
 */
export class PerformanceHelper {
	constructor(private page: Page) {}

	/**
	 * Measure scroll performance
	 */
	async measureScrollPerformance(scrollDistance: number = 1000) {
		const startTime = Date.now()

		await this.page.evaluate(distance => {
			window.scrollBy(0, distance)
		}, scrollDistance)

		// Wait for scroll to complete
		await this.page.waitForTimeout(100)

		const endTime = Date.now()
		return endTime - startTime
	}

	/**
	 * Measure page load time
	 */
	async measurePageLoadTime() {
		const startTime = Date.now()
		await this.page.waitForLoadState('networkidle')
		const endTime = Date.now()
		return endTime - startTime
	}

	/**
	 * Get network activity metrics
	 */
	async getNetworkMetrics() {
		const responses: Response[] = []

		this.page.on('response', response => {
			responses.push(response)
		})

		return {
			getRequestCount: () => responses.length,
			getFailedRequests: () => responses.filter(r => r.status() >= 400),
			getAverageResponseTime: () => {
				if (responses.length === 0) {
					return 0
				}
				const times = responses.map(response => {
					const candidate = response as Response & {
						timing?: () => { responseEnd?: number }
					}
					if (typeof candidate.timing === 'function') {
						return candidate.timing()?.responseEnd ?? 0
					}
					return 0
				})
				return times.reduce((sum, time) => sum + time, 0) / times.length
			}
		}
	}
}
