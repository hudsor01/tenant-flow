/**
 * Stripe Test Data Constants
 *
 * Official test values from Stripe documentation for use in integration and E2E tests.
 * These are PUBLIC test values - never use real card numbers or personal data.
 *
 * @see https://docs.stripe.com/testing
 * @see https://docs.stripe.com/connect/testing
 */

// =============================================================================
// CARD NUMBERS - For Payment Testing
// =============================================================================

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
	VISA: 'pm_card_visa',
	MASTERCARD: 'pm_card_mastercard',
	AMEX: 'pm_card_amex',
	DISCOVER: 'pm_card_discover',
	VISA_DEBIT: 'pm_card_visa_debit'
} as const

// Legacy tokens (deprecated but still work)
export const STRIPE_LEGACY_TOKENS = {
	VISA: 'tok_visa',
	MASTERCARD: 'tok_mastercard',
	AMEX: 'tok_amex'
} as const

// =============================================================================
// CARD CREDENTIALS - For Interactive Testing
// =============================================================================

export const STRIPE_TEST_CREDENTIALS = {
	// Use any future date
	EXPIRY: '12/34',
	// Any 3 digits (4 for AMEX)
	CVC: '123',
	CVC_AMEX: '1234',
	// Any 5-digit US ZIP
	ZIP: '12345'
} as const

// =============================================================================
// STRIPE CONNECT - For Property Owner Onboarding
// =============================================================================

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

// =============================================================================
// BANK ACCOUNTS - For Payout Testing
// =============================================================================

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

// =============================================================================
// CONNECT REQUIREMENTS TRIGGERS - Cards that trigger specific account states
// =============================================================================

export const STRIPE_CONNECT_TRIGGER_CARDS = {
	// Advances requirements to next state
	NEXT_REQUIREMENTS: '4000000000004202',
	// Blocks charges on account
	CHARGE_BLOCK: '4000000000004210',
	// Blocks payouts on account
	PAYOUT_BLOCK: '4000000000004236'
} as const

// =============================================================================
// WEBHOOK TESTING
// =============================================================================

export const STRIPE_WEBHOOK_TEST = {
	// Use Stripe CLI for local webhook testing:
	// stripe listen --forward-to localhost:4600/api/v1/stripe/webhook
	CLI_SECRET_PREFIX: 'whsec_',

	// Test event types that can be triggered via CLI:
	// stripe trigger payment_intent.succeeded
	// stripe trigger checkout.session.completed
	// stripe trigger account.updated
	COMMON_EVENTS: [
		'payment_intent.succeeded',
		'payment_intent.payment_failed',
		'checkout.session.completed',
		'customer.subscription.created',
		'customer.subscription.updated',
		'customer.subscription.deleted',
		'invoice.payment_failed',
		'account.updated'
	]
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
