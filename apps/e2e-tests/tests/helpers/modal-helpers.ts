import { expect, type Page } from '@playwright/test'

/**
 * Modal interaction helper utilities for E2E testing
 */

/**
 * Open a modal by clicking a button or link with specific text
 * Handles both <button> elements and <a> elements (Button asChild pattern)
 */
export async function openModal(page: Page, buttonText: string): Promise<void> {
  // Try button first, then link (for Button asChild pattern)
  const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  const link = page.getByRole('link', { name: new RegExp(buttonText, 'i') })
  
  if (await button.count() > 0) {
    await button.click()
  } else if (await link.count() > 0) {
    await link.click()
  } else {
    throw new Error(`Could not find button or link with text: ${buttonText}`)
  }
  
  // Wait for modal to appear
  await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 })
}

/**
 * Open a modal by navigating to a route (route-based modals)
 */
export async function openModalViaRoute(page: Page, route: string): Promise<void> {
  await page.goto(route)
  // Wait for modal to appear
  await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 })
}

/**
 * Close modal via the X (close) button
 */
export async function closeModalViaCloseButton(page: Page): Promise<void> {
  // Try multiple selectors for close button
  const closeButton = page.locator('[role="dialog"] button[aria-label*="Close"]').or(
    page.locator('[role="dialog"] button:has-text("×")')
  ).or(
    page.locator('[role="dialog"] [data-testid="close-button"]')
  )

  await closeButton.click()

  // Wait for modal to disappear
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
}

/**
 * Close modal via the Cancel button
 */
export async function closeModalViaCancelButton(page: Page): Promise<void> {
  await page.getByRole('button', { name: /cancel/i }).click()

  // Wait for modal to disappear
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
}

/**
 * Close modal via Escape key
 */
export async function closeModalViaEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape')

  // Wait for modal to disappear
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
}

/**
 * Close modal by clicking outside the modal (overlay click)
 */
export async function closeModalViaOutsideClick(page: Page): Promise<void> {
  // Click the overlay (backdrop)
  await page.locator('[role="dialog"]').locator('..').click({ position: { x: 0, y: 0 } })

  // Wait for modal to disappear
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 })
}

/**
 * Fill a form inside a modal with provided data
 */
export async function fillModalForm(
  page: Page,
  formData: Record<string, string | boolean>
): Promise<void> {
  const modalLocator = page.locator('[role="dialog"]')

  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'boolean') {
      // Handle checkboxes
      const checkbox = modalLocator.getByLabel(new RegExp(key, 'i'))
      if (value) {
        await checkbox.check()
      } else {
        await checkbox.uncheck()
      }
    } else {
      // Handle text inputs
      const input = modalLocator.getByLabel(new RegExp(key, 'i')).or(
        modalLocator.getByPlaceholder(new RegExp(key, 'i'))
      )
      await input.fill(value)
    }
  }
}

/**
 * Submit a modal form by clicking the submit button
 */
export async function submitModalForm(page: Page, buttonText: string = 'Submit'): Promise<void> {
  await page
    .locator('[role="dialog"]')
    .getByRole('button', { name: new RegExp(buttonText, 'i') })
    .click()
}

/**
 * Verify modal validation errors are displayed
 */
export async function verifyModalValidationErrors(
  page: Page,
  expectedErrors: string[]
): Promise<void> {
  const modalLocator = page.locator('[role="dialog"]')

  for (const errorText of expectedErrors) {
    await expect(modalLocator.getByText(new RegExp(errorText, 'i'))).toBeVisible()
  }
}

/**
 * Verify modal closes after successful submission
 */
export async function verifyModalClosesAfterSubmit(page: Page): Promise<void> {
  // Wait for modal to disappear
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 })
}

/**
 * Verify success toast appears after modal submission
 */
export async function verifySuccessToast(page: Page, message: string): Promise<void> {
  await expect(
    page.locator('[role="status"]').or(page.locator('[data-sonner-toast]')).filter({ hasText: new RegExp(message, 'i') })
  ).toBeVisible({ timeout: 5000 })
}

/**
 * Verify error toast appears
 */
export async function verifyErrorToast(page: Page, message: string): Promise<void> {
  await expect(
    page.locator('[role="status"]').or(page.locator('[data-sonner-toast]')).filter({ hasText: new RegExp(message, 'i') })
  ).toBeVisible({ timeout: 5000 })
}

/**
 * Verify modal is open
 */
export async function verifyModalIsOpen(page: Page): Promise<void> {
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
}

/**
 * Verify modal is closed
 */
export async function verifyModalIsClosed(page: Page): Promise<void> {
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })
}

/**
 * Verify submit button is disabled during submission
 */
export async function verifySubmitButtonDisabled(
  page: Page,
  buttonText: string = 'Submit'
): Promise<void> {
  const submitButton = page
    .locator('[role="dialog"]')
    .getByRole('button', { name: new RegExp(buttonText, 'i') })

  await expect(submitButton).toBeDisabled()
}

/**
 * Verify loading state is shown during submission
 */
export async function verifyLoadingState(page: Page): Promise<void> {
  // Look for common loading indicators
  const loadingIndicator = page
    .locator('[role="dialog"] [data-testid="loading"]')
    .or(page.locator('[role="dialog"] [aria-label*="loading"]'))
    .or(page.locator('[role="dialog"] .animate-spin'))

  await expect(loadingIndicator).toBeVisible({ timeout: 5000 })
}

/**
 * Wait for modal animation to complete
 */
export async function waitForModalAnimation(page: Page): Promise<void> {
  await page.waitForTimeout(300) // Standard animation duration
}
