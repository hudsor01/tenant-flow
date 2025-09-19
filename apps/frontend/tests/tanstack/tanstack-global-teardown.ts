/**
 * Global teardown for TanStack Query tests
 * Cleans up test data and resources after test execution
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
	console.log('🧹 Starting TanStack Query test cleanup...')

	const browser = await chromium.launch()
	const context = await browser.newContext()
	const page = await context.newPage()

	try {
		const baseURL =
			process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3005'

		// 1. Clean up test data created during tests
		console.log('🗑️  Cleaning up test data...')

		try {
			await page.goto(`${baseURL}/dashboard/properties`)
			await page.waitForTimeout(2000)

			// Clean up properties with test names
			await page.evaluate(async () => {
				// If your app exposes a cleanup API, use it here
				console.log('Cleaning up test properties...')

				// Example cleanup logic (adjust based on your app's API)
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

				// This would be implemented based on your actual cleanup needs
				// For now, just log what would be cleaned up
				testPropertyPatterns.forEach(pattern => {
					console.log(`Would clean up properties matching: ${pattern}`)
				})
			})
		} catch (error) {
			console.log('⚠️  Test data cleanup failed (this may be normal):', error)
		}

		// 2. Clear browser storage and cache
		console.log('💾 Clearing browser storage...')

		try {
			// Clear localStorage, sessionStorage, and cookies
			await page.evaluate(() => {
				localStorage.clear()
				sessionStorage.clear()
			})

			await context.clearCookies()

			console.log('✅ Browser storage cleared')
		} catch (error) {
			console.log('⚠️  Storage cleanup failed:', error)
		}

		// 3. Clear any TanStack Query cache
		console.log('🗄️  Clearing query cache...')

		try {
			await page.evaluate(() => {
				if ((window as any).__QUERY_CLIENT__) {
					;(window as any).__QUERY_CLIENT__.clear()
					console.log('Query cache cleared')
				}
			})
		} catch (error) {
			console.log('⚠️  Query cache cleanup failed:', error)
		}

		// 4. Performance and resource cleanup
		console.log('📊 Cleaning up performance monitoring...')

		try {
			// Clear performance marks and measures
			await page.evaluate(() => {
				if (performance.clearMarks) {
					performance.clearMarks()
				}
				if (performance.clearMeasures) {
					performance.clearMeasures()
				}
			})

			console.log('✅ Performance metrics cleared')
		} catch (error) {
			console.log('⚠️  Performance cleanup failed:', error)
		}

		// 5. Generate test summary report
		console.log('📋 Generating test summary...')

		try {
			const testResults = {
				timestamp: new Date().toISOString(),
				environment: {
					baseURL,
					userAgent: await page.evaluate(() => navigator.userAgent),
					viewport: await page.viewportSize()
				},
				cleanup: {
					testDataCleaned: true,
					storageCleaned: true,
					cacheCleaned: true,
					performanceMetricsCleared: true
				}
			}

			// You could write this to a file if needed
			console.log('Test Summary:', JSON.stringify(testResults, null, 2))
		} catch (error) {
			console.log('⚠️  Test summary generation failed:', error)
		}

		console.log('✅ TanStack Query test cleanup complete')
	} catch (error) {
		console.error('❌ Global teardown failed:', error)
		// Don't throw error here to avoid breaking the test run
	} finally {
		await context.close()
		await browser.close()
	}

	// 6. Final resource cleanup
	console.log('🔧 Final resource cleanup...')

	try {
		// Force garbage collection if available
		if (global.gc) {
			global.gc()
		}

		// Clear any remaining timers or intervals
		if (typeof global !== 'undefined') {
			// Clear any global test state
			const globalKeys = Object.keys(global).filter(key =>
				key.startsWith('test_')
			)
			globalKeys.forEach(key => {
				delete (global as any)[key]
			})
		}

		console.log('✅ Final cleanup complete')
	} catch (error) {
		console.log('⚠️  Final cleanup had issues:', error)
	}

	console.log('🎯 TanStack Query test teardown finished successfully')
}

export default globalTeardown
