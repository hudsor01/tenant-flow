import { expect, type Page, type Locator } from '@playwright/test'

/**
 * Form interaction helper utilities for E2E testing
 */

/**
 * Fill a text input by its label
 */
export async function fillTextInput(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(new RegExp(label, 'i')).fill(value)
}

/**
 * Fill a text input by its placeholder
 */
export async function fillTextInputByPlaceholder(
  page: Page,
  placeholder: string,
  value: string
): Promise<void> {
  await page.getByPlaceholder(new RegExp(placeholder, 'i')).fill(value)
}

/**
 * Fill a text input by data-testid
 */
export async function fillTextInputByTestId(
  page: Page,
  testId: string,
  value: string
): Promise<void> {
  await page.getByTestId(testId).fill(value)
}

/**
 * Select an option from a dropdown by label
 */
export async function selectOption(page: Page, label: string, option: string): Promise<void> {
  await page.getByLabel(new RegExp(label, 'i')).selectOption(option)
}

/**
 * Select an option from a combobox (shadcn/ui Select component)
 */
export async function selectComboboxOption(
  page: Page,
  label: string,
  option: string
): Promise<void> {
  // Click the combobox trigger
  await page.getByRole('combobox', { name: new RegExp(label, 'i') }).click()

  // Wait for options to appear
  await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 2000 })

  // Click the desired option
  await page.getByRole('option', { name: new RegExp(option, 'i') }).click()
}

/**
 * Check a checkbox by its label
 */
export async function clickCheckbox(page: Page, label: string): Promise<void> {
  await page.getByLabel(new RegExp(label, 'i')).check()
}

/**
 * Uncheck a checkbox by its label
 */
export async function uncheckCheckbox(page: Page, label: string): Promise<void> {
  await page.getByLabel(new RegExp(label, 'i')).uncheck()
}

/**
 * Click a radio button by its label
 */
export async function clickRadioButton(page: Page, label: string): Promise<void> {
  await page.getByLabel(new RegExp(label, 'i')).check()
}

/**
 * Submit a form by clicking the submit button
 */
export async function submitForm(page: Page, buttonText: string = 'Submit'): Promise<void> {
  await page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click()
}

/**
 * Verify validation error message is displayed
 */
export async function verifyValidationError(page: Page, errorMessage: string): Promise<void> {
  await expect(page.getByText(new RegExp(errorMessage, 'i'))).toBeVisible({ timeout: 3000 })
}

/**
 * Verify multiple validation errors are displayed
 */
export async function verifyValidationErrors(
  page: Page,
  errorMessages: string[]
): Promise<void> {
  for (const message of errorMessages) {
    await expect(page.getByText(new RegExp(message, 'i'))).toBeVisible({ timeout: 3000 })
  }
}

/**
 * Verify form field has specific value
 */
export async function verifyFieldValue(
  page: Page,
  label: string,
  expectedValue: string
): Promise<void> {
  const field = page.getByLabel(new RegExp(label, 'i'))
  await expect(field).toHaveValue(expectedValue)
}

/**
 * Verify form submit button is disabled
 */
export async function verifySubmitButtonDisabled(
  page: Page,
  buttonText: string = 'Submit'
): Promise<void> {
  const submitButton = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await expect(submitButton).toBeDisabled()
}

/**
 * Verify form submit button is enabled
 */
export async function verifySubmitButtonEnabled(
  page: Page,
  buttonText: string = 'Submit'
): Promise<void> {
  const submitButton = page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  await expect(submitButton).toBeEnabled()
}

/**
 * Clear a text input by its label
 */
export async function clearTextInput(page: Page, label: string): Promise<void> {
  await page.getByLabel(new RegExp(label, 'i')).clear()
}

/**
 * Fill a date input
 */
export async function fillDateInput(page: Page, label: string, date: string): Promise<void> {
  // Date format should be YYYY-MM-DD
  await page.getByLabel(new RegExp(label, 'i')).fill(date)
}

/**
 * Fill a number input
 */
export async function fillNumberInput(page: Page, label: string, value: number): Promise<void> {
  await page.getByLabel(new RegExp(label, 'i')).fill(value.toString())
}

/**
 * Upload a file to a file input
 */
export async function uploadFile(page: Page, label: string, filePath: string): Promise<void> {
  const fileInput = page.getByLabel(new RegExp(label, 'i'))
  await fileInput.setInputFiles(filePath)
}

/**
 * Fill a form with multiple fields
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string | number | boolean>
): Promise<void> {
  for (const [label, value] of Object.entries(formData)) {
    if (typeof value === 'boolean') {
      if (value) {
        await clickCheckbox(page, label)
      } else {
        await uncheckCheckbox(page, label)
      }
    } else if (typeof value === 'number') {
      await fillNumberInput(page, label, value)
    } else {
      await fillTextInput(page, label, value)
    }
  }
}

/**
 * Verify form is in loading state
 */
export async function verifyFormLoading(page: Page): Promise<void> {
  // Look for loading spinners or disabled form fields
  const loadingIndicator = page
    .locator('[data-testid="form-loading"]')
    .or(page.locator('form [aria-busy="true"]'))
    .or(page.locator('form .animate-spin'))

  await expect(loadingIndicator).toBeVisible({ timeout: 5000 })
}

/**
 * Wait for form submission to complete
 */
export async function waitForFormSubmission(page: Page): Promise<void> {
  // Wait for loading state to disappear
  await page.waitForSelector('[data-testid="form-loading"]', {
    state: 'hidden',
    timeout: 10000,
  })

  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 10000 })
}

/**
 * Verify required field indicator is present
 */
export async function verifyRequiredField(page: Page, label: string): Promise<void> {
  const field = page.getByLabel(new RegExp(label, 'i'))
  await expect(field).toHaveAttribute('required', '')
}

/**
 * Fill a textarea by its label
 */
export async function fillTextArea(page: Page, label: string, value: string): Promise<void> {
  const textarea = page.getByLabel(new RegExp(label, 'i'))
  await textarea.fill(value)
}
