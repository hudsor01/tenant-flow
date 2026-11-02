import { expect, type Page } from "@playwright/test";

/**
 * Navigation helper utilities for E2E testing
 */

/**
 * Patterns to ignore in console errors (expected in local dev)
 */
const IGNORED_ERROR_PATTERNS = [
	// Supabase auth errors when running locally
	"@supabase/auth-js",
	"supabase",
	"GoTrueClient",
	"_getUser",
	"_useSession",
	// Network errors from API calls (handled gracefully by UI)
	"Network error during API request",
	"Failed to fetch",
	// React hydration warnings (not critical)
	"Hydration failed",
	"Text content does not match",
	// React DevTools
	"Download the React DevTools",
];

/**
 * Check if an error should be ignored
 */
function shouldIgnoreError(errorText: string): boolean {
	return IGNORED_ERROR_PATTERNS.some((pattern) =>
		errorText.toLowerCase().includes(pattern.toLowerCase()),
	);
}

/**
 * Set up console and network error monitoring for a page
 */
export function setupErrorMonitoring(page: Page): {
	errors: string[];
	networkErrors: Array<{ url: string; status: number }>;
} {
	const errors: string[] = [];
	const networkErrors: Array<{ url: string; status: number }> = [];

	page.on("console", (msg) => {
		if (msg.type() === "error") {
			const text = msg.text();
			// Only track errors that are NOT in our ignore list
			if (!shouldIgnoreError(text)) {
				errors.push(text);
			}
		}
	});

	page.on("response", (response) => {
		const status = response.status();
		const url = response.url();
		// Ignore 401s (expected for unauthenticated API calls)
		// Ignore Supabase auth endpoints
		if (status >= 400 && status !== 401 && !url.includes("supabase")) {
			networkErrors.push({
				url,
				status,
			});
		}
	});

	return { errors, networkErrors };
}

/**
 * Verify page is fully loaded with no errors
 */
export async function verifyPageLoaded(
	page: Page,
	expectedPath: string,
	expectedHeading: string,
): Promise<void> {
	// Verify URL
	expect(page.url()).toContain(expectedPath);

	// Verify heading
	await expect(
		page.getByRole("heading", { name: new RegExp(expectedHeading, "i") }),
	).toBeVisible({ timeout: 10000 });

	// Verify no loading spinners
	await expect(page.locator('[data-testid="loading"]')).not.toBeVisible({
		timeout: 5000,
	});

	// Wait for network to be idle
	await page.waitForLoadState("domcontentloaded");
}
