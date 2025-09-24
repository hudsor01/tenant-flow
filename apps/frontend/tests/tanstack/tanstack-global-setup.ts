/**
 * Global setup for TanStack Query tests
 * Prepares test environment with proper authentication and data seeding
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {

	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()

	try {
		// 1. Ensure development server is running
		const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || (() => {
			throw new Error('PLAYWRIGHT_TEST_BASE_URL environment variable is required for TanStack global setup')
		})()

		try {
			await page.goto(`${baseURL}/health`, { timeout: 30000 })
		} catch (error) {
		}

		// 2. Setup authentication if needed

		try {
			// Navigate to login page or setup mock auth
			await page.goto(`${baseURL}/login`)

			// Check if already authenticated by looking for dashboard redirect
			await page.waitForTimeout(2000)

			if (page.url().includes('/dashboard')) {
			} else {
				// Setup mock authentication for testing
				await page.evaluate(() => {
					// Mock auth state in localStorage or cookies
					localStorage.setItem('test-auth', 'true')
					localStorage.setItem('user-id', 'test-user-id')
				})

			}
		} catch (error) {
		}

		// 3. Expose TanStack Query Client for testing

		await page.addInitScript(() => {
			// Global setup for TanStack Query testing
			window.addEventListener('DOMContentLoaded', () => {
				const setupQueryClientExposure = () => {
					// Try multiple methods to expose the QueryClient

					// Method 1: React DevTools fiber tree traversal
					const findQueryClient = (fiber: any): any => {
						if (!fiber) return null

						// Check if this fiber has QueryClient in context
						if (fiber.memoizedProps?.value?.queryClient) {
							return fiber.memoizedProps.value.queryClient
						}

						// Check context
						if (fiber.memoizedState?.memoizedState?.queryClient) {
							return fiber.memoizedState.memoizedState.queryClient
						}

						// Traverse children
						let child = fiber.child
						while (child) {
							const found = findQueryClient(child)
							if (found) return found
							child = child.sibling
						}

						return null
					}

					// Method 2: Direct DOM traversal
					const findReactRoot = () => {
						const rootElement = document.querySelector(
							'#__next, #root, [data-reactroot]'
						)
						if (rootElement) {
							const keys = Object.keys(rootElement)
							const reactKey = keys.find(
								key =>
									key.startsWith('__reactInternalInstance') ||
									key.startsWith('_reactInternalFiber')
							)

							if (reactKey && (rootElement as any)[reactKey]) {
								return findQueryClient((rootElement as any)[reactKey])
							}
						}
						return null
					}

					// Method 3: Global window attachment (if app exposes it)
					if ((window as any).queryClient) {
						;(window as any).__QUERY_CLIENT__ = (window as any).queryClient
						return
					}

					// Try React root method
					const queryClient = findReactRoot()
					if (queryClient) {
						;(window as any).__QUERY_CLIENT__ = queryClient
						return
					}

					// Fallback: Keep trying
					setTimeout(setupQueryClientExposure, 100)
				}

				setupQueryClientExposure()
			})

			// Also try after React has had time to initialize
			setTimeout(() => {
				if (!(window as any).__QUERY_CLIENT__) {
						'⚠️  QueryClient not found, tests may have limited functionality'
					)
				}
			}, 3000)
		})

		// 4. Clear any existing test data

		await page.goto(`${baseURL}/dashboard/properties`)
		await page.waitForTimeout(2000)

		// Clean up any properties with "test" in the name
		await page.evaluate(() => {
			// This would be implemented based on your cleanup API
		})

		// 5. Seed initial test data if needed

		// You could seed some basic test data here if needed
		// For now, we'll rely on the individual tests to create their own data

	} catch (error) {
		throw error
	} finally {
		await context.close()
		await browser.close()
	}
}

export default globalSetup
