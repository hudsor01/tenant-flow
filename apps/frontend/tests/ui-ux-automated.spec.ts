/**
 * Automated UI/UX Testing for TenantFlow
 * Run this to get a complete UI/UX report with actionable fixes
 */

import { expect, test } from '@playwright/test'
import { logger } from '@repo/shared'
import {
	UIUXWorkflow,
	runCompleteUIUXWorkflow
} from '../playwright-ui-ux-workflow'

// Configure test timeout for thorough testing
test.setTimeout(60000)

test.describe('🎨 Complete UI/UX Validation', () => {
	test('Run complete UI/UX workflow and generate report', async ({ page }) => {
		logger.info('🚀 Starting comprehensive UI/UX testing...\n')

		// Run the complete workflow
		const { results, report } = await runCompleteUIUXWorkflow(page)

		// Assert no critical issues
		expect(results.criticalIssues).toBe(0)

		// Log summary for immediate feedback
		logger.info({ pages: results.pages }, 'UI/UX test results')

		// Display top issues to fix
		if (report.issues.length > 0) {
			logger.info('\n🔧 Top Issues to Fix:')
			report.issues.slice(0, 5).forEach(issue => {
				logger.info(
					`  ${issue.severity === 'critical' ? '🚨' : '⚠️'} ${issue.issue}`
				)
				logger.info(`     → ${issue.suggestion}\n`)
			})
		} else {
			logger.info('\n✅ No UI/UX issues found! The frontend is perfect! 🎉')
		}
	})
})

test.describe('🎯 Focused Page Tests', () => {
	test('Landing page visual perfection', async ({ page }) => {
		const workflow = new UIUXWorkflow(page)

		await page.goto('http://localhost:3005')
		const issues = await workflow.checkVisualPerfection('Landing')

		// Landing page should be perfect (no issues)
		expect(issues.filter(i => i.severity === 'critical')).toHaveLength(0)

		// Check Magic UI components are working
		const magicUI = await workflow.validateMagicUI()
		expect(magicUI.issues).toHaveLength(0)
		expect(
			magicUI.shimmerButtons + magicUI.borderBeams + magicUI.gradientTexts
		).toBeGreaterThan(0)
	})

	test('Responsive design across all breakpoints', async ({ page }) => {
		const workflow = new UIUXWorkflow(page)

		await page.goto('http://localhost:3005')
		const results = await workflow.validateResponsiveDesign()

		// No horizontal scroll on any breakpoint
		results.forEach(result => {
			expect(
				result.issues.filter(i => i.includes('Horizontal scroll'))
			).toHaveLength(0)
		})

		// Mobile should have no touch target issues
		const mobile = results.find(r => r.breakpoint === 'mobile')
		expect(mobile?.issues.filter(i => i.includes('too small'))).toHaveLength(0)
	})

	test('All animations run at 60fps', async ({ page }) => {
		const workflow = new UIUXWorkflow(page)

		await page.goto('http://localhost:3005')
		const animations = await workflow.testAnimationSmoothness()

		// All animations should be smooth (>55fps)
		animations.forEach(anim => {
			expect(anim.smooth).toBe(true)
			expect(anim.fps).toBeGreaterThan(55)
		})
	})

	test('Micro-interactions are present', async ({ page }) => {
		const workflow = new UIUXWorkflow(page)

		await page.goto('http://localhost:3005')
		const interactions = await workflow.validateMicroInteractions()

		// All buttons should have hover states
		const buttonsWithoutHover = interactions.filter(
			i => i.element.startsWith('Button') && !i.hasHoverState
		)
		expect(buttonsWithoutHover).toHaveLength(0)

		// All buttons should have cursor pointer
		const buttonsWithoutPointer = interactions.filter(
			i => i.element.startsWith('Button') && !i.hasCursorPointer
		)
		expect(buttonsWithoutPointer).toHaveLength(0)
	})

	test('Loading performance meets targets', async ({ page }) => {
		const workflow = new UIUXWorkflow(page)

		await page.goto('http://localhost:3005')
		const metrics = await workflow.analyzeLoadingPerformance()

		// Performance targets
		expect(metrics.firstContentfulPaint).toBeLessThan(1500) // FCP < 1.5s
		expect(metrics.timeToInteractive).toBeLessThan(3000) // TTI < 3s
		expect(metrics.loadComplete).toBeLessThan(5000) // Full load < 5s
	})
})

test.describe('🔄 User Flow Tests', () => {
	test('Signup flow is seamless', async ({ page }) => {
		const workflow = new UIUXWorkflow(page)

		const signupFlow = await workflow.testUserFlow('Signup', [
			async () => await page.goto('http://localhost:3005'),
			async () => await page.click('text="Get Started"'),
			async () => await page.fill('[name="email"]', 'test@example.com'),
			async () => await page.fill('[name="password"]', 'Test123!'),
			async () => await page.click('[type="submit"]')
		])

		// No errors in flow
		expect(signupFlow.issues).toHaveLength(0)

		// Flow completes quickly
		expect(signupFlow.totalTime).toBeLessThan(10000) // < 10 seconds
	})

	test('Navigation is intuitive', async ({ page }) => {
		const workflow = new UIUXWorkflow(page)

		const navFlow = await workflow.testUserFlow('Navigation', [
			async () => await page.goto('http://localhost:3005'),
			async () => await page.click('text="Pricing"'),
			async () => await page.click('text="Features"'),
			async () => await page.click('text="Contact"')
		])

		// All navigation works
		expect(navFlow.issues).toHaveLength(0)

		// Each step is fast
		navFlow.steps.forEach(step => {
			expect(step.duration).toBeLessThan(2000) // Each nav < 2s
		})
	})
})

test.describe('📸 Visual Regression', () => {
	test('Capture baseline screenshots', async ({ page }) => {
		const pages = [
			{ url: 'http://localhost:3005', name: 'landing' },
			{ url: 'http://localhost:3005/pricing', name: 'pricing' },
			{ url: 'http://localhost:3005/auth/login', name: 'login' }
		]

		for (const pageInfo of pages) {
			await page.goto(pageInfo.url)

			// Disable animations for consistent screenshots
			await page.addStyleTag({
				content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            transition-duration: 0s !important;
          }
        `
			})

			await page.screenshot({
				path: `.playwright-mcp/baseline-${pageInfo.name}.png`,
				fullPage: true
			})
		}

		logger.info('📸 Baseline screenshots captured')
	})
})

// Quick smoke test for CI/CD
test.describe('🚀 Quick Smoke Test', () => {
	test.skip(process.env.CI !== 'true', 'Only run in CI')

	test('Core pages load without errors', async ({ page }) => {
		const pages = [
			'http://localhost:3005',
			'http://localhost:3005/pricing',
			'http://localhost:3005/auth/login'
		]

		for (const url of pages) {
			await page.goto(url)

			// No console errors
			const errors: string[] = []
			page.on('console', msg => {
				if (msg.type() === 'error') {
					errors.push(msg.text())
				}
			})

			await page.waitForTimeout(1000)
			expect(errors).toHaveLength(0)
		}
	})
})
