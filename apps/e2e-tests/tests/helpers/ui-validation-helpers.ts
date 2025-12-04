import { expect, type Page } from '@playwright/test'

/**
 * UI element validation helper utilities for E2E testing
 */

/**
 * Verify a table renders on the page
 */
export async function verifyTableRenders(page: Page, tableRole: string = 'table'): Promise<void> {
  await expect(page.getByRole(tableRole)).toBeVisible({ timeout: 10000 })
}

/**
 * Verify table has minimum number of rows
 */
export async function verifyTableHasRows(page: Page, minRows: number = 1): Promise<void> {
  // Wait for table to load
  await page.waitForSelector('[role="row"]', { state: 'visible', timeout: 10000 })

  const rows = await page.getByRole('row').count()
  expect(rows).toBeGreaterThanOrEqual(minRows)
}

/**
 * Verify table has specific column headers
 */
export async function verifyTableHeaders(page: Page, headers: string[]): Promise<void> {
  for (const header of headers) {
    await expect(page.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeVisible()
  }
}

/**
 * Verify table row contains specific text
 */
export async function verifyTableRowContains(page: Page, text: string): Promise<void> {
  await expect(page.getByRole('row').filter({ hasText: new RegExp(text, 'i') })).toBeVisible()
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  // Wait for table to load
  await page.waitForSelector('[role="row"]', { state: 'visible', timeout: 10000 })

  // Subtract 1 for header row
  const rowCount = await page.getByRole('row').count()
  return Math.max(0, rowCount - 1)
}

/**
 * Verify a chart/graph renders using a CSS selector
 */
export async function verifyChartRenders(page: Page, chartSelector: string): Promise<void> {
  await expect(page.locator(chartSelector)).toBeVisible({ timeout: 10000 })
}

/**
 * Verify a chart canvas element renders
 */
export async function verifyCanvasChartRenders(page: Page): Promise<void> {
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 })
}

/**
 * Verify SVG chart renders
 * Looks for chart-specific SVG elements (recharts, visx, etc) or falls back to first svg
 */
export async function verifySVGChartRenders(page: Page, chartLabel?: string): Promise<void> {
  if (chartLabel) {
    await expect(
      page.locator('svg').filter({ has: page.getByText(new RegExp(chartLabel, 'i')) })
    ).toBeVisible({ timeout: 10000 })
  } else {
    // Look for chart container SVGs (recharts, visx) or any svg with chart-like attributes
    const chartSvg = page.locator('.recharts-surface').or(
      page.locator('svg.recharts-surface')
    ).or(
      page.locator('[class*="chart"] svg')
    ).or(
      page.locator('svg[viewBox]').first() // Fallback: first SVG with viewBox attribute
    )

    const count = await chartSvg.count()
    expect(count).toBeGreaterThan(0)
  }
}

/**
 * Verify a card component renders with specific text
 */
export async function verifyCardRenders(page: Page, cardText: string): Promise<void> {
  // Look for card by text content
  await expect(page.locator('[role="region"]').filter({ hasText: new RegExp(cardText, 'i') }).or(
    page.locator('.card').filter({ hasText: new RegExp(cardText, 'i') })
  ).or(
    page.getByText(new RegExp(cardText, 'i'))
  )).toBeVisible({ timeout: 10000 })
}

/**
 * Verify a stat card with label and value
 */
export async function verifyStatCard(page: Page, label: string, value?: string): Promise<void> {
  const cardLocator = page.locator('[data-testid*="stat-card"]').or(
    page.locator('.stat-card')
  ).or(
    page.locator('[role="region"]')
  )

  // Verify label
  await expect(cardLocator.filter({ hasText: new RegExp(label, 'i') })).toBeVisible()

  // Verify value if provided
  if (value) {
    await expect(cardLocator.filter({ hasText: new RegExp(value, 'i') })).toBeVisible()
  }
}

/**
 * Verify a button or link exists and is visible
 * Handles both <button> elements and <a> elements (Button asChild pattern)
 */
export async function verifyButtonExists(page: Page, buttonName: string): Promise<void> {
  const button = page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  const link = page.getByRole('link', { name: new RegExp(buttonName, 'i') })
  
  // Check if either button or link is visible
  const buttonVisible = await button.count() > 0
  const linkVisible = await link.count() > 0
  
  if (buttonVisible) {
    await expect(button).toBeVisible({ timeout: 10000 })
  } else if (linkVisible) {
    await expect(link).toBeVisible({ timeout: 10000 })
  } else {
    throw new Error(`Could not find button or link with name: ${buttonName}`)
  }
}

/**
 * Verify a link exists and is visible
 */
export async function verifyLinkExists(page: Page, linkName: string): Promise<void> {
  await expect(page.getByRole('link', { name: new RegExp(linkName, 'i') })).toBeVisible({
    timeout: 10000,
  })
}

/**
 * Verify an icon is visible (by test-id or aria-label)
 */
export async function verifyIconVisible(page: Page, iconName: string): Promise<void> {
  await expect(
    page.locator(`[data-testid="${iconName}-icon"]`).or(
      page.locator(`[aria-label*="${iconName}"]`)
    )
  ).toBeVisible()
}

/**
 * Take a full-page screenshot
 */
export async function takePageScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
}

/**
 * Take a screenshot of a specific element
 */
export async function takeElementScreenshot(
  page: Page,
  selector: string,
  name: string
): Promise<void> {
  const element = page.locator(selector)
  await element.screenshot({ path: `screenshots/${name}.png` })
}

/**
 * Verify empty state message is displayed
 */
export async function verifyEmptyState(page: Page, message: string): Promise<void> {
  await expect(page.getByText(new RegExp(message, 'i'))).toBeVisible({ timeout: 10000 })
}

/**
 * Verify loading spinner is visible
 */
export async function verifyLoadingSpinner(page: Page): Promise<void> {
  await expect(
    page.locator('[data-testid="loading"]').or(
      page.locator('[aria-label*="loading"]')
    ).or(
      page.locator('.animate-spin')
    )
  ).toBeVisible({ timeout: 5000 })
}

/**
 * Verify loading spinner is hidden (finished loading)
 * Uses toHaveCount(0) instead of not.toBeVisible() to handle multiple loading elements
 * Per Playwright best practices: https://playwright.dev/docs/locators#lists
 */
export async function verifyLoadingComplete(page: Page): Promise<void> {
  await expect(
    page.locator('[data-testid="loading"]').or(
      page.locator('[aria-label*="loading"]')
    ).or(
      page.locator('.animate-spin')
    )
  ).toHaveCount(0, { timeout: 15000 })
}

/**
 * Verify badge or tag exists with specific text
 */
export async function verifyBadge(page: Page, badgeText: string): Promise<void> {
  await expect(
    page.locator('[data-testid*="badge"]').filter({ hasText: new RegExp(badgeText, 'i') }).or(
      page.locator('.badge').filter({ hasText: new RegExp(badgeText, 'i') })
    ).or(
      page.getByRole('status').filter({ hasText: new RegExp(badgeText, 'i') })
    )
  ).toBeVisible()
}

/**
 * Verify pagination controls exist
 */
export async function verifyPaginationExists(page: Page): Promise<void> {
  await expect(
    page.locator('[role="navigation"][aria-label*="pagination"]').or(
      page.locator('[data-testid="pagination"]')
    ).or(
      page.getByRole('button', { name: /next|previous|page/i })
    )
  ).toBeVisible()
}

/**
 * Verify search input exists
 */
export async function verifySearchInputExists(page: Page): Promise<void> {
  await expect(
    page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i)
    ).or(
      page.locator('input[type="search"]')
    )
  ).toBeVisible()
}

/**
 * Verify filter dropdown/select exists
 */
export async function verifyFilterExists(page: Page, filterName: string): Promise<void> {
  await expect(
    page.getByRole('combobox', { name: new RegExp(filterName, 'i') }).or(
      page.getByLabel(new RegExp(filterName, 'i'))
    )
  ).toBeVisible()
}

/**
 * Verify heading text at specific level
 */
export async function verifyHeading(
  page: Page,
  text: string,
  level?: 1 | 2 | 3 | 4 | 5 | 6
): Promise<void> {
  if (level) {
    await expect(
      page.getByRole('heading', { level, name: new RegExp(text, 'i') })
    ).toBeVisible({ timeout: 10000 })
  } else {
    await expect(page.getByRole('heading', { name: new RegExp(text, 'i') })).toBeVisible({
      timeout: 10000,
    })
  }
}

/**
 * Verify multiple elements are visible
 */
export async function verifyElementsVisible(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    await expect(page.locator(selector)).toBeVisible({ timeout: 10000 })
  }
}

/**
 * Verify element contains specific text
 */
export async function verifyElementContainsText(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  await expect(page.locator(selector)).toContainText(new RegExp(text, 'i'))
}

/**
 * Verify breadcrumb navigation
 */
export async function verifyBreadcrumbs(page: Page, breadcrumbs: string[]): Promise<void> {
  const nav = page.locator('[aria-label*="breadcrumb"]').or(
    page.locator('[data-testid="breadcrumb"]')
  )

  for (const crumb of breadcrumbs) {
    await expect(nav.getByText(new RegExp(crumb, 'i'))).toBeVisible()
  }
}

/**
 * Verify alert or notification message
 */
export async function verifyAlert(page: Page, message: string): Promise<void> {
  await expect(
    page.getByRole('alert').filter({ hasText: new RegExp(message, 'i') }).or(
      page.locator('[role="status"]').filter({ hasText: new RegExp(message, 'i') })
    )
  ).toBeVisible({ timeout: 10000 })
}

/**
 * Verify tabs exist and specific tab is active
 */
export async function verifyActiveTab(page: Page, tabName: string): Promise<void> {
  await expect(
    page.getByRole('tab', { name: new RegExp(tabName, 'i'), selected: true })
  ).toBeVisible()
}

/**
 * Click a tab
 */
export async function clickTab(page: Page, tabName: string): Promise<void> {
  await page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click()
  await page.waitForLoadState('networkidle')
}
