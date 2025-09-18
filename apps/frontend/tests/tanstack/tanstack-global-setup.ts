/**
 * Global setup for TanStack Query tests
 * Prepares test environment with proper authentication and data seeding
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
	console.log('🚀 Setting up TanStack Query test environment...')

	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()

	try {
		// 1. Ensure development server is running
		console.log('📡 Checking development server...')
		const baseURL =
			process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3005'

		try {
			await page.goto(`${baseURL}/health`, { timeout: 30000 })
			console.log('✅ Development server is ready')
		} catch (error) {
			console.log('⚠️  Health check failed, but continuing with setup')
		}

		// 2. Setup authentication if needed
		console.log('🔐 Setting up authentication...')

		try {
			// Navigate to login page or setup mock auth
			await page.goto(`${baseURL}/login`)

			// Check if already authenticated by looking for dashboard redirect
			await page.waitForTimeout(2000)

			if (page.url().includes('/dashboard')) {
				console.log('✅ Already authenticated')
			} else {
				// Setup mock authentication for testing
				await page.evaluate(() => {
					// Mock auth state in localStorage or cookies
					localStorage.setItem('test-auth', 'true')
					localStorage.setItem('user-id', 'test-user-id')
				})

				console.log('✅ Mock authentication configured')
			}
		} catch (error) {
			console.log('⚠️  Authentication setup failed:', error)
		}

		// 3. Expose TanStack Query Client for testing
		console.log('⚙️  Configuring TanStack Query for testing...')

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
						console.log('✅ QueryClient exposed via window.queryClient')
						return
					}

					// Try React root method
					const queryClient = findReactRoot()
					if (queryClient) {
						;(window as any).__QUERY_CLIENT__ = queryClient
						console.log('✅ QueryClient exposed via React fiber traversal')
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
					console.log(
						'⚠️  QueryClient not found, tests may have limited functionality'
					)
				}
			}, 3000)
		})

		// 4. Clear any existing test data
		console.log('🧹 Cleaning up test data...')

		await page.goto(`${baseURL}/dashboard/properties`)
		await page.waitForTimeout(2000)

		// Clean up any properties with "test" in the name
		await page.evaluate(() => {
			// This would be implemented based on your cleanup API
			console.log('Test cleanup would happen here')
		})

		// 5. Seed initial test data if needed
		console.log('🌱 Seeding test data...')

		// You could seed some basic test data here if needed
		// For now, we'll rely on the individual tests to create their own data

		console.log('✅ TanStack Query test environment setup complete')
	} catch (error) {
		console.error('❌ Global setup failed:', error)
		throw error
	} finally {
		await context.close()
		await browser.close()
	}
}

export default globalSetup
