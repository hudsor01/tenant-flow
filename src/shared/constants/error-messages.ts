/**
 * Shared Error Messages Constants
 *
 * Centralized error messages for the shared package.
 * Following DRY principle - single source of truth for error messages.
 */

export const SHARED_ERROR_MESSAGES = {
	// Billing errors
	DEFAULT_PLAN_NOT_FOUND: 'Default plan not found',

	// Configuration errors
	STRIPE_PRICE_ID_MISSING: (plan: string, period: string) =>
		`No Stripe price ID configured for plan: ${plan}, period: ${period}`,
	STRIPE_ENV_VAR_REQUIRED: (varName: string) => `${varName} is required`
} as const
