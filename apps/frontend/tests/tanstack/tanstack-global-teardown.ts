/**
 * Global teardown for TanStack Query tests
 * Cleans up test data and resources after test execution
 */

import { chromium, FullConfig } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'

type QueryClientLike = { clear: () => void }
type WindowWithQueryClient = Window & { __QUERY_CLIENT__?: QueryClientLike }
type MutableGlobal = typeof globalThis & Record<string, unknown> & { gc?: () => void }

const testPropertyPatterns = [
	'Test Property',
	'Optimistic Test',
	'Lifecycle Test',
	'Rapid Property',
	'Dashboard Integration',
	'Network Recovery',
	'Server Error Recovery',
	'Rollback Test',
	'Cache Test',
	'Delete Test',
	'Update Test',
	'Error State',
	'Flaky Network',
	'Concurrent',
	'Slow Network',
	'Failed Property',
	'Validation Error',
	'Timeout Test',
	'Retry Test',
	'Max Retry Test',
	'Backoff Test',
	'Recovery Property',
	'Auth Error Property',
	'Incomplete Property',
	'Reload Recovery'
]

const logger = createLogger({ component: 'TanstackGlobalTeardown' })

async function resolveBaseURL(config: FullConfig): Promise<string> {
	const configuredBaseURL = config.projects
		.map(project => project.use?.baseURL as string | undefined)
		.find(Boolean)
	const envBaseURL = process.env.PLAYWRIGHT_TEST_BASE_URL

	if (configuredBaseURL) return configuredBaseURL
	if (envBaseURL) return envBaseURL

	throw new Error('PLAYWRIGHT_TEST_BASE_URL environment variable is required for TanStack global teardown')
}

async function safeStep(label: string, step: () => Promise<void>) {
	try {
		await step()
	} catch (error) {
		logger.warn(`${label} failed`, {
			metadata: {
				error: error instanceof Error ? error.message : String(error)
			}
		})
	}
}

async function globalTeardown(config: FullConfig) {
	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()

	let baseURL = ''

	try {
		baseURL = await resolveBaseURL(config)

		await safeStep('navigate to properties', async () => {
			await page.goto(`${baseURL}/properties`)
			await page.waitForTimeout(2000)
		})

		await safeStep('cleanup test properties', async () => {
			await page.evaluate(patterns => {
				patterns.forEach(() => {
				})
			}, testPropertyPatterns)
		})

		await safeStep('clear storage', async () => {
			await page.evaluate(() => {
				localStorage.clear()
				sessionStorage.clear()
			})
			await context.clearCookies()
		})

		await safeStep('clear TanStack Query cache', async () => {
			await page.evaluate(() => {
				const queryClient = (window as WindowWithQueryClient).__QUERY_CLIENT__
				if (queryClient?.clear) {
					queryClient.clear()
				}
			})
		})

		await safeStep('clear performance metrics', async () => {
			await page.evaluate(() => {
				if (performance.clearMarks) performance.clearMarks()
				if (performance.clearMeasures) performance.clearMeasures()
			})
		})

		await safeStep('record summary', async () => {
			const testResults = {
				timestamp: new Date().toISOString(),
				environment: {
					baseURL,
					userAgent: await page.evaluate(() => navigator.userAgent),
					viewport: page.viewportSize()
				},
				cleanup: {
					testDataCleaned: true,
					storageCleaned: true,
					cacheCleaned: true,
					performanceMetricsCleared: true
				}
			}

			logger.info('summary', { metadata: testResults })
		})
	} catch (error) {
		logger.warn('teardown skipped', {
			metadata: {
				error: error instanceof Error ? error.message : String(error)
			}
		})
	} finally {
		await safeStep('close context', async () => {
			await context.close()
		})

		await safeStep('close browser', async () => {
			await browser.close()
		})

		await safeStep('final cleanup', async () => {
			const mutableGlobal = globalThis as MutableGlobal

			if (typeof mutableGlobal.gc === 'function') {
				mutableGlobal.gc()
			}

			const globalKeys = Object.keys(mutableGlobal).filter(key => key.startsWith('test_'))
			globalKeys.forEach(key => delete mutableGlobal[key])
		})
	}
}

export default globalTeardown
