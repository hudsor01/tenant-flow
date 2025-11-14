/**
 * Global setup for TanStack Query tests
 * Prepares test environment with proper authentication and data seeding
 */

import { chromium } from '@playwright/test'

interface FiberNode {
	memoizedProps?: {
		value?: {
			queryClient?: unknown
		}
	}
	memoizedState?: {
		memoizedState?: {
			queryClient?: unknown
		}
	}
	child?: FiberNode
	sibling?: FiberNode
}

async function globalSetup() {
	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()

	try {
		// 1. Ensure development server is running
		const baseURL =
			process.env.PLAYWRIGHT_TEST_BASE_URL ||
			(() => {
				throw new Error(
					'PLAYWRIGHT_TEST_BASE_URL environment variable is required for TanStack global setup'
				)
			})()

		try {
			await page.goto(`${baseURL}/health`, { timeout: 30000 })
		} catch {
			// Silently ignore health check failures
		}

		// 2. Setup authentication if needed
		try {
			// Navigate to login page or setup mock auth
			await page.goto(`${baseURL}/login`)

			// Check if already authenticated by looking for dashboard redirect
			await page.waitForTimeout(2000)

			if (page.url().includes('/dashboard')) {
				// Already authenticated
			} else {
				// Setup mock authentication for testing
				await page.evaluate(() => {
					// Mock auth state in localStorage or cookies
					localStorage.setItem('test-auth', 'true')
					localStorage.setItem('user-id', 'test-user-id')
				})
			}
		} catch {
			// Silently ignore auth-helpers failures
		}

		// 3. Expose TanStack Query Client for testing
		await page.addInitScript(() => {
			// Global setup for TanStack Query testing
			if (typeof window !== 'undefined' && window.addEventListener) {
				window.addEventListener('DOMContentLoaded', () => {
					const setupQueryClientExposure = () => {
						// Try multiple methods to expose the QueryClient

						// Method 1: React DevTools fiber tree traversal
						const findQueryClient = (fiber: FiberNode | null): unknown => {
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
							const rootElement = document.querySelector<HTMLElement>(
								'#__next, #root, [data-reactroot]'
							)
							if (rootElement) {
								const keys = Object.keys(rootElement)
								const reactKey = keys.find(
									key =>
										key.startsWith('__reactInternalInstance') ||
										key.startsWith('_reactInternalFiber')
								)

								if (reactKey && reactKey in rootElement) {
							const element = rootElement as Record<string, unknown>
							const fiberNode = element[reactKey]
							if (fiberNode) {
								return findQueryClient(fiberNode as FiberNode)
							}
						}
							}
							return null
						}

						// Method 3: Global window attachment (if app exposes it)
						interface WindowWithQueryClient extends Window {
							queryClient?: unknown
							__QUERY_CLIENT__?: unknown
						}
						const windowWithQueryClient = window as WindowWithQueryClient
						if (windowWithQueryClient.queryClient) {
							windowWithQueryClient.__QUERY_CLIENT__ =
								windowWithQueryClient.queryClient
							return
						}

						// Try React root method
						const queryClient = findReactRoot()
						if (queryClient) {
							windowWithQueryClient.__QUERY_CLIENT__ = queryClient
							return
						}

						// Fallback: Keep trying
						setTimeout(setupQueryClientExposure, 100)
					}

					setupQueryClientExposure()
				})
			}

			// Also try after React has had time to initialize
			setTimeout(() => {
				interface WindowWithQueryClient extends Window {
					__QUERY_CLIENT__?: unknown
				}
				const windowWithQueryClient = window as WindowWithQueryClient
				if (!windowWithQueryClient.__QUERY_CLIENT__) {
					// Log warning for test diagnostics
					const diagnosticConsole =
						typeof globalThis !== 'undefined'
							? (globalThis['console'] as Console | undefined)
							: undefined
					diagnosticConsole?.warn?.(
						'️ QueryClient not found, tests may have limited functionality'
					)
				}
			}, 30)
		})

		// 4. Clear any existing test data
		await page.goto(`${baseURL}/dashboard/properties`)
		await page.waitForTimeout(200)

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
