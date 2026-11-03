import type { Page } from "@playwright/test";

/**
 * Form interaction helper utilities for E2E testing
 */

/**
 * Fill a text input by its label
 */
export async function fillTextInput(
	page: Page,
	label: string,
	value: string,
): Promise<void> {
	await page.getByLabel(label).fill(value);
}
