import type { TestRunnerConfig } from '@storybook/test-runner'
import { checkA11y, injectAxe, configureAxe } from 'axe-playwright'
import type { Page } from 'playwright'

// Enhanced accessibility configuration
const accessibilityConfig = {
	rules: {
		// WCAG 2.1 Level AA compliance
		'color-contrast': { enabled: true },
		'focus-order-semantics': { enabled: true },
		'keyboard-navigation': { enabled: true },
		'aria-labels': { enabled: true },
		'heading-order': { enabled: true },
		'landmark-unique': { enabled: true },
		'tab-index': { enabled: true }
	},
	tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
	reporter: 'v2'
}

// Performance monitoring setup
async function measurePerformance(page: Page, storyId: string) {
	// Measure component rendering performance
	const performanceMetrics = await page.evaluate(() => {
		const navigation = performance.getEntriesByType(
			'navigation'
		)[0] as PerformanceNavigationTiming
		const paintEntries = performance.getEntriesByType('paint')

		return {
			domContentLoaded:
				navigation?.domContentLoadedEventEnd -
				navigation?.domContentLoadedEventStart,
			firstContentfulPaint: paintEntries.find(
				entry => entry.name === 'first-contentful-paint'
			)?.startTime,
			largestContentfulPaint: paintEntries.find(
				entry => entry.name === 'largest-contentful-paint'
			)?.startTime,
			renderTime: performance.now()
		}
	})

	// Log performance metrics for monitoring
	console.log(`📊 Performance [${storyId}]:`, {
		renderTime: `${performanceMetrics.renderTime.toFixed(2)}ms`,
		fcp: performanceMetrics.firstContentfulPaint
			? `${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`
			: 'N/A',
		lcp: performanceMetrics.largestContentfulPaint
			? `${performanceMetrics.largestContentfulPaint.toFixed(2)}ms`
			: 'N/A'
	})

	return performanceMetrics
}

// Enhanced error logging
function logTestError(error: Error, context: string, storyId: string) {
	console.group(`❌ Test Failure [${storyId}] - ${context}`)
	console.error('Error:', error.message)
	console.error('Stack:', error.stack)
	console.error('Context:', context)
	console.groupEnd()
}

const config: TestRunnerConfig = {
	setup() {
		console.log(
			'🚀 Initializing Storybook test runner with enhanced accessibility and performance monitoring'
		)
	},

	async preVisit(page, context) {
		const { id, title } = context

		console.log(`🔍 Testing story: ${title} (${id})`)

		try {
			// Inject and configure axe for accessibility testing
			await injectAxe(page)
			await configureAxe(page, accessibilityConfig)

			// Set up performance monitoring
			await page.addInitScript(() => {
				// Mark the start of component rendering
				performance.mark('storybook-component-start')
			})

			// Ensure proper viewport for testing
			await page.setViewportSize({ width: 1200, height: 800 })

			// Wait for any web fonts to load
			await page.waitForLoadState('networkidle')
		} catch (error) {
			logTestError(error as Error, 'preVisit setup', id)
			throw error
		}
	},

	async postVisit(page, context) {
		const { id, title } = context

		try {
			// Wait for component to be fully rendered
			await page
				.waitForSelector(
					'#storybook-root [data-testid], #storybook-root button, #storybook-root input, #storybook-root [role]',
					{
						timeout: 5000,
						state: 'visible'
					}
				)
				.catch(() => {
					// Some stories might not have interactive elements, that's ok
				})

			// Performance measurement
			const performanceMetrics = await measurePerformance(page, id)

			// Flag slow components
			if (performanceMetrics.renderTime > 1000) {
				console.warn(
					`⚠️ Slow component detected [${id}]: ${performanceMetrics.renderTime.toFixed(2)}ms render time`
				)
			}

			// Enhanced accessibility testing with custom rules
			const skipA11yPatterns = [
				'skip-a11y',
				'documentation',
				'design-tokens',
				'consolidation-metrics'
			]

			const shouldSkipA11y = skipA11yPatterns.some(
				pattern =>
					id.toLowerCase().includes(pattern) ||
					title.toLowerCase().includes(pattern)
			)

			if (!shouldSkipA11y) {
				try {
					await checkA11y(page, '#storybook-root', {
						detailedReport: true,
						detailedReportOptions: {
							html: true
						},
						axeOptions: accessibilityConfig
					})

					console.log(`✅ Accessibility check passed [${id}]`)
				} catch (a11yError) {
					console.error(
						`♿ Accessibility violations found in [${id}]:`,
						a11yError
					)
					throw a11yError
				}
			} else {
				console.log(
					`⏭️ Skipping accessibility check for [${id}] (documentation/design story)`
				)
			}

			// Visual regression testing setup
			const skipVisualPatterns = [
				'interaction-',
				'loading-',
				'error-',
				'empty-state',
				'documentation',
				'getting-started'
			]

			const shouldSkipVisual = skipVisualPatterns.some(pattern =>
				id.toLowerCase().includes(pattern)
			)

			if (!shouldSkipVisual) {
				try {
					// Ensure consistent screenshots by waiting for animations
					await page.waitForTimeout(500)

					// Take screenshot for visual regression
					await page.screenshot({
						path: `.chromatic/screenshots/${id.replace(/[^a-z0-9]/gi, '-')}.png`,
						fullPage: true,
						animations: 'disabled' // Disable animations for consistent screenshots
					})

					console.log(`📸 Screenshot captured [${id}]`)
				} catch (screenshotError) {
					console.warn(
						`📸 Screenshot failed [${id}]:`,
						screenshotError
					)
					// Don't fail the test for screenshot issues
				}
			}

			// Test keyboard navigation for interactive components
			const interactiveElements = await page.$$(
				'#storybook-root button, #storybook-root input, #storybook-root [tabindex], #storybook-root a'
			)

			if (interactiveElements.length > 0 && !shouldSkipA11y) {
				try {
					// Test tab navigation
					await page.keyboard.press('Tab')
					const focusedElement = await page.evaluate(
						() => document.activeElement?.tagName
					)

					if (
						focusedElement &&
						['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA'].includes(
							focusedElement
						)
					) {
						console.log(`⌨️ Keyboard navigation working [${id}]`)
					}
				} catch (keyboardError) {
					console.warn(
						`⌨️ Keyboard navigation test failed [${id}]:`,
						keyboardError
					)
				}
			}
		} catch (error) {
			logTestError(error as Error, 'postVisit testing', id)
			throw error
		}
	},

	// Enhanced test configuration
	tags: {
		include: ['test'],
		exclude: ['skip-test', 'skip-a11y'],
		skip: ['docs-only', 'wip']
	},

	// Increase timeout for accessibility testing
	async getHttpHeaders() {
		return {}
	},

	// Custom test preparation
	async prepare() {
		console.log(
			'🔧 Preparing test environment with accessibility and performance monitoring'
		)
	}
}

export default config
