import { expect, type Page } from "@playwright/test";

/**
 * UI element validation helper utilities for E2E testing
 */

/**
 * Verify a table renders on the page
 */
export async function verifyTableRenders(
	page: Page,
	tableRole: Parameters<Page["getByRole"]>[0] = "table",
): Promise<void> {
	await expect(page.getByRole(tableRole)).toBeVisible({
		timeout: 10000,
	});
}

/**
 * Verify table has minimum number of rows
 */
export async function verifyTableHasRows(
	page: Page,
	minRows: number = 1,
): Promise<void> {
	// Wait for table to load
	await page.waitForSelector('[role="row"]', {
		state: "visible",
		timeout: 10000,
	});

	const rows = await page.getByRole("row").count();
	expect(rows).toBeGreaterThanOrEqual(minRows);
}

/**
 * Verify a chart canvas element renders
 */
export async function verifyCanvasChartRenders(page: Page): Promise<void> {
	await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
}

/**
 * Verify SVG chart renders
 * Looks for chart-specific SVG elements (recharts, visx, etc) or falls back to first svg
 */
export async function verifySVGChartRenders(
	page: Page,
	chartLabel?: string,
): Promise<void> {
	if (chartLabel) {
		await expect(
			page.locator("svg").filter({ has: page.getByText(chartLabel) }),
		).toBeVisible({ timeout: 10000 });
	} else {
		// Look for chart container SVGs (recharts, visx) or any svg with chart-like attributes
		const chartSvg = page
			.locator(".recharts-surface")
			.or(page.locator("svg.recharts-surface"))
			.or(page.locator('[class*="chart"] svg'))
			.or(
				page.locator("svg[viewBox]").first(), // Fallback: first SVG with viewBox attribute
			);

		const count = await chartSvg.count();
		expect(count).toBeGreaterThan(0);
	}
}

/**
 * Verify a button or link exists and is visible
 * Handles both <button> elements and <a> elements (Button asChild pattern)
 */
export async function verifyButtonExists(
	page: Page,
	buttonName: string,
): Promise<void> {
	const button = page.getByRole("button", { name: buttonName });
	const link = page.getByRole("link", { name: buttonName });

	// Check if either button or link is visible
	const buttonVisible = (await button.count()) > 0;
	const linkVisible = (await link.count()) > 0;

	if (buttonVisible) {
		await expect(button).toBeVisible({ timeout: 10000 });
	} else if (linkVisible) {
		await expect(link).toBeVisible({ timeout: 10000 });
	} else {
		throw new Error(`Could not find button or link with name: ${buttonName}`);
	}
}

/**
 * Verify loading spinner is hidden (finished loading)
 * Uses toHaveCount(0) instead of not.toBeVisible() to handle multiple loading elements
 * Per Playwright best practices: https://playwright.dev/docs/locators#lists
 */
export async function verifyLoadingComplete(page: Page): Promise<void> {
	await expect(
		page
			.locator('[data-testid="loading"]')
			.or(page.locator('[aria-label*="loading"]'))
			.or(page.locator(".animate-spin")),
	).toHaveCount(0, { timeout: 15000 });
}

/**
 * Verify search input exists
 */
export async function verifySearchInputExists(page: Page): Promise<void> {
	await expect(
		page
			.getByRole("searchbox")
			.or(page.getByPlaceholder(/search/i))
			.or(page.locator('input[type="search"]')),
	).toBeVisible();
}
