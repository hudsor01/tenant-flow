import { expect, type Page } from '@playwright/test'

/**
 * Navigation helper utilities for E2E testing
 */

/**
 * Navigate to a specific page and wait for it to load
 */
export async function navigateToPage(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/**
 * Click a sidebar link by its text and wait for navigation
 */
export async function clickSidebarLink(page: Page, linkName: string): Promise<void> {
  await page.getByRole('link', { name: new RegExp(linkName, 'i') }).click()
  await page.waitForLoadState('networkidle')
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

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  // Wait a bit for any async errors
  await page.waitForTimeout(1000)

  if (errors.length > 0) {
    console.error('Console errors detected:', errors)
  }

  expect(errors).toHaveLength(0)
}

/**
 * Monitor and verify no network errors (4xx, 5xx) occurred
 */
export async function verifyNoNetworkErrors(page: Page): Promise<void> {
  const failedRequests: Array<{ url: string; status: number }> = []

  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
      })
    }
  })

  // Wait a bit for any async requests
  await page.waitForTimeout(1000)

  if (failedRequests.length > 0) {
    console.error('Network errors detected:', failedRequests)
  }

  expect(failedRequests).toHaveLength(0)
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

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
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
  await expect(page.locator('[data-testid="loading"]')).not.toBeVisible({ timeout: 5000 })

  // Wait for network to be idle
  await page.waitForLoadState('networkidle')
}
