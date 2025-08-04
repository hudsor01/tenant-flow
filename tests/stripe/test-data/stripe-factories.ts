import type Stripe from 'stripe'

/**
 * Stripe Test Data Factories
 * 
 * Provides factory functions to create mock Stripe objects for testing.
 * These factories create realistic mock data that matches Stripe's API structure.
 */

// ========================
// Test Card Numbers
// ========================

export const TEST_CARD_NUMBERS = {
  // Successful test cards
  VISA_SUCCESS: '4242424242424242',
  VISA_DEBIT_SUCCESS: '4000056655665556',
  MASTERCARD_SUCCESS: '5555555555554444',
  AMEX_SUCCESS: '378282246310005',
  
  // Declined test cards
  GENERIC_DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  LOST_CARD: '4000000000009987',
  STOLEN_CARD: '4000000000009979',
  EXPIRED_CARD: '4000000000000069',
  INCORRECT_CVC: '4000000000000127',
  PROCESSING_ERROR: '4000000000000119',
  INCORRECT_NUMBER: '4242424242424241',
  
  // 3D Secure cards
  VISA_3DS_SUCCESS: '4000000000003220',
  VISA_3DS_FAILED: '4000000000003063',
  
  // International cards
  VISA_DEBIT_INTERNATIONAL: '4000000760000002',
  MASTERCARD_PREPAID: '5200828282828210',
  
  // Special behavior cards
  CARD_DECLINED: '4000000000000002',
  CHARGE_EXCEEDS_LIMIT: '4000000000000259',
  FRAUD_PREVENTION: '4100000000000019'
} as const

// ========================
// Test Plan Configurations
// ========================

export const TEST_PLAN_CONFIGS = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    price: 0,
    propertyLimit: 1,
    stripeMonthlyPriceId: null,
    stripeAnnualPriceId: null
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: 19,
    propertyLimit: 5,
    stripeMonthlyPriceId: 'price_starter_monthly_test',
    stripeAnnualPriceId: 'price_starter_annual_test'
  },
  GROWTH: {
    id: 'GROWTH',
    name: 'Growth',
    price: 49,
    propertyLimit: 25,
    stripeMonthlyPriceId: 'price_growth_monthly_test',
    stripeAnnualPriceId: 'price_growth_annual_test'
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 149,
    propertyLimit: -1,
    stripeMonthlyPriceId: 'price_enterprise_monthly_test',
    stripeAnnualPriceId: 'price_enterprise_annual_test'
  }
} as const

/**
 * Create a mock Stripe Customer
 */
export function createMockStripeCustomer(overrides: Partial<Stripe.Customer> = {}): Stripe.Customer {
  const defaultCustomer: Stripe.Customer = {
    id: `cus_test_${Date.now()}`,
    object: 'customer',
    created: Math.floor(Date.now() / 1000),
    email: 'test@example.com',
    name: 'Test Customer',
    phone: '+1234567890',
    description: 'Test customer for unit tests',
    address: {
      line1: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      postal_code: '12345',
      country: 'US'
    },
    balance: 0,
    currency: 'usd',
    default_source: null,
    deleted: false,
    delinquent: false,
    discount: null,
    invoice_prefix: 'TEST',
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null
    },
    livemode: false,
    metadata: {
      testEnvironment: 'true'
    },
    next_invoice_sequence: 1,
    preferred_locales: ['en'],
    shipping: null,
    sources: {
      object: 'list',
      data: [],
      has_more: false,
      url: `/v1/customers/cus_test_${Date.now()}/sources`
    },
    subscriptions: {
      object: 'list',
      data: [],
      has_more: false,
      url: `/v1/customers/cus_test_${Date.now()}/subscriptions`
    },
    tax_exempt: 'none',
    tax_ids: {
      object: 'list',
      data: [],
      has_more: false,
      url: `/v1/customers/cus_test_${Date.now()}/tax_ids`
    },
    tax_info: null,
    tax_info_verification: null,
    test_clock: null
  }

  return { ...defaultCustomer, ...overrides }
}

/**
 * Create a mock Stripe Subscription
 */
export function createMockStripeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000)
  const customerId = overrides.customer || `cus_test_${Date.now()}`
  const subscriptionId = overrides.id || `sub_test_${Date.now()}`
  
  const defaultSubscription: Stripe.Subscription = {
    id: subscriptionId,
    object: 'subscription',
    application: null,
    application_fee_percent: null,
    automatic_tax: {
      enabled: true,
      liability: {
        account: null,
        type: 'self'
      }
    },
    billing_cycle_anchor: now,
    billing_thresholds: null,
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    cancellation_details: {
      comment: null,
      feedback: null,
      reason: null
    },
    collection_method: 'charge_automatically',
    created: now,
    currency: 'usd',
    current_period_end: now + 30 * 24 * 60 * 60, // 30 days from now
    current_period_start: now,
    customer: customerId,
    days_until_due: null,
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    ended_at: null,
    invoice_settings: {
      issuer: {
        account: null,
        type: 'self'
      }
    },
    items: {
      object: 'list',
      data: [{
        id: `si_test_${Date.now()}`,
        object: 'subscription_item',
        billing_thresholds: null,
        created: now,
        metadata: {},
        price: {
          id: 'price_test_123',
          object: 'price',
          active: true,
          billing_scheme: 'per_unit',
          created: now,
          currency: 'usd',
          custom_unit_amount: null,
          livemode: false,
          lookup_key: null,
          metadata: {},
          nickname: null,
          product: 'prod_test_123',
          recurring: {
            aggregate_usage: null,
            interval: 'month',
            interval_count: 1,
            meter: null,
            trial_period_days: null,
            usage_type: 'licensed'
          },
          tax_behavior: 'unspecified',
          tiers_mode: null,
          transform_quantity: null,
          type: 'recurring',
          unit_amount: 1900,
          unit_amount_decimal: '1900'
        },
        quantity: 1,
        subscription: subscriptionId,
        tax_rates: []
      }],
      has_more: false,
      url: `/v1/subscription_items?subscription=${subscriptionId}`
    },
    latest_invoice: null,
    livemode: false,
    metadata: {
      testEnvironment: 'true'
    },
    next_pending_invoice_item_invoice: null,
    on_behalf_of: null,
    pause_collection: null,
    payment_settings: {
      payment_method_options: null,
      payment_method_types: null,
      save_default_payment_method: 'off'
    },
    pending_invoice_item_interval: null,
    pending_setup_intent: null,
    pending_update: null,
    quantity: 1,
    schedule: null,
    start_date: now,
    status: 'active',
    test_clock: null,
    transfer_data: null,
    trial_end: null,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'create_invoice'
      }
    },
    trial_start: null
  }

  return { ...defaultSubscription, ...overrides }
}

/**
 * Create a mock Stripe Checkout Session
 */
export function createMockStripeCheckoutSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  const now = Math.floor(Date.now() / 1000)
  const sessionId = overrides.id || `cs_test_${Date.now()}`
  
  return {
    id: sessionId,
    object: 'checkout.session',
    after_expiration: null,
    allow_promotion_codes: true,
    amount_subtotal: 1900,
    amount_total: 1900,
    automatic_tax: {
      enabled: true,
      liability: {
        account: null,
        type: 'self'
      },
      status: 'complete'
    },
    billing_address_collection: null,
    cancel_url: overrides.cancel_url || 'https://example.com/cancel',
    client_reference_id: null,
    client_secret: null,
    consent: null,
    consent_collection: null,
    created: now,
    currency: 'usd',
    currency_conversion: null,
    custom_fields: [],
    custom_text: {
      after_submit: null,
      shipping_address: null,
      submit: null,
      terms_of_service_acceptance: null
    },
    customer: overrides.customer || null,
    customer_creation: 'if_required',
    customer_details: {
      address: {
        city: null,
        country: 'US',
        line1: null,
        line2: null,
        postal_code: null,
        state: null
      },
      email: 'test@example.com',
      name: 'Test Customer',
      phone: null,
      tax_exempt: 'none',
      tax_ids: []
    },
    customer_email: 'test@example.com',
    expires_at: now + 24 * 60 * 60, // 24 hours from now
    invoice: null,
    invoice_creation: {
      enabled: false,
      invoice_data: {
        account_tax_ids: null,
        custom_fields: null,
        description: null,
        footer: null,
        issuer: null,
        metadata: {},
        rendering_options: null
      }
    },
    livemode: false,
    locale: 'en',
    metadata: {
      testEnvironment: 'true'
    },
    mode: 'subscription',
    payment_intent: null,
    payment_link: null,
    payment_method_collection: 'if_required',
    payment_method_configuration_details: null,
    payment_method_options: {
      card: {
        request_three_d_secure: 'automatic'
      }
    },
    payment_method_types: ['card'],
    payment_status: 'unpaid',
    phone_number_collection: {
      enabled: false
    },
    recovered_from: null,
    setup_intent: null,
    shipping_address_collection: null,
    shipping_cost: null,
    shipping_details: null,
    shipping_options: [],
    status: 'open',
    submit_type: null,
    subscription: null,
    success_url: overrides.success_url || 'https://example.com/success',
    total_details: {
      amount_discount: 0,
      amount_shipping: 0,
      amount_tax: 0
    },
    ui_mode: 'hosted',
    url: overrides.url || `https://checkout.stripe.com/pay/${sessionId}`,
    ...overrides
  } as Stripe.Checkout.Session
}

/**
 * Create test webhook event
 */
export function createMockWebhookEvent(
  type: string,
  data: any,
  previousAttributes: any = {}
): any {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    created: Math.floor(Date.now() / 1000),
    type,
    data: {
      object: data,
      previous_attributes: previousAttributes
    },
    api_version: '2024-06-20',
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: `req_test_${Date.now()}`,
      idempotency_key: null
    }
  }
}