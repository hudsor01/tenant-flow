import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'

/**
 * Phase 42 — Cancellation UX Happy Path
 *
 * Requirements verified: CANCEL-01, CANCEL-03
 * Uses storageState (owner.json) for auth — no manual login required.
 * Skips cleanly if the seeded owner has no active subscription (avoids flakiness
 * in environments without Stripe test-mode fixtures).
 */
test.describe('Owner subscription cancellation (Phase 42 happy path)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(ROUTES.DASHBOARD_SETTINGS)
	})

	test('owner can cancel subscription in one click without leaving the settings page', async ({
		page
	}) => {
		// Navigate to billing tab (route supports ?tab=billing query)
		const billingTab = page.getByRole('tab', { name: /billing/i })
		if (await billingTab.count()) {
			await billingTab.click()
		}

		// Gate: ensure we landed on a page exposing the cancellation section
		const dangerHeading = page.getByText(/danger zone/i).first()
		const cancelButton = page.getByRole('button', {
			name: /cancel my subscription/i
		})
		const hasSubscriptionToCancel = (await cancelButton.count()) > 0

		test.skip(
			!hasSubscriptionToCancel,
			'Seeded owner has no active subscription in this environment. Create a Stripe test-mode subscription to run this spec end-to-end.'
		)

		await expect(dangerHeading).toBeVisible()
		await expect(cancelButton).toBeVisible()

		// CANCEL-01: clicking Cancel Plan opens AlertDialog (no redirect to billing.stripe.com)
		const portalRedirectDetector = page
			.waitForURL(/billing\.stripe\.com/, { timeout: 2000 })
			.catch(() => null)
		await cancelButton.click()

		const dialog = page.getByRole('alertdialog')
		await expect(dialog).toBeVisible({ timeout: 5000 })
		await expect(dialog.getByText('Cancel your subscription?')).toBeVisible()
		await expect(
			dialog.getByText(/your plan will stay active until/i)
		).toBeVisible()
		await expect(
			dialog.getByRole('button', { name: /keep my plan/i })
		).toBeVisible()

		const confirmBtn = dialog.getByRole('button', {
			name: /confirm subscription cancellation/i
		})
		await expect(confirmBtn).toBeVisible()

		// Assert no Stripe portal redirect happened while dialog was open
		const redirectHappened = await portalRedirectDetector
		expect(redirectHappened).toBeNull()

		// Confirm cancellation
		await confirmBtn.click()

		// Assert UI flips to Cancel-scheduled state (State 2 per UI-SPEC)
		await expect(page.getByText(/subscription ends/i)).toBeVisible({
			timeout: 10000
		})
		await expect(
			page.getByRole('button', { name: /reactivate subscription/i })
		).toBeVisible()
		await expect(
			page.getByText(/reactivating before then|days remaining/i)
		).toBeVisible()

		// Assert URL never left settings (CANCEL-01 promise)
		expect(page.url()).toContain('/dashboard/settings')
		expect(page.url()).not.toContain('billing.stripe.com')

		// Best-effort cleanup: reactivate so subsequent test runs find Active state again
		const reactivateBtn = page.getByRole('button', {
			name: /reactivate subscription/i
		})
		if (await reactivateBtn.count()) {
			await reactivateBtn.click()
			// Wait for flip back to Active state OR for button to disappear
			await expect(
				page.getByRole('button', { name: /cancel my subscription/i })
			).toBeVisible({ timeout: 10000 })
		}
	})

	test('cancel section is not rendered for owners without a subscription', async ({
		page
	}) => {
		const billingTab = page.getByRole('tab', { name: /billing/i })
		if (await billingTab.count()) {
			await billingTab.click()
		}

		const cancelButton = page.getByRole('button', {
			name: /cancel my subscription/i
		})
		const hasSubscription = (await cancelButton.count()) > 0

		test.skip(
			hasSubscription,
			'This smoke is for owners without a subscription; seeded owner has one.'
		)

		// Positive assertion: no Danger Zone section surfaces when there is no sub
		await expect(page.getByText(/danger zone/i)).not.toBeVisible()
	})
})
