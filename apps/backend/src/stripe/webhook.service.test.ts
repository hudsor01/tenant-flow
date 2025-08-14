import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { Logger } from '@nestjs/common'
import { WebhookService } from './webhook.service'
import type Stripe from 'stripe'
import { SubscriptionEventType } from '../common/events/subscription.events'

// Simplified mock factory functions to avoid type conflicts
const createMockStripeSubscription = (overrides: Partial<any> = {}): any => ({
  id: 'sub_test123',
  object: 'subscription',
  status: 'active',
  customer: 'cus_test123',
  ...overrides
})

const createMockStripeInvoice = (overrides: Partial<any> = {}): any => ({
  id: 'in_test123',
  object: 'invoice',
  subscription: 'sub_test123',
  customer: 'cus_test123',
  customer_email: 'user@example.com',
  amount_due: 2000,
  currency: 'usd',
  attempt_count: 1,
  status: 'draft',
  ...overrides
})

const createMockStripeCustomer = (overrides: Partial<any> = {}): any => ({
  id: 'cus_test123',
  object: 'customer',
  email: 'user@example.com',
  name: 'Test User',
  default_source: null,
  invoice_settings: { 
    default_payment_method: null,
    custom_fields: null,
    footer: null,
    rendering_options: null
  },
  ...overrides
})

// Mock dependencies
const mockBillingService = {
  syncSubscriptionFromStripe: jest.fn(),
  handleSubscriptionDeleted: jest.fn()
} as any

const mockStripeService = {
  client: {
    customers: {
      retrieve: jest.fn()
    },
    subscriptions: {
      retrieve: jest.fn()
    },
    invoices: {
      retrieve: jest.fn()
    }
  }
} as any

const mockPrismaService = {
  subscription: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  }
} as any

const mockEventEmitter = {
  emit: jest.fn()
} as any

describe('WebhookService - Comprehensive Unit Tests', () => {
  let webhookService: WebhookService

  beforeEach(() => {
    jest.clearAllMocks()
    
    webhookService = new WebhookService(
      mockBillingService,
      mockStripeService,
      mockPrismaService,
      mockEventEmitter
    )

    // Mock Logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Webhook Event Routing', () => {
    it('should route subscription created events correctly', async () => {
      const mockSubscription = createMockStripeSubscription({
        id: 'sub_test123',
        status: 'active'
      })

      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'customer.subscription.created',
        data: {
          object: mockSubscription as any,
          previous_attributes: {}
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      await webhookService.handleWebhookEvent(event)

      expect(mockBillingService.syncSubscriptionFromStripe).toHaveBeenCalledWith(mockSubscription)
    })

    it('should route subscription updated events correctly', async () => {
      const mockSubscription = createMockStripeSubscription({
        id: 'sub_test123',
        status: 'active'
      })

      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription as any,
          previous_attributes: { status: 'trialing' }
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      await webhookService.handleWebhookEvent(event)

      expect(mockBillingService.syncSubscriptionFromStripe).toHaveBeenCalledWith(mockSubscription)
    })

    it('should route subscription deleted events correctly', async () => {
      const mockSubscription = createMockStripeSubscription({
        id: 'sub_test123',
        status: 'canceled'
      })

      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'customer.subscription.deleted',  
        data: {
          object: mockSubscription as any,
          previous_attributes: {}
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      await webhookService.handleWebhookEvent(event)

      expect(mockBillingService.handleSubscriptionDeleted).toHaveBeenCalledWith('sub_test123')
    })

    it('should ignore unsupported event types', async () => {
      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'account.updated', // Unsupported event type
        data: {
          object: {} as any,
          previous_attributes: {}
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      await webhookService.handleWebhookEvent(event)

      // Should not call any service methods
      expect(mockBillingService.syncSubscriptionFromStripe).not.toHaveBeenCalled()
      expect(mockBillingService.handleSubscriptionDeleted).not.toHaveBeenCalled()
    })
  })

  describe('New Event Handler Tests', () => {
    describe('Customer Event Handlers', () => {
      it('should handle customer created events', async () => {
        const mockCustomer = createMockStripeCustomer({
          id: 'cus_test123',
          email: 'user@example.com'
        })

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'customer.created',
          data: {
            object: mockCustomer as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Customer created: cus_test123')
        )
      })

      it('should handle customer updated events', async () => {
        const mockCustomer = createMockStripeCustomer({
          id: 'cus_test123',
          email: 'newemail@example.com'
        })

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'customer.updated',
          data: {
            object: mockCustomer as any,
            previous_attributes: {
              email: 'oldemail@example.com'
            }
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Customer updated: cus_test123')
        )
      })

      it('should handle customer deleted events', async () => {
        const mockCustomer = createMockStripeCustomer({
          id: 'cus_test123'
        })

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'customer.deleted',
          data: {
            object: mockCustomer as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Customer deleted: cus_test123')
        )
      })
    })

    describe('Invoice Event Handlers', () => {
      it('should handle invoice created events', async () => {
        const mockInvoice = createMockStripeInvoice({
          id: 'in_test123',
          status: 'draft'
        })

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'invoice.created',
          data: {
            object: mockInvoice as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Invoice created: in_test123')
        )
      })

      it('should handle invoice finalized events', async () => {
        const mockInvoice = createMockStripeInvoice({
          id: 'in_test123',
          status: 'open'
        })

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'invoice.finalized',
          data: {
            object: mockInvoice as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Invoice finalized: in_test123')
        )
      })
    })

    describe('Payment Intent Event Handlers', () => {
      it('should handle payment intent created events', async () => {
        const mockPaymentIntent = {
          id: 'pi_test123',
          object: 'payment_intent',
          status: 'requires_payment_method',
          amount: 2000,
          currency: 'usd'
        }

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'payment_intent.created',
          data: {
            object: mockPaymentIntent as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Payment intent created: pi_test123')
        )
      })

      it('should handle payment intent succeeded events', async () => {
        const mockPaymentIntent = {
          id: 'pi_test123',
          object: 'payment_intent',
          status: 'succeeded',
          amount: 2000,
          currency: 'usd'
        }

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'payment_intent.succeeded',
          data: {
            object: mockPaymentIntent as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Payment intent succeeded: pi_test123')
        )
      })

      it('should handle payment intent failed events', async () => {
        const mockPaymentIntent = {
          id: 'pi_test123',
          object: 'payment_intent',
          status: 'requires_payment_method',
          last_payment_error: {
            code: 'card_declined',
            message: 'Your card was declined.',
            type: 'card_error'
          }
        }

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'payment_intent.payment_failed',
          data: {
            object: mockPaymentIntent as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('Payment intent failed: pi_test123')
        )
      })
    })

    describe('Checkout Session Event Handlers', () => {
      it('should handle checkout session expired events', async () => {
        const mockSession = {
          id: 'cs_test123',
          object: 'checkout.session',
          mode: 'subscription',
          status: 'expired'
        }

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'checkout.session.expired',
          data: {
            object: mockSession as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Checkout session expired: cs_test123')
        )
      })
    })

    describe('Setup Intent Event Handlers', () => {
      it('should handle setup intent succeeded events', async () => {
        const mockSetupIntent = {
          id: 'seti_test123',
          object: 'setup_intent',
          status: 'succeeded',
          customer: 'cus_test123',
          payment_method: 'pm_test123'
        }

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'setup_intent.succeeded',
          data: {
            object: mockSetupIntent as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Setup intent succeeded: seti_test123')
        )
      })

      it('should handle setup intent failed events', async () => {
        const mockSetupIntent = {
          id: 'seti_test123',
          object: 'setup_intent',
          status: 'requires_payment_method',
          last_setup_error: {
            code: 'card_declined',
            message: 'Your card was declined.',
            type: 'card_error'
          }
        }

        const event: Stripe.Event = {
          id: 'evt_test123',
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: 'setup_intent.setup_failed',
          data: {
            object: mockSetupIntent as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        await webhookService.handleWebhookEvent(event)

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('Setup intent failed: seti_test123')
        )
      })
    })
  })

  describe('Event Idempotency', () => {
    it('should skip processing duplicate events', async () => {
      const mockSubscription = createMockStripeSubscription({
        id: 'sub_test123'
      })

      const event: Stripe.Event = {
        id: 'evt_duplicate123',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'customer.subscription.created',
        data: {
          object: mockSubscription as any,
          previous_attributes: {}
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      // Process event first time
      await webhookService.handleWebhookEvent(event)
      expect(mockBillingService.syncSubscriptionFromStripe).toHaveBeenCalledTimes(1)

      // Process same event again (should be skipped)
      await webhookService.handleWebhookEvent(event)
      expect(mockBillingService.syncSubscriptionFromStripe).toHaveBeenCalledTimes(1)
    })
  })

  describe('Event Type Coverage', () => {
    it('should handle all defined webhook event types', async () => {
      // Test that we have handlers for all event types defined in WEBHOOK_EVENT_TYPES
      const eventTypes = [
        'customer.created',
        'customer.updated', 
        'customer.deleted',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'customer.subscription.trial_will_end',
        'customer.subscription.paused',
        'customer.subscription.resumed',
        'invoice.created',
        'invoice.finalized',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'invoice.payment_action_required',
        'invoice.upcoming',
        'payment_intent.created',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.requires_action',
        'charge.failed',
        'checkout.session.completed',
        'checkout.session.expired',
        'setup_intent.succeeded',
        'setup_intent.setup_failed'
      ]

      for (const eventType of eventTypes) {
        const event: Stripe.Event = {
          id: `evt_test_${eventType.replace(/\./g, '_')}`,
          object: 'event',
          created: Math.floor(Date.now() / 1000),
          type: eventType as any,
          data: {
            object: { id: 'test_object' } as any,
            previous_attributes: {}
          },
          api_version: '2024-06-20',
          livemode: false,
          pending_webhooks: 1,
          request: {
            id: 'req_test123',
            idempotency_key: null
          }
        }

        // Should not throw for any supported event type
        await expect(webhookService.handleWebhookEvent(event)).resolves.not.toThrow()
      }
    })

    it('should log unsupported event types without throwing', async () => {
      const event: Stripe.Event = {
        id: 'evt_unsupported',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'account.updated' as any, // Unsupported event type
        data: {
          object: { id: 'acct_test' } as any,
          previous_attributes: {}
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      await webhookService.handleWebhookEvent(event)

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('No handler for event type: account.updated')
      )
    })
  })

  describe('Event Emitter Integration', () => {
    it('should emit payment method required events', async () => {
      const mockSubscription = createMockStripeSubscription({
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'trialing'
      })

      const mockDbSubscription = {
        id: 'sub_db_123',
        stripeSubscriptionId: 'sub_test123',
        User: {
          id: 'user123',
          email: 'user@example.com',
          name: 'Test User'
        },
        planType: 'STARTER',
        trialEnd: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }

      const mockCustomer = createMockStripeCustomer({
        id: 'cus_test123',
        default_source: null,
        invoice_settings: { 
          default_payment_method: null,
          custom_fields: null,
          footer: null,
          rendering_options: null
        }
      })

      mockPrismaService.subscription.findUnique.mockResolvedValue(mockDbSubscription)
      mockStripeService.client.customers.retrieve.mockResolvedValue(mockCustomer)

      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'customer.subscription.trial_will_end',
        data: {
          object: mockSubscription as any,
          previous_attributes: {}
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      await webhookService.handleWebhookEvent(event)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        SubscriptionEventType.PAYMENT_METHOD_REQUIRED,
        expect.objectContaining({
          userId: 'user123',
          subscriptionId: 'sub_test123',
          reason: 'TRIAL_ENDED_WITHOUT_PAYMENT'
        })
      )
    })

    it('should emit feature access restriction events', async () => {
      const mockInvoice = createMockStripeInvoice({
        id: 'in_test123',
        attempt_count: 3,
        amount_due: 1900,
        currency: 'usd'
      })

      const mockUpdatedSubscription = {
        id: 'sub_db_123',
        User: {
          id: 'user123',
          email: 'user@example.com'
        },
        planType: 'STARTER'
      }

      mockPrismaService.subscription.update.mockResolvedValue(mockUpdatedSubscription)

      const event: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        created: Math.floor(Date.now() / 1000),
        type: 'invoice.payment_failed',
        data: {
          object: mockInvoice as any,
          previous_attributes: {}
        },
        api_version: '2024-06-20',
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        }
      }

      await webhookService.handleWebhookEvent(event)

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        SubscriptionEventType.FEATURE_ACCESS_RESTRICT,
        expect.objectContaining({
          userId: 'user123',
          reason: 'PAYMENT_FAILED'
        })
      )
    })
  })
})