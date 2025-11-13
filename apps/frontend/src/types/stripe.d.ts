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

// Backend response from /stripe/verify-checkout-session
export interface StripeVerifyCheckoutSessionResponse {
	session: any; // Define more precisely if needed (e.g., Stripe.Checkout.Session)
	subscription: {
		id: string;
		status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
		current_period_end: number;
		cancel_at_period_end: boolean;
		items: Array<{
			price: {
				nickname?: string;
				product: string;
			};
		}>;
	};
}
