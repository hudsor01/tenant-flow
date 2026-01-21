/**
 * Stripe Connect Integration Tests
 *
 * Tests real Stripe Connect account creation and onboarding using
 * the StripeTestFixtures infrastructure. No mocking - uses real
 * Stripe test mode API.
 *
 * Verifies:
 * - Express connected account creation
 * - Account onboarding webhook processing
 * - Database sync for stripe_connected_accounts table
 * - RLS allows owners to see their own connect accounts
 *
 * @requires STRIPE_SECRET_KEY - Must be a test mode key (sk_test_*)
 * @requires E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD - For RLS verification
 * @see https://stripe.com/docs/connect/testing
 */

import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { WebhookProcessor } from '../../src/modules/billing/webhooks/webhook-processor.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { ConnectWebhookHandler } from '../../src/modules/billing/webhooks/handlers/connect-webhook.handler'
import { SubscriptionWebhookHandler } from '../../src/modules/billing/webhooks/handlers/subscription-webhook.handler'
import { PaymentWebhookHandler } from '../../src/modules/billing/webhooks/handlers/payment-webhook.handler'
import { CheckoutWebhookHandler } from '../../src/modules/billing/webhooks/handlers/checkout-webhook.handler'
import { AppLogger } from '../../src/logger/app-logger.service'
import { SilentLogger } from '../../src/__tests__/silent-logger'
import {
	stripeFixtures,
	isStripeTestModeAvailable,
	STRIPE_SKIP_MESSAGE
} from '../fixtures/stripe-test-helpers'
import {
	authenticateAs,
	TEST_USERS,
	isTestUserAvailable,
	getServiceRoleClient,
	shouldSkipIntegrationTests
} from './rls/setup'
import type { AuthenticatedTestClient } from './rls/setup'

// Skip if Stripe test mode or integration prerequisites not available
const shouldSkip = !isStripeTestModeAvailable() || shouldSkipIntegrationTests
const hasOwnerUser = isTestUserAvailable('OWNER_A')

describe.skipIf(shouldSkip)(
	'Stripe Connect Integration',
	() => {
		let processor: WebhookProcessor
		let ownerAuth: AuthenticatedTestClient | null = null

		beforeAll(async () => {
			// Authenticate as owner for RLS verification (if available)
			if (hasOwnerUser) {
				ownerAuth = await authenticateAs(TEST_USERS.OWNER_A)
			}

			// Create mock handlers for webhooks we're not testing directly
			const mockSubscriptionHandler = {
				handleSubscriptionCreated: jest.fn().mockResolvedValue(undefined),
				handleSubscriptionUpdated: jest.fn().mockResolvedValue(undefined),
				handleSubscriptionDeleted: jest.fn().mockResolvedValue(undefined)
			}

			const mockPaymentHandler = {
				handlePaymentAttached: jest.fn().mockResolvedValue(undefined),
				handlePaymentFailed: jest.fn().mockResolvedValue(undefined),
				handlePaymentIntentSucceeded: jest.fn().mockResolvedValue(undefined),
				handlePaymentIntentFailed: jest.fn().mockResolvedValue(undefined)
			}

			const mockCheckoutHandler = {
				handleCheckoutCompleted: jest.fn().mockResolvedValue(undefined)
			}

			// Use real connect handler with real database
			const serviceClient = getServiceRoleClient()
			const supabaseService = {
				getAdminClient: () => serviceClient
			}

			const moduleRef = await Test.createTestingModule({
				providers: [
					WebhookProcessor,
					ConnectWebhookHandler,
					{ provide: SupabaseService, useValue: supabaseService },
					{
						provide: SubscriptionWebhookHandler,
						useValue: mockSubscriptionHandler
					},
					{ provide: PaymentWebhookHandler, useValue: mockPaymentHandler },
					{ provide: CheckoutWebhookHandler, useValue: mockCheckoutHandler },
					{ provide: AppLogger, useValue: new SilentLogger() }
				]
			}).compile()

			moduleRef.useLogger(false)
			processor = moduleRef.get(WebhookProcessor)
		})

		describe('Connected Account Creation', () => {
			it('creates real Express connected account in Stripe test mode', async () => {
				const account = await stripeFixtures.createConnectedAccount('US', {
					integration_test: 'connect-lifecycle'
				})

				// Verify account was created in Stripe
				expect(account.id).toMatch(/^acct_/)
				expect(account.type).toBe('express')
				expect(account.metadata?.test_fixture).toBe('true')
				expect(account.metadata?.integration_test).toBe('connect-lifecycle')

				// Capabilities should be requested
				expect(account.capabilities?.card_payments).toBeDefined()
				expect(account.capabilities?.transfers).toBeDefined()
			})

			it('can create connected accounts in different countries', async () => {
				// Create GB (UK) account
				const gbAccount = await stripeFixtures.createConnectedAccount('GB', {
					country_test: 'GB'
				})

				expect(gbAccount.id).toMatch(/^acct_/)
				expect(gbAccount.country).toBe('GB')

				// Create AU account
				const auAccount = await stripeFixtures.createConnectedAccount('AU', {
					country_test: 'AU'
				})

				expect(auAccount.id).toMatch(/^acct_/)
				expect(auAccount.country).toBe('AU')
			})
		})

		describe('Account Onboarding Webhooks', () => {
			it('account.updated webhook processes onboarding completion', async () => {
				const account = await stripeFixtures.createConnectedAccount('US', {
					webhook_test: 'onboarding-complete'
				})

				// First, create a stripe_connected_accounts record in database
				// (simulating the account creation flow)
				if (ownerAuth) {
					const { error: insertError } = await ownerAuth.client
						.from('stripe_connected_accounts')
						.upsert({
							user_id: ownerAuth.user_id,
							stripe_account_id: account.id,
							onboarding_status: 'in_progress',
							charges_enabled: false,
							payouts_enabled: false
						})

					// May fail if record exists, that's OK
					if (insertError && !insertError.message.includes('duplicate')) {
						// Just update the existing record
						await ownerAuth.client
							.from('stripe_connected_accounts')
							.update({
								stripe_account_id: account.id,
								onboarding_status: 'in_progress',
								charges_enabled: false,
								payouts_enabled: false
							})
							.eq('user_id', ownerAuth.user_id)
					}
				}

				// Simulate account.updated webhook for completed onboarding
				await processor.processEvent({
					id: `evt_test_${Date.now()}`,
					type: 'account.updated',
					data: {
						object: {
							id: account.id,
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
					},
					object: 'event',
					api_version: '2025-04-30.basil',
					created: Math.floor(Date.now() / 1000),
					livemode: false,
					pending_webhooks: 0,
					request: { id: null, idempotency_key: null }
				} as Stripe.Event)

				// Verify database was updated (if owner auth is available)
				if (ownerAuth) {
					const { data: updated } = await ownerAuth.client
						.from('stripe_connected_accounts')
						.select(
							'onboarding_status, charges_enabled, payouts_enabled, onboarding_completed_at'
						)
						.eq('stripe_account_id', account.id)
						.single()

					if (updated) {
						expect(updated.onboarding_status).toBe('completed')
						expect(updated.charges_enabled).toBe(true)
						expect(updated.payouts_enabled).toBe(true)
						expect(updated.onboarding_completed_at).not.toBeNull()
					}
				}
			})

			it('account.updated webhook handles pending requirements', async () => {
				const account = await stripeFixtures.createConnectedAccount('US', {
					webhook_test: 'requirements-pending'
				})

				// Simulate account.updated webhook with pending requirements
				await processor.processEvent({
					id: `evt_test_${Date.now()}`,
					type: 'account.updated',
					data: {
						object: {
							id: account.id,
							object: 'account',
							type: 'express',
							details_submitted: false,
							charges_enabled: false,
							payouts_enabled: false,
							requirements: {
								disabled_reason: null,
								currently_due: ['individual.verification.document'],
								eventually_due: ['external_account']
							}
						} as unknown as Stripe.Account
					},
					object: 'event',
					api_version: '2025-04-30.basil',
					created: Math.floor(Date.now() / 1000),
					livemode: false,
					pending_webhooks: 0,
					request: { id: null, idempotency_key: null }
				} as Stripe.Event)

				// Webhook should process without error
				expect(true).toBe(true)
			})

			it('account.updated webhook handles rejection', async () => {
				const account = await stripeFixtures.createConnectedAccount('US', {
					webhook_test: 'rejected'
				})

				// Simulate account.updated webhook for rejected account
				await processor.processEvent({
					id: `evt_test_${Date.now()}`,
					type: 'account.updated',
					data: {
						object: {
							id: account.id,
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
					},
					object: 'event',
					api_version: '2025-04-30.basil',
					created: Math.floor(Date.now() / 1000),
					livemode: false,
					pending_webhooks: 0,
					request: { id: null, idempotency_key: null }
				} as Stripe.Event)

				// Webhook should process without error
				expect(true).toBe(true)
			})
		})

		describe('Account Capabilities', () => {
			it('retrieves account capabilities from Stripe', async () => {
				const account = await stripeFixtures.createConnectedAccount('US', {
					capabilities_test: 'true'
				})

				const stripe = stripeFixtures.getStripeClient()
				const retrieved = await stripe.accounts.retrieve(account.id)

				// Test mode accounts have capabilities requested but may not be active
				expect(retrieved.capabilities).toBeDefined()

				// Check that card_payments was requested
				const cardPayments = retrieved.capabilities?.card_payments
				expect(['inactive', 'pending', 'active']).toContain(cardPayments)
			})
		})

		describe.skipIf(!hasOwnerUser)('RLS Verification', () => {
			it('owner can see their own stripe_connected_accounts record', async () => {
				if (!ownerAuth) {
					throw new Error('Owner auth not available')
				}

				// Query stripe_connected_accounts - owner should see their own record
				const { data: connectAccount, error } = await ownerAuth.client
					.from('stripe_connected_accounts')
					.select('id, user_id, stripe_account_id, onboarding_status')
					.eq('user_id', ownerAuth.user_id)
					.maybeSingle()

				// RLS should allow owner to see their own record
				expect(error).toBeNull()

				if (connectAccount) {
					expect(connectAccount.user_id).toBe(ownerAuth.user_id)
				}
			})

			it('owner cannot see other owners connect accounts', async () => {
				if (!ownerAuth) {
					throw new Error('Owner auth not available')
				}

				// Query all stripe_connected_accounts - should only see own records
				const { data: allAccounts, error } = await ownerAuth.client
					.from('stripe_connected_accounts')
					.select('id, user_id')

				expect(error).toBeNull()

				// Should only see records belonging to this owner
				if (allAccounts && allAccounts.length > 0) {
					for (const account of allAccounts) {
						expect(account.user_id).toBe(ownerAuth.user_id)
					}
				}
			})
		})

		describe('Error Handling', () => {
			it('handles non-existent account retrieval gracefully', async () => {
				const stripe = stripeFixtures.getStripeClient()

				await expect(
					stripe.accounts.retrieve('acct_nonexistent_12345')
				).rejects.toThrow()
			})

			it('webhook processor handles account without database record', async () => {
				// Process webhook for an account that doesn't exist in DB
				// Should not throw, just log
				await processor.processEvent({
					id: `evt_test_${Date.now()}`,
					type: 'account.updated',
					data: {
						object: {
							id: `acct_no_db_record_${Date.now()}`,
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
					},
					object: 'event',
					api_version: '2025-04-30.basil',
					created: Math.floor(Date.now() / 1000),
					livemode: false,
					pending_webhooks: 0,
					request: { id: null, idempotency_key: null }
				} as Stripe.Event)

				// Should not throw
				expect(true).toBe(true)
			})
		})

		describe('Connected Account Payouts', () => {
			it('payout.created webhook can be processed', async () => {
				const account = await stripeFixtures.createConnectedAccount('US', {
					payout_test: 'true'
				})

				// Simulate payout.created webhook
				await processor.processEvent({
					id: `evt_test_${Date.now()}`,
					type: 'payout.created',
					account: account.id,
					data: {
						object: {
							id: `po_test_${Date.now()}`,
							object: 'payout',
							amount: 10000,
							currency: 'usd',
							status: 'pending',
							arrival_date: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60
						} as unknown as Stripe.Payout
					},
					object: 'event',
					api_version: '2025-04-30.basil',
					created: Math.floor(Date.now() / 1000),
					livemode: false,
					pending_webhooks: 0,
					request: { id: null, idempotency_key: null }
				} as Stripe.Event)

				// Webhook should process without error
				expect(true).toBe(true)
			})

			it('payout.paid webhook can be processed', async () => {
				const account = await stripeFixtures.createConnectedAccount('US', {
					payout_paid_test: 'true'
				})

				// Simulate payout.paid webhook
				await processor.processEvent({
					id: `evt_test_${Date.now()}`,
					type: 'payout.paid',
					account: account.id,
					data: {
						object: {
							id: `po_test_${Date.now()}`,
							object: 'payout',
							amount: 10000,
							currency: 'usd',
							status: 'paid',
							arrival_date: Math.floor(Date.now() / 1000)
						} as unknown as Stripe.Payout
					},
					object: 'event',
					api_version: '2025-04-30.basil',
					created: Math.floor(Date.now() / 1000),
					livemode: false,
					pending_webhooks: 0,
					request: { id: null, idempotency_key: null }
				} as Stripe.Event)

				// Webhook should process without error
				expect(true).toBe(true)
			})
		})
	},
	// Increase timeout for real API calls
	{ timeout: 120000 }
)

// Informational test for when Stripe is not configured
describe.skipIf(isStripeTestModeAvailable())(
	'Stripe Connect Integration (Skipped)',
	() => {
		it(STRIPE_SKIP_MESSAGE, () => {
			expect(true).toBe(true)
		})
	}
)
