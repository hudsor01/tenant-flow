/**
 * TanStack Query Test Helpers
 * Utilities for testing TanStack Query cache behavior in Playwright tests
 */

import type { Page, Locator } from '@playwright/test'

/**
 * Helper class for inspecting TanStack Query cache state
 */
export class TanStackQueryHelper {
	constructor(private page: Page) {}

	/**
	 * Get the data for a specific query from the cache
	 */
	async getQueryData(queryKey: unknown[]): Promise<unknown> {
		return this.page.evaluate((key) => {
			const queryClient = (window as any).__QUERY_CLIENT__
			if (!queryClient) {
				throw new Error('Query client not found on window.__QUERY_CLIENT__')
			}
			return queryClient.getQueryData(key)
		}, queryKey)
	}

	/**
	 * Wait for a query to reach a specific state
	 */
	async waitForQueryState(
		queryKey: unknown[],
		state: 'loading' | 'success' | 'error'
	): Promise<void> {
		await this.page.waitForFunction(
			({ key, targetState }) => {
				const queryClient = (window as any).__QUERY_CLIENT__
				if (!queryClient) return false
				const query = queryClient.getQueryState(key)
				return query?.status === targetState
			},
			{ key: queryKey, targetState: state },
			{ timeout: 10000 }
		)
	}

	/**
	 * Wait for cache invalidation to complete
	 */
	async waitForInvalidation(queryKey: unknown[]): Promise<void> {
		await this.page.waitForFunction(
			(key) => {
				const ops = (window as any).cacheOperations || []
				return ops.some(
					(op: any) =>
						op.type === 'invalidateQueries' &&
						JSON.stringify(op.args[0]).includes(JSON.stringify(key))
				)
			},
			queryKey,
			{ timeout: 5000 }
		)
	}

	/**
	 * Get the current cache state for a query
	 */
	async getCacheState(queryKey: unknown[]): Promise<{
		status: string
		dataUpdatedAt: number
		isStale: boolean
	}> {
		return this.page.evaluate((key) => {
			const queryClient = (window as any).__QUERY_CLIENT__
			if (!queryClient) {
				throw new Error('Query client not found')
			}
			const state = queryClient.getQueryState(key)
			return {
				status: state?.status || 'idle',
				dataUpdatedAt: state?.dataUpdatedAt || 0,
				isStale: state?.isStale || false
			}
		}, queryKey)
	}

	async clearCache(): Promise<void> {
		await this.page.evaluate(() => {
			const qc = (window as Window & { __QUERY_CLIENT__?: any }).__QUERY_CLIENT__
			qc?.clear?.()
		})
	}

	async invalidateQueries(queryKey?: unknown[]): Promise<void> {
		await this.page.evaluate((key) => {
			const qc = (window as Window & { __QUERY_CLIENT__?: any }).__QUERY_CLIENT__
			if (!qc?.invalidateQueries) return
			qc.invalidateQueries(key ?? [])
		}, queryKey)
	}

	async getAllQueries(): Promise<unknown[]> {
		return this.page.evaluate(() => {
			const qc = (window as Window & { __QUERY_CLIENT__?: any }).__QUERY_CLIENT__
			const cache = qc?.getQueryCache?.()
			return cache?.getAll ? cache.getAll() : []
		})
	}
}

/**
 * Helper class for simulating network conditions
 */
export class NetworkSimulator {
	constructor(private page: Page) {}

	async simulateNetworkFailure(urlPattern: string, status = 500): Promise<void> {
		await this.page.route(urlPattern, (route) => {
			route.fulfill({ status, body: JSON.stringify({ error: 'Simulated failure' }) })
		})
	}

	async simulateSlowNetwork(delayMs = 1200): Promise<void> {
		await this.page.route('**/*', async (route) => {
			await this.page.waitForTimeout(delayMs)
			route.continue()
		})
	}

	async simulateIntermittentFailures(urlPattern = '**/*', failureRate = 0.3): Promise<void> {
		await this.page.route(urlPattern, async (route) => {
			if (Math.random() < failureRate) {
				return route.fulfill({ status: 503, body: JSON.stringify({ error: 'Intermittent failure' }) })
			}
			return route.continue()
		})
	}

	/**
	 * Mock a successful API response
	 */
	async mockSuccessResponse(url: string, data: unknown): Promise<void> {
		await this.page.route(url, (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(data)
			})
		})
	}

	/**
	 * Mock a failed API response
	 */
	async mockErrorResponse(
		url: string,
		status: number = 500,
		message?: string
	): Promise<void> {
		await this.page.route(url, (route) => {
			route.fulfill({
				status,
				contentType: 'application/json',
				body: JSON.stringify({ error: message || 'Internal Server Error' })
			})
		})
	}

	/**
	 * Simulate network delay
	 */
	async mockDelayedResponse(url: string, delay: number, data: unknown): Promise<void> {
		await this.page.route(url, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, delay))
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(data)
			})
		})
	}

	/**
	 * Simulate network timeout
	 */
	async mockTimeout(url: string): Promise<void> {
		await this.page.route(url, async (route) => {
			// Delay for longer than typical timeout
			await new Promise((resolve) => setTimeout(resolve, 60000))
			route.abort('timedout')
		})
	}

	/**
	 * Reset all network mocks
	 */
	async resetNetworkMocks(): Promise<void> {
		await this.page.unroute('**/*')
	}

	/**
	 * Simulate offline mode
	 */
	async goOffline(): Promise<void> {
		await this.page.context().setOffline(true)
	}

	/**
	 * Restore online mode
	 */
	async goOnline(): Promise<void> {
		await this.page.context().setOffline(false)
	}
}

/**
 * Helper class for interacting with property table
 */
export class PropertyTableHelper {
	constructor(private page: Page) {}

	/**
	 * Get the number of properties displayed in the table
	 */
	async getPropertyCount(): Promise<number> {
		const rows = await this.page.locator('table tbody tr').count()
		return rows
	}

	/**
	 * Get a property row by name
	 */
	getPropertyByName(name: string): Locator {
		return this.page.locator(`table tbody tr:has-text("${name}")`)
	}

	/**
	 * Wait for a property to appear in the table
	 */
	async waitForPropertyInTable(name: string, timeout?: number): Promise<void> {
		const options = timeout !== undefined ? { state: 'visible' as const, timeout } : { state: 'visible' as const }
		await this.page
			.locator(`table tbody tr:has-text("${name}")`)
			.waitFor(options)
	}

	/**
	 * Wait for a property to disappear from the table
	 */
	async waitForPropertyToDisappear(name: string, timeout?: number): Promise<void> {
		const options = timeout !== undefined ? { state: 'hidden' as const, timeout } : { state: 'hidden' as const }
		await this.page
			.locator(`table tbody tr:has-text("${name}")`)
			.waitFor(options)
	}

	/**
	 * Click edit button for a property
	 */
	async editProperty(name: string): Promise<void> {
		const row = this.getPropertyByName(name)
		await row.locator('button[aria-label="Edit"], button:has-text("Edit")').click()
	}

	/**
	 * Click delete button for a property
	 */
	async deleteProperty(name: string): Promise<void> {
		const row = this.getPropertyByName(name)
		await row.locator('button[aria-label="Delete"], button:has-text("Delete")').click()
	}

	/**
	 * Get all property names from the table
	 */
	async getAllPropertyNames(): Promise<string[]> {
		const rows = this.page.locator('table tbody tr')
		const count = await rows.count()
		const names: string[] = []

		for (let i = 0; i < count; i++) {
			const nameCell = rows.nth(i).locator('td').first()
			const name = await nameCell.textContent()
			if (name) {
				names.push(name.trim())
			}
		}

		return names
	}

	async scrollToLoadMore(): Promise<void> {
		await this.page.evaluate(() => {
			window.scrollBy(0, window.innerHeight)
		})
		await this.waitForLoading()
	}

	async waitForLoading(isLoading: boolean | number = true, timeout = 10000): Promise<void> {
		const effectiveTimeout = typeof isLoading === 'number' ? isLoading : timeout
		if (isLoading === true) {
			await this.page.locator('text="Loading more properties..."').first().waitFor({ state: 'visible', timeout: effectiveTimeout }).catch(() => {})
			return
		}
		if (isLoading === false) {
			await this.page.locator('text="Loading more properties..."').first().waitFor({ state: 'hidden', timeout: effectiveTimeout }).catch(() => {})
			return
		}
		await this.page.waitForLoadState('networkidle', { timeout: effectiveTimeout }).catch(() => {})
	}

	async isAtEnd(): Promise<boolean> {
		const loadingVisible = await this.page.locator('text="Loading more properties..."').first().isVisible().catch(() => false)
		const lastRow = this.page.locator('table tbody tr').last()
		const lastVisible = await lastRow.isVisible().catch(() => false)
		return !loadingVisible && lastVisible
	}
}

/**
 * Helper class for interacting with property forms
 */
export class PropertyFormHelper {
	constructor(private page: Page) {}

	/**
	 * Fill out and submit the property creation form
	 */
	async createProperty(property: {
		name?: string
		address?: string
		city?: string
		state?: string
		zip?: string
		type?: string
		units?: number
	}): Promise<void> {
		// Click "Add Property" or similar button
		await this.page
			.locator('button:has-text("Add Property"), button:has-text("New Property")')
			.click()

		// Fill form fields
		if (property.name) {
			await this.page.locator('input[name="name"], input[placeholder*="name" i]').fill(property.name)
		}
		if (property.address) {
			await this.page
				.locator('input[name="address"], input[placeholder*="address" i]')
				.fill(property.address)
		}
		if (property.city) {
			await this.page.locator('input[name="city"], input[placeholder*="city" i]').fill(property.city)
		}
		if (property.state) {
			await this.page
				.locator('input[name="state"], select[name="state"]')
				.fill(property.state)
		}
		if (property.zip) {
			await this.page.locator('input[name="zip"], input[placeholder*="zip" i]').fill(property.zip)
		}
		if (property.type) {
			await this.page.locator('select[name="type"]').selectOption(property.type)
		}
		if (property.units !== undefined) {
			await this.page
				.locator('input[name="units"], input[type="number"]')
				.fill(property.units.toString())
		}

		// Submit form
		await this.page.locator('button[type="submit"], button:has-text("Save")').click()
	}

	/**
	 * Update an existing property
	 */
	async updateProperty(updates: {
		name?: string
		address?: string
		city?: string
		state?: string
		zip?: string
	}): Promise<void> {
		// Fill form fields with updates
		if (updates.name) {
			const nameInput = this.page.locator('input[name="name"], input[placeholder*="name" i]')
			await nameInput.clear()
			await nameInput.fill(updates.name)
		}
		if (updates.address) {
			const addressInput = this.page.locator(
				'input[name="address"], input[placeholder*="address" i]'
			)
			await addressInput.clear()
			await addressInput.fill(updates.address)
		}
		if (updates.city) {
			const cityInput = this.page.locator('input[name="city"], input[placeholder*="city" i]')
			await cityInput.clear()
			await cityInput.fill(updates.city)
		}
		if (updates.state) {
			const stateInput = this.page.locator('input[name="state"], select[name="state"]')
			await stateInput.clear()
			await stateInput.fill(updates.state)
		}
		if (updates.zip) {
			const zipInput = this.page.locator('input[name="zip"], input[placeholder*="zip" i]')
			await zipInput.clear()
			await zipInput.fill(updates.zip)
		}

		// Submit form
		await this.page.locator('button[type="submit"], button:has-text("Save")').click()
	}

	/**
	 * Cancel form editing
	 */
	async cancelForm(): Promise<void> {
		await this.page.locator('button:has-text("Cancel")').click()
	}

	async waitForFormSubmission(timeout = 10000): Promise<void> {
		const success = this.page.getByText(/saved|created|updated|success/i)
		await success.first().waitFor({ timeout }).catch(() => {})
	}
}

/**
 * Helper class for monitoring dashboard statistics
 */
export class DashboardStatsHelper {
	constructor(private page: Page) {}

	/**
	 * Get dashboard statistics from the page
	 */
	async getDashboardStats(): Promise<{
		totalProperties?: number | undefined
		totalUnits?: number | undefined
		occupancyRate?: number | undefined
		totalRevenue?: number | undefined
	}> {
		// This would need to be customized based on your actual dashboard structure
		return {
			totalProperties: await this.getStatValue('total-properties'),
			totalUnits: await this.getStatValue('total-units'),
			occupancyRate: await this.getStatValue('occupancy-rate'),
			totalRevenue: await this.getStatValue('total-revenue')
		}
	}

	/**
	 * Get a specific stat value from the dashboard
	 */
	private async getStatValue(statName: string): Promise<number | undefined> {
		const element = this.page.locator(`[data-stat="${statName}"], [data-testid="${statName}"]`)
		const isVisible = await element.isVisible().catch(() => false)
		if (!isVisible) return undefined

		const text = await element.textContent()
		if (!text) return undefined

		// Extract number from text (handles $1,234.56 or 1,234 or 56% formats)
		const cleaned = text.replace(/[$,%]/g, '').trim()
		const num = parseFloat(cleaned)
		return isNaN(num) ? undefined : num
	}

	/**
	 * Wait for dashboard stats to load
	 */
	async waitForStatsToLoad(): Promise<void> {
		await this.page.waitForSelector('[data-testid="dashboard-stats"]', {
			state: 'visible',
			timeout: 10000
		})
	}

	async getTotalPropertiesCount(): Promise<number | undefined> {
		const stats = await this.getDashboardStats()
		return stats.totalProperties
	}

	async waitForStatsUpdate(previous?: number, timeout = 10000): Promise<void> {
		await this.page.waitForFunction(
			({ prev }) => {
				const el = document.querySelector('[data-stat="total-properties"], [data-testid="total-properties"]')
				if (!el) return false
				const text = el.textContent || ''
				const cleaned = text.replace(/[^0-9.]/g, '')
				const value = parseInt(cleaned, 10)
				if (Number.isNaN(value)) return false
				return prev === undefined ? true : value !== prev
			},
			{ prev: previous },
			{ timeout }
		)
	}
}

/**
 * Helper class for performance monitoring
 */
export class PerformanceHelper {
	constructor(private page: Page) {}

	/**
	 * Measure time to interactive
	 */
	async measureTimeToInteractive(): Promise<number> {
		const timing = await this.page.evaluate(() => {
			// Use modern Performance API
			const navTiming = performance.getEntriesByType('navigation')[0] as any
			return navTiming ? navTiming.domInteractive - navTiming.fetchStart : 0
		})
		return timing
	}

	/**
	 * Measure page load time
	 */
	async measurePageLoadTime(): Promise<number> {
		const timing = await this.page.evaluate(() => {
			const navTiming = performance.getEntriesByType('navigation')[0] as any
			return navTiming ? navTiming.loadEventEnd - navTiming.fetchStart : 0
		})
		return timing
	}

	/**
	 * Get navigation timing metrics
	 */
	async getNavigationTimings(): Promise<{
		dns: number
		tcp: number
		request: number
		response: number
		dom: number
		load: number
	}> {
		return this.page.evaluate(() => {
			const navTiming = performance.getEntriesByType('navigation')[0] as any
			if (!navTiming) {
				return { dns: 0, tcp: 0, request: 0, response: 0, dom: 0, load: 0 }
			}
			return {
				dns: navTiming.domainLookupEnd - navTiming.domainLookupStart,
				tcp: navTiming.connectEnd - navTiming.connectStart,
				request: navTiming.responseStart - navTiming.requestStart,
				response: navTiming.responseEnd - navTiming.responseStart,
				dom: navTiming.domComplete - navTiming.domLoading,
				load: navTiming.loadEventEnd - navTiming.loadEventStart
			}
		})
	}

	/**
	 * Get resource timing for specific resource types
	 */
	async getResourceTimings(type?: string): Promise<
		Array<{
			name: string
			duration: number
			size: number
		}>
	> {
		return this.page.evaluate((resourceType) => {
			const entries = performance.getEntriesByType('resource') as any[]
			const filtered = resourceType
				? entries.filter((e) => e.initiatorType === resourceType)
				: entries

			return filtered.map((entry) => ({
				name: entry.name,
				duration: entry.duration,
				size: entry.transferSize || 0
			}))
		}, type)
	}

	/**
	 * Start performance mark
	 */
	async startMark(markName: string): Promise<void> {
		await this.page.evaluate((name) => {
			performance.mark(name)
		}, markName)
	}

	/**
	 * End performance mark and get duration
	 */
	async endMark(markName: string, startMark: string): Promise<number> {
		return this.page.evaluate(
			({ end, start }) => {
				performance.mark(end)
				performance.measure(`${start}-to-${end}`, start, end)
				const measure = performance.getEntriesByName(`${start}-to-${end}`)[0]
				return measure?.duration || 0
			},
			{ end: markName, start: startMark }
		)
	}

	async measureScrollPerformance(): Promise<number> {
		return this.page.evaluate(() => {
			const start = performance.now()
			window.scrollBy(0, window.innerHeight)
			return performance.now() - start
		})
	}
}
