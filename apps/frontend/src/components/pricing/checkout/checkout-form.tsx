'use client'

import { CardContent, CardHeader } from '@/components/ui/card'
import { GlowingEffect } from '@/components/magicui/glowing-effect'
import { MagicCard } from '@/components/magicui/magic-card'
import { cn } from '@/lib/utils'
import { animated } from '@react-spring/web'
import { useElements, useStripe } from '@stripe/react-stripe-js'
import type { PaymentIntent, StripeError } from '@stripe/stripe-js'
import { useState } from 'react'
import { CheckoutHeader } from './checkout-header'
import { ErrorBanner } from './error-banner'
import { ExpressCheckout } from './express-checkout'
import { FeaturesPreview } from './features-preview'
import { LoadingOverlay } from './loading-overlay'
import { PaymentSection } from './payment-section'
import { PlanSummary } from './plan-summary'
import { SecurityTrust } from './security-trust'
import { SuccessConfirmation } from './success-confirmation'
import { useCheckout } from './use-checkout'
import { useCheckoutAnimations } from './use-checkout-animations'

interface CheckoutFormProps {
	amount: number
	currency?: string
	metadata?: Record<string, string>
	onSuccess?: (paymentIntent: PaymentIntent) => void
	onError?: (error: StripeError | Error) => void
	business?: {
		name: string
		logo?: string
		description?: string
		trustSignals?: string[]
	}
	customerEmail?: string
	enableExpressCheckout?: boolean
	showTrustSignals?: boolean
	showSecurityNotice?: boolean
	planName?: string
	features?: string[]
}

export function CheckoutForm({
	amount,
	currency = 'usd',
	metadata = {},
	onSuccess,
	onError,
	business = {
		name: 'TenantFlow',
		description: 'Modern Property Management Platform',
		trustSignals: [
			'SOC 2 Compliant',
			'99.9% Uptime',
			'10,000+ Properties Managed'
		]
	},
	customerEmail,
	enableExpressCheckout = true,
	showTrustSignals = true,
	showSecurityNotice = true,
	planName,
	features = []
}: CheckoutFormProps) {
	const stripe = useStripe()
	const elements = useElements()
	const [isProcessing, setIsProcessing] = useState(false)
	const [paymentStatus, setPaymentStatus] = useState<
		'idle' | 'processing' | 'succeeded' | 'failed'
	>('idle')

	const {
		clientSecret,
		isLoading,
		isProcessing: isPaymentProcessing,
		status,
		error,
		confirmPayment,
		reset,
		formatAmount
	} = useCheckout({
		amount,
		currency,
		metadata,
		customerEmail,
		onSuccess,
		onError
	})

	const { containerSpring, errorSpring, successSpring } =
		useCheckoutAnimations()

	// Loading state
	if (!stripe || isLoading) {
		return (
			<LoadingOverlay business={business} showTrustSignals={showTrustSignals} />
		)
	}

	// Error state
	if (error && status === 'failed') {
		return (
			<ErrorBanner error={error} onRetry={reset} errorSpring={errorSpring} />
		)
	}

	// Success state
	if (paymentStatus === 'succeeded' || status === 'succeeded') {
		return (
			<SuccessConfirmation
				amount={amount}
				formatAmount={formatAmount}
				successSpring={successSpring}
			/>
		)
	}

	// Main checkout form
	return (
		<animated.div style={containerSpring}>
			<MagicCard
				className={cn(
					'card',
					'w-full max-w-lg mx-auto relative overflow-hidden shadow-2xl border-2'
				)}
			>
				<GlowingEffect
					proximity={150}
					disabled={isProcessing || isPaymentProcessing}
					glow={!(isProcessing || isPaymentProcessing)}
				/>

				<CardHeader className="space-y-4">
					<CheckoutHeader business={business} />

					<PlanSummary
						planName={planName}
						business={business}
						amount={amount}
						currency={currency}
						formatAmount={formatAmount}
					/>

					<FeaturesPreview features={features} />
				</CardHeader>

				<CardContent className="space-y-6 animate-slide-in-from-bottom">
					{enableExpressCheckout && clientSecret && (
						<ExpressCheckout
							onConfirm={async () => {
								setIsProcessing(true)
								setPaymentStatus('processing')
								await confirmPayment()
								setIsProcessing(false)
							}}
						/>
					)}

					<PaymentSection
						clientSecret={clientSecret}
						stripe={stripe}
						elements={elements}
						isProcessing={isProcessing || isPaymentProcessing}
						paymentStatus={paymentStatus}
						error={error}
						errorSpring={errorSpring}
						onSubmit={async e => {
							e.preventDefault()
							setIsProcessing(true)
							setPaymentStatus('processing')
							await confirmPayment()
							setIsProcessing(false)
						}}
						amount={amount}
						formatAmount={formatAmount}
						business={business}
						customerEmail={customerEmail}
					/>

					{showSecurityNotice && (
						<SecurityTrust
							business={business}
							showTrustSignals={showTrustSignals}
						/>
					)}
				</CardContent>
			</MagicCard>
		</animated.div>
	)
}
