import { expect, type Page } from "@playwright/test";

/**
 * Modal interaction helper utilities for E2E testing
 */

/**
 * Open a modal by clicking a button or link with specific text
 * Handles both <button> elements and <a> elements (Button asChild pattern)
 */
export async function openModal(page: Page, buttonText: string): Promise<void> {
	// Try button first, then link (for Button asChild pattern)
	const button = page.getByRole("button", { name: buttonText });
	const link = page.getByRole("link", { name: buttonText });

	if ((await button.count()) > 0) {
		await button.click();
	} else if ((await link.count()) > 0) {
		await link.click();
	} else {
		throw new Error(`Could not find button or link with text: ${buttonText}`);
	}

	// Wait for modal to appear
	await page.waitForSelector('[role="dialog"]', {
		state: "visible",
		timeout: 5000,
	});
}

/**
 * Open a modal by navigating to a route (route-based modals)
 */
export async function openModalViaRoute(
	page: Page,
	route: string,
): Promise<void> {
	await page.goto(route);
	// Wait for modal to appear
	await page.waitForSelector('[role="dialog"]', {
		state: "visible",
		timeout: 5000,
	});
}

/**
 * Close modal via the X (close) button
 */
export async function closeModalViaCloseButton(page: Page): Promise<void> {
	// Try multiple selectors for close button
	const closeButton = page
		.locator('[role="dialog"] button[aria-label*="Close"]')
		.or(page.locator('[role="dialog"] button:has-text("×")'))
		.or(page.locator('[role="dialog"] [data-testid="close-button"]'));

	await closeButton.click();

	// Wait for modal to disappear
	await page.waitForSelector('[role="dialog"]', {
		state: "hidden",
		timeout: 5000,
	});
}

/**
 * Close modal via the Cancel button
 */
export async function closeModalViaCancelButton(page: Page): Promise<void> {
	await page.getByRole("button", { name: /cancel/i }).click();

	// Wait for modal to disappear
	await page.waitForSelector('[role="dialog"]', {
		state: "hidden",
		timeout: 5000,
	});
}

/**
 * Close modal via Escape key
 */
export async function closeModalViaEscape(page: Page): Promise<void> {
	await page.keyboard.press("Escape");

	// Wait for modal to disappear
	await page.waitForSelector('[role="dialog"]', {
		state: "hidden",
		timeout: 5000,
	});
}

/**
 * Submit a modal form by clicking the submit button
 */
export async function submitModalForm(
	page: Page,
	buttonText: string = "Submit",
): Promise<void> {
	await page
		.locator('[role="dialog"]')
		.getByRole("button", { name: buttonText })
		.click();
}

/**
 * Verify modal is open
 */
export async function verifyModalIsOpen(page: Page): Promise<void> {
	await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
}

/**
 * Verify modal is closed
 */
export async function verifyModalIsClosed(page: Page): Promise<void> {
	await expect(page.locator('[role="dialog"]')).not.toBeVisible({
		timeout: 5000,
	});
}
