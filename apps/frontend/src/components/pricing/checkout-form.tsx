'use client'

import { createPaymentIntent } from '@/lib/stripe-client'
import { useSpring } from '@react-spring/core'
import { animated } from '@react-spring/web'
import {
	ExpressCheckoutElement,
	PaymentElement,
	useElements,
	useStripe
} from '@stripe/react-stripe-js'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

// UI Components
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// Design System
import {
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE,
	animationClasses,
	badgeClasses,
	buttonClasses,
	cardClasses,
	cn
} from '@/lib/utils'

// MagicUI Components
import { GlowingEffect } from '@/components/magicui/glowing-effect'
import { LoadingDots } from '@/components/magicui/loading-spinner'
import { MagicCard } from '@/components/magicui/magic-card'

// Icons
import {
	AlertTriangle,
	CheckCircle2,
	CreditCard,
	Lock,
	RefreshCw,
	Shield,
	Smartphone,
	TrendingUp,
	Users
} from 'lucide-react'

// Types
import type {
	CreatePaymentIntentRequest,
	ExtendedCheckoutFormProps
} from '@repo/shared'

interface CreatePaymentIntentResponse {
	clientSecret: string
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
}: ExtendedCheckoutFormProps) {
	const stripe = useStripe()
	const elements = useElements()

	// Component State
	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState<string>('')
	const [paymentStatus, setPaymentStatus] = useState<
		'idle' | 'processing' | 'succeeded' | 'failed'
	>('idle')

	// React Spring Animations
	const [containerSpring, containerApi] = useSpring(() => ({
		opacity: 0,
		transform: 'translateY(20px)',
		config: { tension: 300, friction: 30 }
	}))

	const [errorSpring, errorApi] = useSpring(() => ({
		opacity: 0,
		scale: 0.95,
		config: { tension: 400, friction: 25 }
	}))

	const [successSpring, successApi] = useSpring(() => ({
		opacity: 0,
		scale: 0.9,
		rotate: -5,
		config: { tension: 300, friction: 20 }
	}))

	// TanStack Query mutation for PaymentIntent creation
	const createPaymentIntentMutation = useMutation<
		CreatePaymentIntentResponse,
		Error,
		CreatePaymentIntentRequest
	>({
		mutationFn: async request => {
			if (request.amount < 50) {
				throw new Error('Amount must be at least $0.50')
			}

			// Use our NestJS backend via stripe-client
			const result = await createPaymentIntent({
				amount: request.amount,
				currency: 'usd',
				metadata: {
					tenant_id:
						request.metadata?.tenant_id || request.metadata?.planId || '',
					property_id: request.metadata?.property_id || '',
					subscription_type:
						request.metadata?.subscription_type ||
						request.metadata?.planName ||
						''
				},
				customerEmail: request.metadata?.customerEmail
			})

			return result
		},
		onError: err => {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to initialize payment'
			setError(errorMessage)
			errorApi.start({ opacity: 1, scale: 1 })
			onError?.(err)
			toast.error('Payment initialization failed', {
				description: errorMessage
			})
		},
		onSuccess: () => {
			setError('')
			errorApi.start({ opacity: 0, scale: 0.95 })
			containerApi.start({ opacity: 1, transform: 'translateY(0px)' })
		}
	})

	// Initialize payment intent on user action - follows KISS principle
	const initializePayment = useCallback(() => {
		if (
			!createPaymentIntentMutation.isPending &&
			!createPaymentIntentMutation.data
		) {
			createPaymentIntentMutation.mutate({
				amount,
				currency,
				metadata,
				customerEmail
			})
		}
	}, [amount, currency, metadata, customerEmail, createPaymentIntentMutation])

	// Format amount for display
	const formatAmount = useCallback(
		(cents: number) => {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: currency.toUpperCase()
			}).format(cents / 100)
		},
		[currency]
	)

	// Payment submission handler with full lifecycle management
	const handlePaymentSubmit = useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault()

			if (
				!stripe ||
				!elements ||
				!createPaymentIntentMutation.data?.clientSecret
			) {
				setError('Payment system not ready. Please try again.')
				return
			}

			setIsProcessing(true)
			setPaymentStatus('processing')
			setError('')

			try {
				// Confirm payment with comprehensive error handling
				const { error: submitError, paymentIntent } =
					await stripe.confirmPayment({
						elements,
						confirmParams: {
							return_url: `${window.location.origin}/pricing/success`,
							receipt_email: customerEmail
						},
						redirect: 'if_required'
					})

				if (submitError) {
					// Handle Stripe-specific errors
					setPaymentStatus('failed')
					let errorMessage = submitError.message || 'Payment failed'

					// Enhanced error messages based on error codes
					switch (submitError.code) {
						case 'card_declined':
							errorMessage =
								'Your card was declined. Please try a different payment method.'
							break
						case 'expired_card':
							errorMessage =
								'Your card has expired. Please use a different card.'
							break
						case 'insufficient_funds':
							errorMessage =
								'Insufficient funds. Please use a different payment method.'
							break
						case 'authentication_required':
							errorMessage =
								'Authentication required. Please complete the verification and try again.'
							break
						case 'processing_error':
							errorMessage = 'Processing error occurred. Please try again.'
							break
					}

					setError(errorMessage)
					errorApi.start({ opacity: 1, scale: 1 })
					const error = new Error(errorMessage)
					error.name = 'StripeError'
					onError?.(error)
					toast.error('Payment failed', { description: errorMessage })
				} else if (paymentIntent) {
					// Handle successful PaymentIntent lifecycle states
					switch (paymentIntent.status) {
						case 'succeeded':
							setPaymentStatus('succeeded')
							successApi.start({
								opacity: 1,
								scale: 1,
								rotate: 0,
								config: { tension: 200, friction: 15 }
							})
							onSuccess?.()
							toast.success('Payment successful!', {
								description: `Payment of ${formatAmount(amount)} completed successfully.`
							})
							break
						case 'processing':
							setError(
								'Payment is processing. You will receive a confirmation email when complete.'
							)
							toast.info('Payment processing', {
								description: 'Your payment is being processed. Please wait.'
							})
							break
						case 'requires_payment_method':
							setPaymentStatus('failed')
							setError('Payment failed. Please try a different payment method.')
							break
						case 'requires_action':
							setError(
								'Additional authentication required. Please complete the verification.'
							)
							toast.info('Additional verification required')
							break
						default:
							setError(`Payment status: ${paymentIntent.status}`)
					}
				}
			} catch (err) {
				setPaymentStatus('failed')
				const errorMessage =
					err instanceof Error ? err.message : 'An unexpected error occurred'
				setError(errorMessage)
				errorApi.start({ opacity: 1, scale: 1 })
				onError?.(err instanceof Error ? err : new Error(errorMessage))
				toast.error('Payment error', { description: errorMessage })
			} finally {
				setIsProcessing(false)
			}
		},
		[
			stripe,
			elements,
			createPaymentIntentMutation.data,
			customerEmail,
			amount,
			onSuccess,
			onError,
			successApi,
			errorApi,
			formatAmount
		]
	)

	// Express Checkout (Apple Pay, Google Pay, etc.) handler
	const handleExpressCheckout = useCallback(async () => {
		// Express checkout event received
		setIsProcessing(true)
		setPaymentStatus('processing')

		try {
			const { error } = await stripe!.confirmPayment({
				elements: elements!,
				confirmParams: {
					return_url: `${window.location.origin}/pricing/success`
				},
				redirect: 'if_required'
			})

			if (error) {
				setPaymentStatus('failed')
				setError(error.message || 'Express checkout failed')
				toast.error('Express payment failed')
			}
		} catch {
			setPaymentStatus('failed')
			setError('Express checkout error')
		} finally {
			setIsProcessing(false)
		}
	}, [stripe, elements])

	// Retry payment function
	const retryPayment = useCallback(() => {
		setError('')
		setPaymentStatus('idle')
		errorApi.start({ opacity: 0, scale: 0.95 })
		createPaymentIntentMutation.reset()
		createPaymentIntentMutation.mutate({
			amount,
			currency,
			metadata,
			customerEmail
		})
	}, [
		amount,
		currency,
		metadata,
		customerEmail,
		createPaymentIntentMutation,
		errorApi
	])

	// Initial state - prompt user to begin checkout (no useEffect!)
	if (
		!createPaymentIntentMutation.data &&
		!createPaymentIntentMutation.isPending &&
		!createPaymentIntentMutation.isError
	) {
		return (
			<animated.div style={containerSpring}>
				<MagicCard
					className={cn(
						cardClasses('elevated'),
						'w-full max-w-lg mx-auto p-8 shadow-2xl border-2',
						animationClasses('fade-in')
					)}
				>
					<div className="flex flex-col items-center justify-center space-y-6">
						<div className="relative">
							<div className="bg-primary/10 p-4 rounded-full">
								<Shield className="h-10 w-10 text-primary" />
							</div>
						</div>

						<div className="text-center space-y-4">
							<h3
								className="font-bold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight
								}}
							>
								Ready to Complete Your Purchase
							</h3>

							{planName && (
								<div className="bg-muted/30 rounded-xl p-4 border">
									<p className="font-semibold text-foreground">{planName}</p>
									<p className="text-2xl font-bold text-primary mt-1">
										{formatAmount(amount)}
									</p>
								</div>
							)}

							<p className="text-base text-muted-foreground leading-relaxed max-w-sm">
								Click below to begin secure checkout. Your payment information
								is encrypted and protected.
							</p>

							{showTrustSignals && business.trustSignals && (
								<div className="flex flex-wrap justify-center gap-2 pt-2">
									{business.trustSignals.map(
										(
											signal: string | { text: string; icon?: string },
											index: number
										) => (
											<span
												key={index}
												className={badgeClasses(
													'secondary',
													'sm',
													'text-xs font-medium'
												)}
											>
												{typeof signal === 'string' ? signal : signal.text}
											</span>
										)
									)}
								</div>
							)}
						</div>

						<Button
							onClick={initializePayment}
							size="lg"
							className={cn(
								buttonClasses('primary', 'lg'),
								'w-full max-w-xs hover:scale-105 transition-transform'
							)}
						>
							<Lock className="w-4 h-4 mr-2" />
							Begin Secure Checkout
						</Button>

						<p className="text-xs text-muted-foreground text-center">
							Powered by Stripe • 256-bit encryption
						</p>
					</div>
				</MagicCard>
			</animated.div>
		)
	}

	// Loading state only when actively creating payment intent
	if (createPaymentIntentMutation.isPending) {
		return (
			<MagicCard
				className={cn(
					cardClasses('elevated'),
					'w-full max-w-lg mx-auto card-padding shadow-2xl border-2',
					animationClasses('fade-in')
				)}
			>
				<div className="flex flex-col items-center justify-center space-y-6 py-8">
					<div className="relative">
						<div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
						<div className="relative bg-primary/10 p-4 rounded-full">
							<Lock className="h-8 w-8 text-primary animate-pulse" />
						</div>
					</div>

					<div className="text-center space-y-3">
						<h3
							className="font-bold text-foreground"
							style={{
								fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight
							}}
						>
							Secure Payment Setup
						</h3>
						<p className="text-base text-muted-foreground leading-relaxed max-w-sm">
							Initializing bank-grade encryption for your payment...
						</p>

						{showTrustSignals && business.trustSignals && (
							<div className="flex flex-wrap justify-center gap-2 pt-4">
								{business.trustSignals.map(
									(
										signal: string | { text: string; icon?: string },
										index: number
									) => (
										<span
											key={index}
											className={badgeClasses(
												'secondary',
												'sm',
												'text-xs font-medium'
											)}
										>
											{typeof signal === 'string' ? signal : signal.text}
										</span>
									)
								)}
							</div>
						)}
					</div>

					<LoadingDots size="lg" variant="primary" />
				</div>
			</MagicCard>
		)
	}

	// Error state with retry functionality
	if (
		createPaymentIntentMutation.isError &&
		!(createPaymentIntentMutation.data as unknown as { clientSecret?: string })
			?.clientSecret
	) {
		return (
			<animated.div style={errorSpring}>
				<MagicCard
					className={cn(
						cardClasses(),
						'w-full max-w-md mx-auto p-6 border-destructive/30 shadow-xl'
					)}
				>
					<div className="text-center space-y-6">
						<div
							className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto"
							style={{
								animation: `bounceIn ${ANIMATION_DURATIONS.default} ease-out`
							}}
						>
							<AlertTriangle className="h-8 w-8 text-destructive" />
						</div>
						<div className="space-y-2">
							<h3
								className="font-bold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight
								}}
							>
								Payment Setup Failed
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
								{error ||
									createPaymentIntentMutation.error?.message ||
									'Unable to initialize payment'}
							</p>
						</div>
						<Button
							onClick={retryPayment}
							className={cn(
								buttonClasses('primary', 'sm'),
								'w-full hover:scale-105'
							)}
							size="sm"
							style={{}}
						>
							<RefreshCw className="w-4 h-4 mr-2" />
							Try Again
						</Button>
					</div>
				</MagicCard>
			</animated.div>
		)
	}

	// Success state
	if (paymentStatus === 'succeeded') {
		return (
			<animated.div style={successSpring}>
				<MagicCard
					className={cn(
						cardClasses(),
						'w-full max-w-md mx-auto p-6 border-accent/30 shadow-xl'
					)}
				>
					<div className="text-center space-y-6">
						<div
							className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mx-auto"
							style={{
								animation: `bounceIn ${ANIMATION_DURATIONS.default} ease-out`
							}}
						>
							<CheckCircle2 className="h-8 w-8 text-accent" />
						</div>
						<div className="space-y-2">
							<h3
								className="font-bold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight
								}}
							>
								Payment Successful!
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
								Your payment of {formatAmount(amount)} has been processed
								successfully.
							</p>
						</div>
					</div>
				</MagicCard>
			</animated.div>
		)
	}

	// Main checkout form
	return (
		<animated.div style={containerSpring}>
			<MagicCard
				className={cn(
					cardClasses('elevated'),
					'w-full max-w-lg mx-auto relative overflow-hidden shadow-2xl border-2'
				)}
			>
				<GlowingEffect children={undefined} />

				<CardHeader className={cn('pb-6', animationClasses('slide-down'))}>
					<div className="text-center space-y-4">
						<div className="flex items-center justify-center gap-3">
							<div className="bg-primary/10 p-3 rounded-xl">
								<CreditCard className="h-6 w-6 text-primary" />
							</div>
							<CardTitle
								className="font-bold tracking-tight"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight
								}}
							>
								Secure Checkout
							</CardTitle>
						</div>

						{/* Plan Summary */}
						<div className="bg-muted/30 rounded-xl p-4 border">
							<div className="flex items-center justify-between">
								<div className="text-left">
									{planName && (
										<p className="font-semibold text-foreground">{planName}</p>
									)}
									<p className="text-sm text-muted-foreground">
										{business.name}{' '}
										{business.description && `• ${business.description}`}
									</p>
								</div>
								<div className="text-right">
									<p className="font-bold text-xl text-primary">
										{formatAmount(amount)}
									</p>
									<p className="text-xs text-muted-foreground">
										One-time payment
									</p>
								</div>
							</div>
						</div>

						{/* Features Preview */}
						{features.length > 0 && (
							<div className="space-y-2">
								<p className="text-sm font-medium text-muted-foreground">
									What's included:
								</p>
								<div className="grid grid-cols-1 gap-1">
									{features
										.slice(0, 3)
										.map(
											(
												feature: string | { text: string; included: boolean },
												index: number
											) => (
												<div
													key={index}
													className="flex items-center gap-2 text-sm"
												>
													<CheckCircle2 className="h-3 w-3 text-accent flex-shrink-0" />
													<span className="text-muted-foreground">
														{typeof feature === 'string'
															? feature
															: feature.text}
													</span>
												</div>
											)
										)}
									{features.length > 3 && (
										<p className="text-xs text-muted-foreground pl-5">
											+{features.length - 3} more features
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</CardHeader>

				<CardContent
					className="space-y-6"
					style={{
						animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
					}}
				>
					{/* Express Checkout Section */}
					{enableExpressCheckout &&
						createPaymentIntentMutation.data?.clientSecret && (
							<div
								className="space-y-4"
								style={{
									animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`
								}}
							>
								<div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
									<div className="bg-muted/30 p-1.5 rounded-md">
										<Smartphone className="h-4 w-4" />
									</div>
									Express Checkout
								</div>
								<div className="relative">
									<ExpressCheckoutElement
										onConfirm={handleExpressCheckout}
										options={{
											paymentMethods: {
												applePay: 'always',
												googlePay: 'always',
												link: 'auto'
											},
											buttonHeight: 44
										}}
									/>
								</div>
								<div className="relative">
									<Separator />
									<div className="absolute inset-0 flex items-center justify-center">
										<span className="bg-background px-2 text-xs text-muted-foreground">
											or pay with card
										</span>
									</div>
								</div>
							</div>
						)}

					{/* Payment Form */}
					<form onSubmit={handlePaymentSubmit} className="space-y-4">
						{/* Payment Element Container */}
						<div className="relative">
							<PaymentElement
								options={{
									layout: 'tabs',
									paymentMethodOrder: [
										'card',
										'apple_pay',
										'google_pay',
										'link'
									],
									business: { name: business.name },
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

						{/* Error Display */}
						{error && (
							<animated.div style={errorSpring}>
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							</animated.div>
						)}

						{/* Submit Button */}
						<Button
							type="submit"
							disabled={
								!stripe ||
								!createPaymentIntentMutation.data?.clientSecret ||
								isProcessing ||
								paymentStatus === 'processing'
							}
							className="w-full h-12 text-base font-semibold"
							style={{
								background: isProcessing
									? 'var(--color-primary-brand-85)'
									: 'var(--color-primary-brand)',
								color: 'white',
								border: 'none',
								borderRadius: 'var(--radius-medium)',
								transition: 'all var(--duration-quick) var(--ease-smooth)'
							}}
						>
							{isProcessing || paymentStatus === 'processing'
								? 'Processing Payment...'
								: `Pay ${formatAmount(amount)}`}
						</Button>
					</form>

					{/* Enhanced Security Notice & Trust Signals */}
					{showSecurityNotice && (
						<div className="space-y-4">
							<div className="bg-muted/20 rounded-lg p-4 border border-muted/40">
								<div className="flex items-center justify-center gap-2 mb-3">
									<Shield className="h-4 w-4 text-accent" />
									<span className="text-sm font-semibold text-foreground">
										Bank-Level Security
									</span>
								</div>
								<div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
									<div className="flex items-center gap-2">
										<Lock className="h-3 w-3 text-primary" />
										<span>256-bit SSL encryption</span>
									</div>
									<div className="flex items-center gap-2">
										<Shield className="h-3 w-3 text-accent" />
										<span>PCI DSS compliant</span>
									</div>
									<div className="flex items-center gap-2">
										<CheckCircle2 className="h-3 w-3 text-primary" />
										<span>Powered by Stripe</span>
									</div>
									<div className="flex items-center gap-2">
										<TrendingUp className="h-3 w-3 text-accent" />
										<span>Growing customer base</span>
									</div>
									<div className="flex items-center gap-2">
										<Users className="h-3 w-3 text-primary" />
										<span>10,000+ active users</span>
									</div>
								</div>
							</div>

							{showTrustSignals && business.trustSignals && (
								<div className="text-center">
									<p className="text-xs text-muted-foreground mb-2">
										Trusted by property managers worldwide
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										{business.trustSignals
											.slice(0, 2)
											.map((signal: string, index: number) => (
												<span
													key={index}
													className={badgeClasses('outline', 'sm', 'text-xs')}
												>
													{signal}
												</span>
											))}
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</MagicCard>
		</animated.div>
	)
}
