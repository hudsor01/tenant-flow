/**
 * Stripe Webhook Integration Tests
 *
 * Tests that webhook processing actually updates the database.
 * Uses real Supabase connection with authenticated owner client to verify integration works.
 *
 * Note: Since legacy SERVICE_ROLE keys are disabled, we use the owner's authenticated
 * client which has RLS access to their own property_owner record. This tests the real
 * database interactions the same way production would work with proper admin keys.
 */
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import type { TablesUpdate } from '@repo/shared/types/core'
import { WebhookProcessor } from '../../src/modules/billing/webhook-processor.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { EmailService } from '../../src/modules/email/email.service'
import { authenticateAs, TEST_USERS, type AuthenticatedTestClient } from './rls/setup'

describe('Stripe Webhook Integration', () => {
	let processor: WebhookProcessor
	let ownerAuth: AuthenticatedTestClient

	// Use the existing stripe_account_id from the owner's property_owner record
	// We'll capture the original values and restore them in afterAll
	let originalStripeAccountId: string | null = null
	let originalOnboardingStatus: string | null = null
	let testStripeAccountId: string

	beforeAll(async () => {
		// Authenticate as the E2E owner
		ownerAuth = await authenticateAs(TEST_USERS.OWNER_A)

		// Get the owner's existing property_owner record
		const { data: existingPo, error: queryError } = await ownerAuth.client
			.from('property_owners')
			.select('id, stripe_account_id, onboarding_status')
			.eq('user_id', ownerAuth.user_id)
			.single()

		if (queryError || !existingPo) {
			throw new Error(
				`E2E owner must have a property_owner record: ${queryError?.message || 'Not found'}`
			)
		}

		// Save original values for cleanup
		originalStripeAccountId = existingPo.stripe_account_id
		originalOnboardingStatus = existingPo.onboarding_status

		// Use the existing stripe_account_id for testing
		// This ensures RLS allows the webhook processor to find and update the record
		testStripeAccountId = existingPo.stripe_account_id || `acct_test_${Date.now()}`

		// Set up initial test state
		const { error: updateError } = await ownerAuth.client
			.from('property_owners')
			.update({
				stripe_account_id: testStripeAccountId,
				onboarding_status: 'in_progress',
				charges_enabled: false,
				payouts_enabled: false,
				onboarding_completed_at: null,
				requirements_due: null
			})
			.eq('user_id', ownerAuth.user_id)

		if (updateError) {
			throw new Error(`Failed to set up test state: ${updateError.message}`)
		}

		// Create mock SupabaseService using the owner's authenticated client
		// This simulates what admin access would do - query/update the property_owners table
		const supabaseService = {
			getAdminClient: () => ownerAuth.client
		}

		// Mock email service (we don't need to test email sending)
		const emailService = {
			sendPaymentFailedEmail: jest.fn().mockResolvedValue(undefined)
		}

		const moduleRef = await Test.createTestingModule({
			providers: [
				WebhookProcessor,
				{ provide: SupabaseService, useValue: supabaseService },
				{ provide: EmailService, useValue: emailService }
			]
		}).compile()

		moduleRef.useLogger(false)
		processor = moduleRef.get(WebhookProcessor)
	})

	afterAll(async () => {
		if (!ownerAuth) return

		// Restore original values - build update object conditionally for nullable stripe_account_id
		const restoreData: TablesUpdate<'property_owners'> = {
			onboarding_status: originalOnboardingStatus || 'not_started',
			charges_enabled: false,
			payouts_enabled: false,
			onboarding_completed_at: null,
			requirements_due: null
		}

		// Only include stripe_account_id if it was originally set
		if (originalStripeAccountId !== null) {
			restoreData.stripe_account_id = originalStripeAccountId
		}

		await ownerAuth.client
			.from('property_owners')
			.update(restoreData)
			.eq('user_id', ownerAuth.user_id)
	})

	describe('account.updated webhook', () => {
		it('updates property_owner when Connect account completes onboarding', async () => {
			// Verify initial state
			const { data: before } = await ownerAuth.client
				.from('property_owners')
				.select('onboarding_status, charges_enabled, payouts_enabled')
				.eq('stripe_account_id', testStripeAccountId)
				.single()

			expect(before?.onboarding_status).toBe('in_progress')
			expect(before?.charges_enabled).toBe(false)
			expect(before?.payouts_enabled).toBe(false)

			// Process webhook simulating Stripe Connect onboarding completion
			const stripeAccount = {
				id: testStripeAccountId,
				object: 'account',
				type: 'express',
				details_submitted: true,
				charges_enabled: true,
				payouts_enabled: true,
				requirements: {
					disabled_reason: null,
					currently_due: [],
					eventually_due: []
				}
			} as unknown as Stripe.Account

			await processor.processEvent({
				type: 'account.updated',
				data: { object: stripeAccount }
			} as Stripe.Event)

			// Verify database was updated
			const { data: after } = await ownerAuth.client
				.from('property_owners')
				.select('onboarding_status, charges_enabled, payouts_enabled, onboarding_completed_at')
				.eq('stripe_account_id', testStripeAccountId)
				.single()

			expect(after?.onboarding_status).toBe('completed')
			expect(after?.charges_enabled).toBe(true)
			expect(after?.payouts_enabled).toBe(true)
			expect(after?.onboarding_completed_at).not.toBeNull()
		})

		it('keeps in_progress status when account has disabled_reason', async () => {
			// Reset to in_progress first
			await ownerAuth.client
				.from('property_owners')
				.update({
					onboarding_status: 'in_progress',
					charges_enabled: false,
					payouts_enabled: false,
					onboarding_completed_at: null
				})
				.eq('stripe_account_id', testStripeAccountId)

			// Process rejection webhook
			const stripeAccount = {
				id: testStripeAccountId,
				object: 'account',
				type: 'express',
				details_submitted: true,
				charges_enabled: false,
				payouts_enabled: false,
				requirements: {
					disabled_reason: 'rejected.fraud',
					currently_due: [],
					eventually_due: []
				}
			} as unknown as Stripe.Account

			await processor.processEvent({
				type: 'account.updated',
				data: { object: stripeAccount }
			} as Stripe.Event)

			// Verify rejection
			const { data: after } = await ownerAuth.client
				.from('property_owners')
				.select('onboarding_status, charges_enabled, payouts_enabled')
				.eq('stripe_account_id', testStripeAccountId)
				.single()

			expect(after?.onboarding_status).toBe('in_progress')
			expect(after?.charges_enabled).toBe(false)
			expect(after?.payouts_enabled).toBe(false)
		})

		it('tracks requirements_due from Stripe account', async () => {
			// Reset state
			await ownerAuth.client
				.from('property_owners')
				.update({
					onboarding_status: 'in_progress',
					charges_enabled: false,
					payouts_enabled: false,
					requirements_due: null
				})
				.eq('stripe_account_id', testStripeAccountId)

			// Process webhook with requirements
			const stripeAccount = {
				id: testStripeAccountId,
				object: 'account',
				type: 'express',
				details_submitted: false,
				charges_enabled: false,
				payouts_enabled: false,
				requirements: {
					disabled_reason: null,
					currently_due: ['individual.verification.document', 'external_account'],
					eventually_due: ['individual.dob.day']
				}
			} as unknown as Stripe.Account

			await processor.processEvent({
				type: 'account.updated',
				data: { object: stripeAccount }
			} as Stripe.Event)

			// Verify requirements were captured
			const { data: after } = await ownerAuth.client
				.from('property_owners')
				.select('requirements_due')
				.eq('stripe_account_id', testStripeAccountId)
				.single()

			expect(after?.requirements_due).toContain('individual.verification.document')
			expect(after?.requirements_due).toContain('external_account')
			expect(after?.requirements_due).toContain('individual.dob.day')
		})
	})
})
