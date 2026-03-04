'use client'

import { Elements } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { SetupFormInner } from './setup-form-inner'

// Load Stripe outside component render per official docs
const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface PaymentMethodSetupFormProps {
	onSuccess: (paymentMethodId: string) => void
	onError?: (error: Error) => void
}

/**
 * PaymentMethodSetupForm - Main component with Elements provider
 *
 * Per Stripe docs: loadStripe is called outside component to avoid
 * recreating the Stripe object on every render.
 */
export function PaymentMethodSetupForm({
	onSuccess,
	onError
}: PaymentMethodSetupFormProps) {
	const options: StripeElementsOptions = {
		mode: 'setup',
		appearance: {
			theme: 'stripe',
			labels: 'floating',
			variables: {
				colorPrimary: 'var(--color-primary)',
				colorBackground: 'var(--color-background)',
				colorText: 'var(--color-foreground)',
				colorDanger: 'var(--color-destructive)',
				colorTextSecondary: 'var(--color-muted-foreground)',
				colorTextPlaceholder: 'var(--color-muted-foreground)',
				fontFamily: 'var(--font-sans), system-ui, sans-serif',
				fontSizeBase: '14px',
				borderRadius: 'var(--radius)',
				focusBoxShadow: '0 0 0 2px var(--color-ring)',
				spacingUnit: '4px',
				spacingGridRow: '16px',
				spacingGridColumn: '16px'
			},
			rules: {
				'.Input': {
					boxShadow: 'var(--shadow-sm)',
					transition: 'box-shadow 0.15s ease'
				},
				'.Input:focus': {
					boxShadow: '0 0 0 2px var(--color-ring)'
				},
				'.Tab': {
					border: '1px solid var(--color-border)',
					backgroundColor: 'var(--color-muted)',
					color: 'var(--color-muted-foreground)'
				},
				'.Tab:hover': {
					backgroundColor: 'var(--color-accent)',
					color: 'var(--color-accent-foreground)'
				},
				'.Tab--selected': {
					backgroundColor: 'var(--color-primary)',
					color: 'var(--color-primary-foreground)'
				},
				'.AccordionItem': {
					border: '1px solid var(--color-border)',
					borderRadius: 'var(--radius)',
					backgroundColor: 'var(--color-card)'
				}
			}
		}
	}

	return (
		<Elements stripe={stripePromise} options={options}>
			<SetupFormInner onSuccess={onSuccess} {...(onError && { onError })} />
		</Elements>
	)
}
