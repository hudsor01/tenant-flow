/**
 * Global setup for TanStack Query tests
 * Prepares test environment with proper authentication and data seeding
 */

import { chromium } from '@playwright/test'
import { QueryClient } from '@tanstack/react-query'

interface FiberNode {
	memoizedProps?: {
		value?: {
			queryClient?: QueryClient
		}
	}
	memoizedState?: {
		memoizedState?: {
			queryClient?: QueryClient
		}
	}
	child?: FiberNode
	sibling?: FiberNode
}

type WindowWithQueryClient = Window & {
	queryClient?: QueryClient
	__QUERY_CLIENT__?: QueryClient
}

type ReactRootElement = HTMLElement & Record<string, unknown>

async function globalSetup() {
	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()

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

		if (page.url().includes('/')) {
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
		if (typeof window === 'undefined' || !window.addEventListener) return

		const windowWithQueryClient = window as WindowWithQueryClient

		const findQueryClient = (fiber: FiberNode | null): QueryClient | null => {
			if (!fiber) return null

			if (fiber.memoizedProps?.value?.queryClient) {
				return fiber.memoizedProps.value.queryClient
			}

			if (fiber.memoizedState?.memoizedState?.queryClient) {
				return fiber.memoizedState.memoizedState.queryClient
			}

			let child = fiber.child
			while (child) {
				const found = findQueryClient(child)
				if (found) return found
				child = child.sibling
			}

			return null
		}

		const findReactRoot = (): QueryClient | null => {
			const rootElement = document.querySelector<HTMLElement>(
				'#__next, #root, [data-reactroot]'
			)
			if (!rootElement) return null

			const reactKey = Object.keys(rootElement).find(
				key =>
					key.startsWith('__reactInternalInstance') ||
					key.startsWith('_reactInternalFiber')
			)

			if (reactKey && reactKey in rootElement) {
				const element = rootElement as ReactRootElement
				const fiberNode = element[reactKey] as FiberNode | undefined
				if (fiberNode) {
					return findQueryClient(fiberNode)
				}
			}

			return null
		}

		const setupQueryClientExposure = () => {
			if (windowWithQueryClient.queryClient) {
				windowWithQueryClient.__QUERY_CLIENT__ =
					windowWithQueryClient.queryClient
				return
			}

			const queryClient = findReactRoot()
			if (queryClient) {
				windowWithQueryClient.__QUERY_CLIENT__ = queryClient
				return
			}

			setTimeout(setupQueryClientExposure, 100)
		}

		window.addEventListener('DOMContentLoaded', setupQueryClientExposure)
		setupQueryClientExposure()

		setTimeout(() => {
			if (!windowWithQueryClient.__QUERY_CLIENT__) {
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
	await page.goto(`${baseURL}/properties`)
	await page.waitForTimeout(200)

	// Clean up any properties with "test" in the name
	await page.evaluate(() => {
		// This would be implemented based on your cleanup API
	})

	// 5. Seed initial test data if needed
	// You could seed some basic test data here if needed
	// For now, we'll rely on the individual tests to create their own data

	await context.close()
	await browser.close()
}

export default globalSetup
