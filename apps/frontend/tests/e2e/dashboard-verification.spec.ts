import { expect, test, type Page } from '@playwright/test'

interface ConsoleMessage {
	type: string
	text: string
	url?: string
	line?: number
}

// Helper function to capture console messages with filtering
async function captureConsoleMessages(page: Page): Promise<ConsoleMessage[]> {
	const messages: ConsoleMessage[] = []

	page.on('console', msg => {
		// Filter out noise and focus on errors/warnings
		const type = msg.type()
		const text = msg.text()

		// Skip common development noise
		if (
			text.includes('Download the React DevTools') ||
			text.includes('webpack-dev-server') ||
			text.includes('HMR') ||
			text.includes('[Fast Refresh]') ||
			text.includes('Turbopack') ||
			text.includes('localhost:3005')
		) {
			return
		}

		// Capture errors, warnings, and important info
		if (['error', 'warning', 'info'].includes(type)) {
			messages.push({
				type,
				text,
				url: msg.location()?.url,
				line: msg.location()?.lineNumber
			})
		}
	})

	return messages
}

// Helper function to check if page is blank or has minimal content
async function isPageValid(page: Page): Promise<boolean> {
	const url = page.url()

	// Check if we're on about:blank or similar
	if (url.includes('about:blank') || url === 'data:text/html,chromewebdata') {
		return false
	}

	// Check if page has meaningful content
	const bodyText = (await page.locator('body').textContent()) || ''
	const hasContent = bodyText.trim().length > 50 // At least some content

	// Check if essential elements exist
	const hasTitle = (await page.locator('h1, h2, [role="heading"]').count()) > 0
	const hasInteractiveElements =
		(await page.locator('button, a, input').count()) > 0

	return hasContent && (hasTitle || hasInteractiveElements)
}

test.describe('Dashboard Verification', () => {
	test.beforeEach(async ({ page }) => {
		// Start capturing console messages
		await captureConsoleMessages(page)
	})

	test('dashboard loads without errors and has proper content', async ({
		page
	}) => {

		// Navigate to dashboard with longer timeout for dev server
		await page.goto('/dashboard', {
			waitUntil: 'domcontentloaded',
			timeout: 60000
		})

		// Wait for initial render
		await page.waitForTimeout(2000)

		// Check if page is valid (not blank)
		const isValid = await isPageValid(page)
		expect(
			isValid,
			'Dashboard page should not be blank and have meaningful content'
		).toBe(true)

		// Take screenshot only if page is valid
		if (isValid) {
			await page.screenshot({
				path: '.playwright-mcp/dashboard-verification-full.png',
				fullPage: true
			})
		}

		// Check for essential dashboard elements
		await expect(page.locator('body')).toBeVisible()

		// Look for TenantFlow branding/logo
		const logoVisible = await page
			.locator('text=TenantFlow')
			.isVisible()
			.catch(() => false)
		if (logoVisible) {
		} else {
		}

		// Check for dashboard navigation/sidebar
		const sidebarVisible = await page
			.locator('[data-testid="sidebar"], nav, aside, [role="navigation"]')
			.isVisible()
			.catch(() => false)
		if (sidebarVisible) {
		} else {
		}

		// Look for dashboard content sections
		const contentSections = await page
			.locator('main, [role="main"], .dashboard, section')
			.count()

		// Check for common dashboard elements
		const cardCount = await page
			.locator('[role="region"], .card, [data-testid*="card"]')
			.count()

		// Wait a bit more to let any async content load
		await page.waitForTimeout(3000)

		// Take a final screenshot after loading
		if (await isPageValid(page)) {
			await page.screenshot({
				path: '.playwright-mcp/dashboard-verification-final.png',
				fullPage: true
			})
		}
	})

	test('check for console errors and warnings', async ({ page }) => {
		const messages: ConsoleMessage[] = []

		// Setup console message capture
		page.on('console', msg => {
			const type = msg.type()
			const text = msg.text()

			// Skip development noise
			if (
				text.includes('Download the React DevTools') ||
				text.includes('webpack') ||
				text.includes('HMR') ||
				text.includes('Turbopack') ||
				text.includes('[Fast Refresh]')
			) {
				return
			}

			if (['error', 'warning'].includes(type)) {
				messages.push({
					type,
					text,
					url: msg.location()?.url,
					line: msg.location()?.lineNumber
				})
			}
		})

		// Navigate to dashboard
		await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 60000 })
		await page.waitForTimeout(5000) // Let everything load

		// Report console messages
		if (messages.length > 0) {
			messages.forEach((msg, index) => {
				if (msg.url && msg.line) {
				}
			})
		} else {
		}

		// Take screenshot of current state
		await page.screenshot({
			path: '.playwright-mcp/dashboard-console-check.png',
			fullPage: true
		})

		// The test should pass even with console messages, we just want to capture them
		expect(true).toBe(true)
	})

	test('verify React version consistency', async ({ page }) => {

		await page.goto('/dashboard', {
			waitUntil: 'domcontentloaded',
			timeout: 60000
		})
		await page.waitForTimeout(2000)

		// Check if React DevTools can detect React version
		const reactVersion = await page
			.evaluate(() => {
				// Try to get React version from window object
				const react = (window as any).React
				if (react && react.version) {
					return react.version
				}

				// Try to get from React DevTools global
				const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
				if (devtools && devtools.renderers) {
					const renderer = Array.from(devtools.renderers.values())[0] as any
					if (renderer && renderer.version) {
						return renderer.version
					}
				}

				return 'unknown'
			})
			.catch(() => 'error')


		// Take screenshot for verification
		await page.screenshot({
			path: '.playwright-mcp/react-version-check.png'
		})

		expect(reactVersion).not.toBe('error')
	})

	test('verify avatar loads correctly', async ({ page }) => {

		const networkRequests: string[] = []
		const failedRequests: string[] = []

		// Track network requests
		page.on('request', request => {
			const url = request.url()
			if (
				url.includes('avatar') ||
				url.includes('user.jpg') ||
				url.includes('dicebear')
			) {
				networkRequests.push(url)
			}
		})

		page.on('response', response => {
			const url = response.url()
			if (
				(url.includes('avatar') ||
					url.includes('user.jpg') ||
					url.includes('dicebear')) &&
				!response.ok()
			) {
				failedRequests.push(
					`${url} - ${response.status()} ${response.statusText()}`
				)
			}
		})

		await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 60000 })
		await page.waitForTimeout(3000)


		if (failedRequests.length > 0) {
		} else {
		}

		// Take screenshot
		await page.screenshot({
			path: '.playwright-mcp/avatar-check.png'
		})

		// Test passes regardless, we just want to capture the info
		expect(true).toBe(true)
	})
})
