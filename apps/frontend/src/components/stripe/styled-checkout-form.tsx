import { CheckoutForm } from './CheckoutForm'

interface StyledCheckoutFormProps {
	clientSecret: string
	onSuccess?: () => void
	onError?: (_error: string) => void
	returnUrl?: string
}

/**
 * StyledCheckoutForm Component
 *
 * Migrated to use the new CheckoutForm with CheckoutProvider API.
 * This maintains backward compatibility while using the modern Stripe implementation.
 *
 * Features:
 * - Modern Stripe Checkout API
 * - PaymentElement for flexible payment methods
 * - Built-in error handling
 * - Mobile-optimized responsive design
 * - Full PCI compliance
 * - Integrated with TenantFlow's design system
 *
 * @example
 * ```tsx
 * <StyledCheckoutForm
 *   clientSecret="cs_1234567890"
 *   returnUrl="/dashboard?subscription=success"
 *   onSuccess={() => logger.info('Payment completed', { component: 'components_stripe_styled_checkout_form.tsx' })}
 * />
 * ```
 */
export function StyledCheckoutForm({
	clientSecret,
	onSuccess,
	onError,
	returnUrl
}: StyledCheckoutFormProps) {
	// returnUrl is handled by the backend when creating the session
	// The new API doesn't need it passed here
	void returnUrl

	return (
		<CheckoutForm
			clientSecret={clientSecret}
			onSuccess={onSuccess}
			onError={onError}
			className="w-full"
		/>
	)
}
