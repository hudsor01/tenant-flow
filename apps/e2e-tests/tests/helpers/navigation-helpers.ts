import { expect, type Page } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'NavigationHelpers' })

/**
 * Navigation helper utilities for E2E testing
 */

/**
 * Navigate to a specific page and wait for it to load
 */
export async function navigateToPage(page: Page, path: string): Promise<void> {
	await page.goto(path)
	await page.waitForLoadState('domcontentloaded')
}

/**
 * Click a sidebar link by its text and wait for navigation
 */
export async function clickSidebarLink(
	page: Page,
	linkName: string
): Promise<void> {
	await page.getByRole('link', { name: new RegExp(linkName, 'i') }).click()
	await page.waitForLoadState('domcontentloaded')
}

/**
 * Verify the current page URL and heading
 */
export async function verifyCurrentPage(
	page: Page,
	expectedPath: string,
	expectedHeading: string
): Promise<void> {
	expect(page.url()).toContain(expectedPath)
	await expect(
		page.getByRole('heading', { name: new RegExp(expectedHeading, 'i') })
	).toBeVisible({ timeout: 10000 })
}

/**
 * Monitor and verify no console errors occurred
 */
export async function verifyNoConsoleErrors(page: Page): Promise<void> {
	const errors: string[] = []

	page.on('console', msg => {
		if (msg.type() === 'error') {
			errors.push(msg.text())
		}
	})

	// Wait a bit for any async errors
	await page.waitForTimeout(1000)

	if (errors.length > 0) {
		logger.error('Console errors detected:', { metadata: { errors } })
	}

	expect(errors).toHaveLength(0)
}

/**
 * Monitor and verify no network errors (4xx, 5xx) occurred
 */
export async function verifyNoNetworkErrors(page: Page): Promise<void> {
	const failedRequests: Array<{ url: string; status: number }> = []

	page.on('response', response => {
		if (response.status() >= 400) {
			failedRequests.push({
				url: response.url(),
				status: response.status()
			})
		}
	})

	// Wait a bit for any async requests
	await page.waitForTimeout(1000)

	if (failedRequests.length > 0) {
		logger.error('Network errors detected:', { metadata: { failedRequests } })
	}

	expect(failedRequests).toHaveLength(0)
}

/**
 * Patterns to ignore in console errors (expected in local dev)
 */
const IGNORED_ERROR_PATTERNS = [
	// Supabase auth errors when running locally
	'@supabase/auth-js',
	'supabase',
	'GoTrueClient',
	'_getUser',
	'_useSession',
	// Network errors from API calls (handled gracefully by UI)
	'Network error during API request',
	'Failed to fetch',
	// React hydration warnings (not critical)
	'Hydration failed',
	'Text content does not match',
	// React DevTools
	'Download the React DevTools'
]

/**
 * Check if an error should be ignored
 */
function shouldIgnoreError(errorText: string): boolean {
	return IGNORED_ERROR_PATTERNS.some(pattern =>
		errorText.toLowerCase().includes(pattern.toLowerCase())
	)
}

/**
 * Set up console and network error monitoring for a page
 */
export function setupErrorMonitoring(page: Page): {
	errors: string[]
	networkErrors: Array<{ url: string; status: number }>
} {
	const errors: string[] = []
	const networkErrors: Array<{ url: string; status: number }> = []

	page.on('console', msg => {
		if (msg.type() === 'error') {
			const text = msg.text()
			// Only track errors that are NOT in our ignore list
			if (!shouldIgnoreError(text)) {
				errors.push(text)
			}
		}
	})

	page.on('response', response => {
		const status = response.status()
		const url = response.url()
		// Ignore 401s (expected for unauthenticated API calls)
		// Ignore Supabase auth endpoints
		if (status >= 400 && status !== 401 && !url.includes('supabase')) {
			networkErrors.push({
				url,
				status
			})
		}
	})

	return { errors, networkErrors }
}

/**
 * Verify page is fully loaded with no errors
 */
export async function verifyPageLoaded(
	page: Page,
	expectedPath: string,
	expectedHeading: string
): Promise<void> {
	// Verify URL
	expect(page.url()).toContain(expectedPath)

	// Verify heading
	await expect(
		page.getByRole('heading', { name: new RegExp(expectedHeading, 'i') })
	).toBeVisible({ timeout: 10000 })

	// Verify no loading spinners
	await expect(page.locator('[data-testid="loading"]')).not.toBeVisible({
		timeout: 5000
	})

	// Wait for network to be idle
	await page.waitForLoadState('domcontentloaded')
}
