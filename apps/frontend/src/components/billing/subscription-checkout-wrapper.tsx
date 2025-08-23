import { SubscriptionCheckout } from './subscription-checkout'
import type { PLAN_TYPE } from '@repo/shared'

interface SubscriptionCheckoutWrapperProps {
	planType: keyof typeof PLAN_TYPE
	billingInterval: 'monthly' | 'annual'
	onSuccess?: (_subscriptionId: string) => void
	onCancel?: () => void
}

/**
 * Simplified Subscription Checkout Wrapper (2025)
 * 
 * With the new Confirmation Token pattern, this wrapper simply passes through
 * to the main SubscriptionCheckout component. The complex initialization logic
 * is no longer needed as Stripe Elements handles everything natively.
 */
export function SubscriptionCheckoutWrapper({
	planType,
	billingInterval,
	onSuccess,
	onCancel
}: SubscriptionCheckoutWrapperProps) {
	return (
		<SubscriptionCheckout
			planType={planType}
			billingInterval={billingInterval}
			onSuccess={onSuccess}
			onCancel={onCancel}
		/>
	)
}
