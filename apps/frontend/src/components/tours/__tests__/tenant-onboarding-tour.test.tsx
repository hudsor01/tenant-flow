/**
 * Tests for Tenant Onboarding Tour - Payment Options Step
 * Requirements: 4.4, 5.2
 *
 * These tests verify that:
 * - Payment options step is included in the tour
 * - Tour targets the payment-options element
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Tenant Onboarding Tour - Payment Options Step', () => {
	let tourFileContent: string

	beforeEach(() => {
		// Read the tour component file to verify its structure
		tourFileContent = readFileSync(
			join(__dirname, '../tenant-onboarding-tour.tsx'),
			'utf-8'
		)
	})

	it('includes a payment options step in the tour (4.4, 5.2)', () => {
		// Verify the tour file includes a TourStep for payment options
		expect(tourFileContent).toContain('Payment Options')
		expect(tourFileContent).toContain(
			'target="[data-tour=\'payment-options\']"'
		)
	})

	it('targets the payment-options element with data-tour attribute (4.4, 5.2)', () => {
		// Verify the tour step targets the correct element
		expect(tourFileContent).toContain("[data-tour='payment-options']")
	})

	it('explains the difference between payment methods in the tour step (4.4)', () => {
		// Verify the tour step explains payment methods
		expect(tourFileContent).toContain('add a payment method')
		expect(tourFileContent).toContain('connect your bank')
	})
})
