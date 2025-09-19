import { test } from '@playwright/test'

test.describe('Console Error Capture', () => {
	let consoleMessages: Array<{ type: string; text: string; url: string }> = []

	test.beforeEach(async ({ page }) => {
		// Clear console messages for each test
		consoleMessages = []

		// Listen to console messages
		page.on('console', msg => {
			consoleMessages.push({
				type: msg.type(),
				text: msg.text(),
				url: page.url()
			})
		})

		// Listen to page errors
		page.on('pageerror', error => {
			consoleMessages.push({
				type: 'pageerror',
				text: error.message,
				url: page.url()
			})
		})

		// Listen to request failures for more detailed error info
		page.on('requestfailed', request => {
			const failure = request.failure()
			consoleMessages.push({
				type: 'requestfailed',
				text: `Failed to load ${request.url()}: ${failure?.errorText || 'Unknown error'}`,
				url: page.url()
			})
		})
	})

	test('Capture console errors on localhost:3005 (landing page)', async ({
		page
	}) => {
		await page.goto('http://localhost:3005')
		await page.waitForLoadState('networkidle')

		// Wait a bit more to catch any delayed console messages
		await page.waitForTimeout(2000)

		// Filter only error and warning messages
		const errors = consoleMessages.filter(
			msg =>
				msg.type === 'error' ||
				msg.type === 'warning' ||
				msg.type === 'pageerror' ||
				msg.type === 'requestfailed'
		)

		console.log('\n=== localhost:3005 CONSOLE MESSAGES ===')
		console.log(`Total messages: ${consoleMessages.length}`)
		console.log(`Errors/Warnings: ${errors.length}`)

		if (errors.length > 0) {
			console.log('\nERRORS AND WARNINGS:')
			errors.forEach((msg, index) => {
				console.log(`${index + 1}. [${msg.type.toUpperCase()}] ${msg.text}`)
			})
		} else {
			console.log('✅ No console errors or warnings found on landing page')
		}

		// Also log all messages for reference
		if (consoleMessages.length > 0) {
			console.log('\nALL CONSOLE MESSAGES:')
			consoleMessages.forEach((msg, index) => {
				console.log(`${index + 1}. [${msg.type}] ${msg.text}`)
			})
		}

		// Take a screenshot for reference
		await page.screenshot({
			path: 'console-error-capture-landing.png',
			fullPage: true
		})
	})

	test('Capture console errors on localhost:3005/dashboard', async ({
		page
	}) => {
		await page.goto('http://localhost:3005/dashboard')
		await page.waitForLoadState('networkidle')

		// Wait a bit more to catch any delayed console messages
		await page.waitForTimeout(2000)

		// Filter only error and warning messages
		const errors = consoleMessages.filter(
			msg =>
				msg.type === 'error' ||
				msg.type === 'warning' ||
				msg.type === 'pageerror' ||
				msg.type === 'requestfailed'
		)

		console.log('\n=== localhost:3005/DASHBOARD CONSOLE MESSAGES ===')
		console.log(`Total messages: ${consoleMessages.length}`)
		console.log(`Errors/Warnings: ${errors.length}`)

		if (errors.length > 0) {
			console.log('\nERRORS AND WARNINGS:')
			errors.forEach((msg, index) => {
				console.log(`${index + 1}. [${msg.type.toUpperCase()}] ${msg.text}`)
			})
		} else {
			console.log('✅ No console errors or warnings found on dashboard page')
		}

		// Also log all messages for reference
		if (consoleMessages.length > 0) {
			console.log('\nALL CONSOLE MESSAGES:')
			consoleMessages.forEach((msg, index) => {
				console.log(`${index + 1}. [${msg.type}] ${msg.text}`)
			})
		}

		// Take a screenshot for reference
		await page.screenshot({
			path: 'console-error-capture-dashboard.png',
			fullPage: true
		})
	})
})
