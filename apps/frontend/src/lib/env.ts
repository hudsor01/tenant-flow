/**
 * Environment Configuration
 * Centralized configuration for environment variables with validation
 *
 * @deprecated This file is being phased out in favor of the new validated environment system.
 * Use `import { env } from '@/config/env'` instead.
 */

import type { StripeEnvironmentConfig } from '#types/stripe'
import { env } from '#config/env'

/**
 * Get Stripe configuration from validated environment variables
 *
 * @deprecated Use the new env system directly: `env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, etc.
 */
export function getStripeConfig(): StripeEnvironmentConfig {
	const prices = {
		...(env.STRIPE_STARTER_MONTHLY_PRICE_ID && { starter_monthly: env.STRIPE_STARTER_MONTHLY_PRICE_ID }),
		...(env.STRIPE_STARTER_ANNUAL_PRICE_ID && { starter_annual: env.STRIPE_STARTER_ANNUAL_PRICE_ID }),
		...(env.STRIPE_GROWTH_MONTHLY_PRICE_ID && { growth_monthly: env.STRIPE_GROWTH_MONTHLY_PRICE_ID }),
		...(env.STRIPE_GROWTH_ANNUAL_PRICE_ID && { growth_annual: env.STRIPE_GROWTH_ANNUAL_PRICE_ID }),
		...(env.STRIPE_MAX_MONTHLY_PRICE_ID && { max_monthly: env.STRIPE_MAX_MONTHLY_PRICE_ID }),
		...(env.STRIPE_MAX_ANNUAL_PRICE_ID && { max_annual: env.STRIPE_MAX_ANNUAL_PRICE_ID })
	}

	return {
		publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		...(Object.keys(prices).length > 0 && { prices }),
		products: {
			starter: 'prod_starter',
			growth: 'prod_growth',
			max: 'prod_max'
		}
	}
}
