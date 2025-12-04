/**
 * Stripe Test Data Constants
 *
 * Official test values from Stripe documentation for use in integration and E2E tests.
 * These are PUBLIC test values - never use real card numbers or personal data.
 *
 * @see https://docs.stripe.com/testing
 * @see https://docs.stripe.com/connect/testing
 */

// CARD NUMBERS - For Payment Testing

export const STRIPE_TEST_CARDS = {
	// Successful payments
	SUCCESS: {
		VISA: '4242424242424242',
		VISA_DEBIT: '4000056655665556',
		MASTERCARD: '5555555555554444',
		AMEX: '378282246310005',
		DISCOVER: '6011111111111117',
		DINERS: '3056930009020004',
		JCB: '3566002020360505',
		UNIONPAY: '6200000000000005'
	},

	// Declined payments
	DECLINED: {
		GENERIC: '4000000000000002',
		INSUFFICIENT_FUNDS: '4000000000009995',
		LOST_CARD: '4000000000009987',
		STOLEN_CARD: '4000000000009979',
		EXPIRED_CARD: '4000000000000069',
		INCORRECT_CVC: '4000000000000127',
		PROCESSING_ERROR: '4000000000000119',
		FRAUD: '4100000000000019'
	},

	// 3D Secure / Authentication
	THREE_D_SECURE: {
		REQUIRED: '4000002500003155',
		REQUIRED_EVERY_TIME: '4000000000003063',
		SUPPORTED_NOT_REQUIRED: '4000000000003055',
		NOT_SUPPORTED: '378282246310005' // Same as AMEX
	},

	// Disputes & Chargebacks
	DISPUTES: {
		// Triggers a dispute immediately after charge succeeds
		FRAUDULENT: '4000000000000259',
		// Triggers an early fraud warning (EFW) - no dispute yet
		EARLY_FRAUD_WARNING: '4000000000005423',
		// Dispute with "product not received" reason
		PRODUCT_NOT_RECEIVED: '4000000000002685',
		// Dispute with "duplicate" reason
		DUPLICATE: '4000000000008809',
		// Dispute with "subscription canceled" reason
		SUBSCRIPTION_CANCELED: '4000000000003543',
		// Dispute where inquiry can be closed
		INQUIRY: '4000000000001976'
	},

	// Fraud Prevention / Radar
	RADAR: {
		// Highest risk - blocked based on rules
		HIGHEST_RISK: '4000000000004954',
		// Always blocked regardless of rules
		ALWAYS_BLOCKED: '4100000000000019',
		// Elevated risk - passes but flagged
		ELEVATED_RISK: '4000000000009235',
		// CVC check fails
		CVC_CHECK_FAIL: '4000000000000101',
		// Address check fails
		ADDRESS_CHECK_FAIL: '4000000000000028',
		// Both CVC and address check fail
		BOTH_CHECKS_FAIL: '4000000000000036'
	},

	// Country-specific (examples)
	BY_COUNTRY: {
		US: '4242424242424242',
		UK: '4000008260000000',
		DE: '4000002760000016',
		AU: '4000000360000006',
		CA: '4000001240000000'
	}
} as const

// PaymentMethod IDs (for API testing without card entry)
export const STRIPE_PAYMENT_METHOD_IDS = {
	// Successful cards
	VISA: 'pm_card_visa',
	MASTERCARD: 'pm_card_mastercard',
	AMEX: 'pm_card_amex',
	DISCOVER: 'pm_card_discover',
	VISA_DEBIT: 'pm_card_visa_debit',

	// Declined cards
	DECLINED: 'pm_card_chargeDeclined',
	DECLINED_INSUFFICIENT_FUNDS: 'pm_card_chargeDeclinedInsufficientFunds',
	DECLINED_LOST_CARD: 'pm_card_chargeDeclinedLostCard',
	DECLINED_STOLEN_CARD: 'pm_card_chargeDeclinedStolenCard',
	DECLINED_EXPIRED: 'pm_card_chargeDeclinedExpiredCard',
	DECLINED_INCORRECT_CVC: 'pm_card_chargeDeclinedIncorrectCvc',
	DECLINED_PROCESSING_ERROR: 'pm_card_chargeDeclinedProcessingError',

	// Fraud / Risk
	FRAUDULENT: 'pm_card_chargeDeclinedFraudulent',
	RISK_LEVEL_HIGHEST: 'pm_card_riskLevelHighest',
	RISK_LEVEL_ELEVATED: 'pm_card_riskLevelElevated',

	// Disputes
	DISPUTE_FRAUDULENT: 'pm_card_createDispute',
	DISPUTE_INQUIRY: 'pm_card_createDisputeInquiry',

	// 3D Secure
	THREE_D_SECURE_REQUIRED: 'pm_card_threeDSecureRequired'
} as const

// CARD CREDENTIALS - For Interactive Testing

export const STRIPE_TEST_CREDENTIALS = {
	// Use any future date
	EXPIRY: '12/34',
	// Any 3 digits (4 for AMEX)
	CVC: '123',
	CVC_AMEX: '1234',
	// Any 5-digit US ZIP
	ZIP: '12345'
} as const

// STRIPE CONNECT - For Property Owner Onboarding

export const STRIPE_CONNECT_TEST_DATA = {
	// Identity verification - Date of Birth
	DOB: {
		SUCCESS: { year: 1901, month: 1, day: 1 },
		IMMEDIATE_SUCCESS: { year: 1902, month: 1, day: 1 },
		OFAC_ALERT: { year: 1900, month: 1, day: 1 }
	},

	// Personal ID Numbers (SSN for US)
	SSN: {
		SUCCESS: '000000000',
		IMMEDIATE_SUCCESS: '222222222',
		MISMATCH: '111111111'
	},

	// Business Tax IDs (EIN for US)
	TAX_ID: {
		SUCCESS: '000000000',
		NON_PROFIT: '000000001',
		MISMATCH: '111111111',
		IMMEDIATE_SUCCESS: '222222222'
	},

	// Address verification tokens (use in address.line1)
	ADDRESS_TOKENS: {
		FULL_MATCH: 'address_full_match',
		NO_MATCH: 'address_no_match',
		LINE1_NO_MATCH: 'address_line1_no_match'
	},

	// Phone number validation
	PHONE: {
		SUCCESS: '0000000000'
	},

	// Document file tokens (for identity document uploads)
	DOCUMENT_TOKENS: {
		SUCCESS: 'file_identity_document_success',
		FAILURE: 'file_identity_document_failure'
	},

	// OAuth testing
	OAUTH: {
		TEST_CLIENT_ID: 'ca_FkyHCg7X8mlvCUdMDao4mMxagUfhIwXb',
		SMS_CODE: '000-000'
	}
} as const

// BANK ACCOUNTS - For Payout Testing

export const STRIPE_TEST_BANK_ACCOUNTS = {
	US: {
		// Auto-completes verification
		SUCCESS: {
			routing_number: '110000000',
			account_number: '000123456789'
		},
		// Requires document upload
		REQUIRES_DOCUMENT: {
			routing_number: '110000000',
			account_number: '000999999992'
		},
		// Auto-completes with specific ownership verification
		OWNERSHIP_VERIFIED: {
			routing_number: '110000000',
			account_number: '000999999991'
		}
	}
} as const

// Bank token test values
export const STRIPE_BANK_TOKENS = {
	SUCCESS: 'btok_us_verified',
	NO_ACCOUNT: 'btok_us_verified_noAccount',
	ACCOUNT_CLOSED: 'btok_us_verified_accountClosed',
	INSUFFICIENT_FUNDS: 'btok_us_verified_insufficientFunds',
	DEBIT_NOT_AUTHORIZED: 'btok_us_verified_debitNotAuthorized',
	INVALID_CURRENCY: 'btok_us_verified_invalidCurrency'
} as const

// CONNECT REQUIREMENTS TRIGGERS - Cards that trigger specific account states

export const STRIPE_CONNECT_TRIGGER_CARDS = {
	// Advances requirements to next state
	NEXT_REQUIREMENTS: '4000000000004202',
	// Blocks charges on account
	CHARGE_BLOCK: '4000000000004210',
	// Blocks payouts on account
	PAYOUT_BLOCK: '4000000000004236'
} as const

// WEBHOOK TESTING

export const STRIPE_WEBHOOK_TEST = {
	// Use Stripe CLI for local webhook testing:
	// stripe listen --forward-to localhost:4600/api/v1/stripe/webhook
	CLI_SECRET_PREFIX: 'whsec_',

	// Core payment events
	PAYMENT_EVENTS: [
		'payment_intent.created',
		'payment_intent.succeeded',
		'payment_intent.payment_failed',
		'payment_intent.canceled',
		'payment_intent.requires_action',
		'payment_method.attached',
		'payment_method.detached'
	],

	// Subscription/billing events
	SUBSCRIPTION_EVENTS: [
		'customer.created',
		'customer.subscription.created',
		'customer.subscription.updated',
		'customer.subscription.deleted',
		'customer.subscription.paused',
		'customer.subscription.resumed',
		'customer.subscription.trial_will_end',
		'invoice.created',
		'invoice.finalized',
		'invoice.paid',
		'invoice.payment_failed',
		'invoice.upcoming'
	],

	// Connect account events
	CONNECT_EVENTS: [
		'account.updated',
		'account.application.authorized',
		'account.application.deauthorized',
		'capability.updated',
		'payout.created',
		'payout.paid',
		'payout.failed',
		'transfer.created'
	],

	// Dispute & fraud events
	DISPUTE_EVENTS: [
		'charge.dispute.created',
		'charge.dispute.updated',
		'charge.dispute.closed',
		'charge.dispute.funds_withdrawn',
		'charge.dispute.funds_reinstated',
		'radar.early_fraud_warning.created',
		'radar.early_fraud_warning.updated',
		'review.opened',
		'review.closed'
	],

	// Checkout events
	CHECKOUT_EVENTS: [
		'checkout.session.completed',
		'checkout.session.expired',
		'checkout.session.async_payment_succeeded',
		'checkout.session.async_payment_failed'
	]
} as const

// All common events for quick reference
export const STRIPE_ALL_WEBHOOK_EVENTS = [
	...STRIPE_WEBHOOK_TEST.PAYMENT_EVENTS,
	...STRIPE_WEBHOOK_TEST.SUBSCRIPTION_EVENTS,
	...STRIPE_WEBHOOK_TEST.CONNECT_EVENTS,
	...STRIPE_WEBHOOK_TEST.DISPUTE_EVENTS,
	...STRIPE_WEBHOOK_TEST.CHECKOUT_EVENTS
] as const

// HELPER FUNCTIONS

/**
 * Get a random successful test card for variation in tests
 */
export function getRandomSuccessCard(): string {
	const cards = Object.values(STRIPE_TEST_CARDS.SUCCESS)
	return cards[Math.floor(Math.random() * cards.length)] as string
}

/**
 * Format card number with spaces (for UI testing)
 */
export function formatCardNumber(card: string): string {
	return card.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Get test DOB as ISO string
 */
export function getTestDOB(
	type: keyof typeof STRIPE_CONNECT_TEST_DATA.DOB = 'SUCCESS'
): string {
	const dob = STRIPE_CONNECT_TEST_DATA.DOB[type]
	return `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}`
}
