/**
 * Stripe-related types
 */

// Subscription data from Stripe
export interface SubscriptionData {
	status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'
	planName: string
	currentPeriodEnd: string
	cancelAtPeriodEnd: boolean
}

// Stripe environment configuration
export interface StripeEnvironmentConfig {
	publishableKey: string
	secretKey?: string
	webhookSecret?: string
	products?: Record<string, string>
	prices?: Record<string, string>
}
