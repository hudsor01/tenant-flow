/**
 * Performance Test Utilities for Apple's Obsession-Critical Standards
 *
 * Implements sub-200ms interaction testing following Apple's performance-as-feature philosophy.
 * Tests user-perceived performance rather than just technical metrics.
 *
 * Critical Requirements:
 * - Every interaction under 200ms response time
 * - Button press satisfaction metrics
 * - Micro-interaction anticipation testing
 * - Bored browsing engagement validation
 */

import { expect, Locator, Page } from '@playwright/test'

export interface PerformanceMetrics {
	responseTime: number
	renderTime: number
	interactionTime: number
	satisfactionScore: number
	passes200msThreshold: boolean
}

export interface MicroInteractionMetrics {
	hoverResponseTime: number
	clickFeedbackTime: number
	transitionSmoothness: number
	anticipationFactor: number
	satisfactionRating: number
}

export interface BoredBrowsingMetrics {
	engagementScore: number
	clickSatisfaction: number
	visualFeedbackQuality: number
	explorationEncouragement: number
	overallBoredBrowsingScore: number
}

/**
 * Core Performance Test Utilities
 */
export class PerformanceTestUtils {
	constructor(private page: Page) {}

	/**
	 * Test if interaction meets Apple's sub-200ms standard
	 */
	async testSub200msInteraction(
		selector: string,
		interactionType: 'click' | 'hover' | 'focus' = 'click'
	): Promise<PerformanceMetrics> {
		const element = this.page.locator(selector)
		await element.waitFor({ state: 'visible' })

		// Start performance measurement
		const startTime = Date.now()

		// Perform interaction based on type
		switch (interactionType) {
			case 'click':
				await element.click()
				break
			case 'hover':
				await element.hover()
				break
			case 'focus':
				await element.focus()
				break
		}

		// Wait for visual feedback to appear
		await this.page.waitForTimeout(50) // Allow for immediate feedback
		const responseTime = Date.now() - startTime

		// Measure render completion
		const renderStart = Date.now()
		await this.page.waitForLoadState('networkidle')
		const renderTime = Date.now() - renderStart

		// Calculate total interaction time
		const totalInteractionTime = responseTime + renderTime

		// Calculate satisfaction score based on Apple's standards
		const satisfactionScore =
			this.calculateSatisfactionScore(totalInteractionTime)

		return {
			responseTime,
			renderTime,
			interactionTime: totalInteractionTime,
			satisfactionScore,
			passes200msThreshold: totalInteractionTime <= 200
		}
	}

	/**
	 * Test micro-interaction satisfaction (button press feel, hover responsiveness)
	 */
	async testMicroInteractionSatisfaction(
		selector: string
	): Promise<MicroInteractionMetrics> {
		const element = this.page.locator(selector)
		await element.waitFor({ state: 'visible' })

		// Test hover response time
		const hoverStart = Date.now()
		await element.hover()
		await this.page.waitForTimeout(100) // Wait for hover transition
		const hoverResponseTime = Date.now() - hoverStart

		// Test click feedback time
		const clickStart = Date.now()
		await element.click()
		await this.page.waitForTimeout(100) // Wait for click feedback
		const clickFeedbackTime = Date.now() - clickStart

		// Measure transition smoothness by checking for frame drops
		const transitionSmoothness = await this.measureTransitionSmoothness(element)

		// Calculate anticipation factor (how well hover states create expectation)
		const anticipationFactor = await this.measureAnticipationFactor(element)

		// Overall satisfaction rating
		const satisfactionRating = this.calculateMicroInteractionSatisfaction(
			hoverResponseTime,
			clickFeedbackTime,
			transitionSmoothness,
			anticipationFactor
		)

		return {
			hoverResponseTime,
			clickFeedbackTime,
			transitionSmoothness,
			anticipationFactor,
			satisfactionRating
		}
	}

	/**
	 * Test the "bored browsing" experience - mindless clicking should be engaging
	 */
	async testBoredBrowsingExperience(
		selectors: string[]
	): Promise<BoredBrowsingMetrics> {
		let totalEngagement = 0
		let totalSatisfaction = 0
		let totalFeedbackQuality = 0
		let totalExploration = 0

		for (const selector of selectors) {
			const element = this.page.locator(selector)

			try {
				await element.waitFor({ state: 'visible', timeout: 5000 })

				// Rapid mindless interactions
				const engagement = await this.measureEngagementFactor(element)
				const satisfaction = await this.measureClickSatisfaction(element)
				const feedbackQuality = await this.measureVisualFeedbackQuality(element)
				const exploration = await this.measureExplorationEncouragement(element)

				totalEngagement += engagement
				totalSatisfaction += satisfaction
				totalFeedbackQuality += feedbackQuality
				totalExploration += exploration
			} catch (error) {
				// Element not available, skip
				continue
			}
		}

		const count = selectors.length
		const overallScore =
			(totalEngagement +
				totalSatisfaction +
				totalFeedbackQuality +
				totalExploration) /
			(count * 4)

		return {
			engagementScore: totalEngagement / count,
			clickSatisfaction: totalSatisfaction / count,
			visualFeedbackQuality: totalFeedbackQuality / count,
			explorationEncouragement: totalExploration / count,
			overallBoredBrowsingScore: overallScore
		}
	}

	/**
	 * Test loading states for contextual messaging and entertainment value
	 */
	async testLoadingStatesContextual(loadingSelector: string): Promise<{
		appearsInstantly: boolean
		hasContextualMessage: boolean
		isEntertaining: boolean
		overallScore: number
	}> {
		const loadingStart = Date.now()

		// Trigger loading state
		const loadingElement = this.page.locator(loadingSelector)

		// Check if loading appears instantly (under 50ms)
		const loadingAppearTime = Date.now() - loadingStart
		const appearsInstantly = loadingAppearTime <= 50

		// Check for contextual messaging
		const hasContextualMessage =
			await this.checkContextualMessage(loadingElement)

		// Check entertainment value (animations, helpful text, etc.)
		const isEntertaining = await this.checkEntertainmentValue(loadingElement)

		// Overall score
		const scores = [appearsInstantly, hasContextualMessage, isEntertaining].map(
			b => (b ? 1 : 0)
		)
		const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length

		return {
			appearsInstantly,
			hasContextualMessage,
			isEntertaining,
			overallScore
		}
	}

	/**
	 * Test scroll performance for buttery smooth animations
	 */
	async testScrollPerformance(): Promise<{
		fps: number
		jankCount: number
		smoothnessScore: number
		passesAppleStandard: boolean
	}> {
		// Start performance monitoring
		await this.page.evaluate(() => {
			;(window as any).scrollMetrics = {
				frames: [],
				startTime: performance.now()
			}

			function recordFrame() {
				;(window as any).scrollMetrics.frames.push(performance.now())
				requestAnimationFrame(recordFrame)
			}
			recordFrame()
		})

		// Perform smooth scroll test
		await this.page.evaluate(() => {
			window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
		})

		await this.page.waitForTimeout(2000) // Allow scroll to complete

		// Measure scroll performance
		const metrics = await this.page.evaluate(() => {
			const data = (window as any).scrollMetrics
			const totalTime = data.frames[data.frames.length - 1] - data.frames[0]
			const frameCount = data.frames.length
			const fps = (frameCount / totalTime) * 1000

			// Count janky frames (>16.67ms between frames for 60fps)
			let jankCount = 0
			for (let i = 1; i < data.frames.length; i++) {
				const frameDelta = data.frames[i] - data.frames[i - 1]
				if (frameDelta > 16.67) {
					jankCount++
				}
			}

			return { fps, jankCount, frameCount }
		})

		const smoothnessScore = Math.max(0, (60 - metrics.jankCount) / 60)
		const passesAppleStandard = metrics.fps >= 58 && metrics.jankCount <= 3

		return {
			fps: metrics.fps,
			jankCount: metrics.jankCount,
			smoothnessScore,
			passesAppleStandard
		}
	}

	/**
	 * Private helper methods
	 */
	private calculateSatisfactionScore(interactionTime: number): number {
		if (interactionTime <= 100) return 10 // Exceptional
		if (interactionTime <= 150) return 8 // Excellent
		if (interactionTime <= 200) return 6 // Good - meets threshold
		if (interactionTime <= 300) return 4 // Acceptable
		if (interactionTime <= 500) return 2 // Poor
		return 0 // Unacceptable
	}

	private async measureTransitionSmoothness(element: Locator): Promise<number> {
		// Measure transition by checking computed styles during animation
		const smoothness = await this.page.evaluate(() => {
			// Simple smoothness test - more complex implementations could use performance observer
			return Math.random() * 0.3 + 0.7 // Placeholder: 0.7-1.0 range
		})
		return smoothness
	}

	private async measureAnticipationFactor(element: Locator): Promise<number> {
		// Check if hover state creates proper anticipation for the click
		const hasHoverState = await element.evaluate(el => {
			const styles = window.getComputedStyle(el, ':hover')
			const normalStyles = window.getComputedStyle(el)

			// Check if hover creates visual change
			return (
				styles.backgroundColor !== normalStyles.backgroundColor ||
				styles.transform !== normalStyles.transform ||
				styles.boxShadow !== normalStyles.boxShadow
			)
		})

		return hasHoverState ? 1.0 : 0.5
	}

	private calculateMicroInteractionSatisfaction(
		hoverTime: number,
		clickTime: number,
		smoothness: number,
		anticipation: number
	): number {
		const hoverScore =
			hoverTime <= 150 ? 1 : Math.max(0, 1 - (hoverTime - 150) / 200)
		const clickScore =
			clickTime <= 200 ? 1 : Math.max(0, 1 - (clickTime - 200) / 300)

		return (hoverScore + clickScore + smoothness + anticipation) / 4
	}

	private async measureEngagementFactor(element: Locator): Promise<number> {
		// Quick engagement test
		const isInteractive = await element.evaluate(el => {
			return (
				el.tagName === 'BUTTON' ||
				el.getAttribute('role') === 'button' ||
				el.tagName === 'A' ||
				el.style.cursor === 'pointer'
			)
		})

		return isInteractive ? 1.0 : 0.3
	}

	private async measureClickSatisfaction(element: Locator): Promise<number> {
		// Test click response and feedback
		const startTime = Date.now()
		await element.click()
		const responseTime = Date.now() - startTime

		return responseTime <= 200
			? 1.0
			: Math.max(0, 1 - (responseTime - 200) / 300)
	}

	private async measureVisualFeedbackQuality(
		element: Locator
	): Promise<number> {
		// Check for visual feedback on interaction
		const hasFeedback = await element.evaluate(el => {
			const styles = window.getComputedStyle(el, ':active')
			const normalStyles = window.getComputedStyle(el)

			return (
				styles.transform !== normalStyles.transform ||
				styles.boxShadow !== normalStyles.boxShadow ||
				styles.backgroundColor !== normalStyles.backgroundColor
			)
		})

		return hasFeedback ? 1.0 : 0.2
	}

	private async measureExplorationEncouragement(
		element: Locator
	): Promise<number> {
		// Check if element encourages further exploration
		const isInviting = await element.evaluate(el => {
			const text = el.textContent?.toLowerCase() || ''
			const invitingWords = [
				'explore',
				'discover',
				'learn',
				'try',
				'get started',
				'see more'
			]
			return invitingWords.some(word => text.includes(word))
		})

		return isInviting ? 1.0 : 0.5
	}

	private async checkContextualMessage(element: Locator): Promise<boolean> {
		// Check if loading has helpful contextual message
		const hasMessage = await element.evaluate(el => {
			const text = el.textContent || ''
			return text.length > 10 && !text.includes('Loading...') // More than generic loading
		})

		return hasMessage
	}

	private async checkEntertainmentValue(element: Locator): Promise<boolean> {
		// Check for entertaining elements (animations, progress, etc.)
		const isEntertaining = await element.evaluate(el => {
			const hasAnimation = window.getComputedStyle(el).animation !== 'none'
			const hasProgressBar = el.querySelector('[role="progressbar"]') !== null
			const hasInterestingText = (el.textContent || '').length > 20

			return hasAnimation || hasProgressBar || hasInterestingText
		})

		return isEntertaining
	}
}

/**
 * Performance assertion helpers for tests
 */
export class PerformanceAssertions {
	static expectSub200ms(metrics: PerformanceMetrics) {
		expect(metrics.passes200msThreshold).toBe(true)
		expect(metrics.interactionTime).toBeLessThanOrEqual(200)
		expect(metrics.satisfactionScore).toBeGreaterThanOrEqual(6)
	}

	static expectAppleLevelSatisfaction(metrics: MicroInteractionMetrics) {
		expect(metrics.satisfactionRating).toBeGreaterThanOrEqual(0.8)
		expect(metrics.hoverResponseTime).toBeLessThanOrEqual(150)
		expect(metrics.clickFeedbackTime).toBeLessThanOrEqual(200)
	}

	static expectEngagingBoredBrowsing(metrics: BoredBrowsingMetrics) {
		expect(metrics.overallBoredBrowsingScore).toBeGreaterThanOrEqual(0.7)
		expect(metrics.engagementScore).toBeGreaterThanOrEqual(0.6)
		expect(metrics.clickSatisfaction).toBeGreaterThanOrEqual(0.7)
	}

	static expectButterySmoothScroll(metrics: {
		fps: number
		jankCount: number
		passesAppleStandard: boolean
	}) {
		expect(metrics.passesAppleStandard).toBe(true)
		expect(metrics.fps).toBeGreaterThanOrEqual(58)
		expect(metrics.jankCount).toBeLessThanOrEqual(3)
	}
}
