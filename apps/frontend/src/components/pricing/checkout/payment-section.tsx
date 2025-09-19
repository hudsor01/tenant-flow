'use client'

import type { SpringValue } from '@react-spring/web'
import { animated } from '@react-spring/web'
import { PaymentElement } from '@stripe/react-stripe-js'
import type { Stripe, StripeElements } from '@stripe/stripe-js'
import { AlertTriangle } from 'lucide-react'


interface Props {
	clientSecret?: string
	stripe: Stripe | null
	elements: StripeElements | null
	isProcessing: boolean
	paymentStatus: 'idle' | 'processing' | 'succeeded' | 'failed'
	error?: string
	errorSpring: { opacity: SpringValue<number>; scale: SpringValue<number> }
	onSubmit: (e: React.FormEvent) => void
	amount: number
	formatAmount: (cents: number) => string
	business?: {
		name: string
		description?: string
	}
	customerEmail?: string
}

export function PaymentSection({
	clientSecret,
	stripe,
	elements: _elements,
	isProcessing,
	paymentStatus,
	error,
	errorSpring,
	onSubmit,
	amount,
	formatAmount,
	business,
	customerEmail
}: Props) {
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="relative">
				<PaymentElement
					options={{
						layout: 'tabs',
						paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'link'],
						business: { name: business?.name || 'TenantFlow' },
						defaultValues: {
							billingDetails: {
								email: customerEmail || 'auto'
							}
						},
						fields: {
							billingDetails: {
								name: customerEmail ? 'auto' : 'never',
								email: customerEmail ? 'never' : 'auto',
								address: 'auto'
							}
						}
					}}
				/>
			</div>

			{error && (
				<animated.div style={errorSpring}>
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				</animated.div>
			)}

			<Button
				type="submit"
				disabled={
					!stripe ||
					!clientSecret ||
					isProcessing ||
					paymentStatus === 'processing'
				}
				className="w-full h-12 body-md font-semibold"
			>
				{isProcessing || paymentStatus === 'processing'
					? 'Processing Payment...'
					: `Pay ${formatAmount(amount)}`}
			</Button>
		</form>
	)
}
