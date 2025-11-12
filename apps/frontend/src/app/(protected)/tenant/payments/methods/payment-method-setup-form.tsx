'use client'

import { Spinner } from '#components/ui/spinner'
import {
	AddressElement,
	Elements,
	LinkAuthenticationElement,
	PaymentElement,
	PaymentRequestButtonElement,
	useElements,
	useStripe
} from '@stripe/react-stripe-js'
import type {
	PaymentRequest,
	StripeElementsOptions,
	StripeError
} from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@repo/shared/lib/frontend-logger'

import { Button } from '#components/ui/button'

const logger = createLogger({ component: 'PaymentMethodSetupForm' })

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface PaymentMethodSetupFormProps {
	onSuccess: (paymentMethodId: string) => void
	onError?: (error: Error) => void
}

/**
 * Inner form component that uses Stripe hooks
 * Must be wrapped in Elements provider
 */
function SetupForm({
	onSuccess,
	onError
}: {
	onSuccess: (paymentMethodId: string) => void
	onError?: (error: Error) => void
}) {
	const stripe = useStripe()
	const elements = useElements()
	const [isProcessing, setIsProcessing] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [elementReady, setElementReady] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
		null
	)
	const [canMakePayment, setCanMakePayment] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!stripe || !elements) {
			toast.error('Stripe not loaded')
			return
		}

		setIsProcessing(true)
		setError(null)

		try {
			// Step 1: Submit the form data for validation
			const { error: submitError } = await elements.submit()
			if (submitError) {
				setError(submitError.message || 'Please check your payment information')
				setIsProcessing(false)
				return
			}

			// Step 2: Create payment method directly using collected data
			const { paymentMethod, error: createError } =
				await stripe.createPaymentMethod({
					elements,
					params: {
						billing_details: {
							// Address details will be automatically included from Address Element
							// Email will be automatically included from Link Authentication Element
						}
					}
				})

			if (createError) {
				let errorMessage = 'Failed to create payment method'
				const stripeError = createError as StripeError
				switch (stripeError.type) {
					case 'card_error':
						errorMessage = stripeError.message || 'Card error occurred'
						break
					case 'validation_error':
						errorMessage =
							stripeError.message || 'Please check your payment information'
						break
					case 'invalid_request_error':
						errorMessage = 'Invalid payment request. Please try again.'
						logger.error('Invalid request error', { error: stripeError })
						break
					default:
						errorMessage = stripeError.message || errorMessage
						logger.error('Payment method creation error', {
							error: stripeError
						})
				}
				setError(errorMessage)
				onError?.(new Error(errorMessage))
				setIsProcessing(false)
				return
			}

			if (!paymentMethod) {
				const message =
					'Payment method creation failed - no payment method returned'
				setError(message)
				onError?.(new Error(message))
				setIsProcessing(false)
				return
			}

			// Step 3: Attach payment method to customer via backend
			const attachResponse = await fetch(
				'/api/v1/stripe/attach-tenant-payment-method',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
						// Include auth headers as needed
					},
					body: JSON.stringify({
						payment_method_id: paymentMethod.id,
						set_as_default: true // Set as default for new payment methods
					})
				}
			)

			const attachResult = await attachResponse.json()

			if (!attachResult.success) {
				setError(attachResult.error || 'Failed to save payment method')
				onError?.(
					new Error(attachResult.error || 'Failed to save payment method')
				)
				setIsProcessing(false)
				return
			}

			toast.success('Payment method saved successfully')
			onSuccess(paymentMethod.id)
		} catch (err) {
			const error = err as Error
			const message = error.message || 'An unexpected error occurred'
			setError(message)
			toast.error(message)
			onError?.(error)
		} finally {
			setIsProcessing(false)
		}
	}

	// Initialize Payment Request for Apple Pay / Google Pay
	useEffect(() => {
		if (!stripe) return

		const pr = stripe.paymentRequest({
			country: 'US',
			currency: 'usd',
			total: {
				label: 'Payment Method Setup',
				amount: 0 // $0 for setup
			},
			requestPayerName: true,
			requestPayerEmail: true
		})

		pr.canMakePayment().then(result => {
			setCanMakePayment(!!result)
		})

		pr.on('paymentmethod', async event => {
			// Handle the payment method creation from wallet
			try {
				// Attach the payment method to customer
				const attachResponse = await fetch(
					'/api/v1/stripe/attach-tenant-payment-method',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							payment_method_id: event.paymentMethod.id,
							set_as_default: true
						})
					}
				)

				const attachResult = await attachResponse.json()

				if (attachResult.success) {
					toast.success('Payment method saved successfully')
					onSuccess(event.paymentMethod.id)
					event.complete('success')
				} else {
					toast.error('Failed to save payment method')
					event.complete('fail')
				}
			} catch {
				toast.error('Failed to save payment method')
				event.complete('fail')
			}
		})

		setPaymentRequest(pr)
	}, [stripe, onSuccess])

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Stripe's pre-built Payment Element - handles card + ACH + validation */}
			<PaymentElement
				options={{
					layout: {
						type: 'accordion',
						defaultCollapsed: false,
						spacedAccordionItems: true
					},
					paymentMethodOrder: ['card', 'us_bank_account'], // Modern: Support both card and ACH
					fields: {
						billingDetails: {
							name: 'never', // Handled by Address Element
							email: 'never', // Handled by Link Authentication Element
							phone: 'never',
							address: 'never' // Handled by Address Element
						}
					},
					wallets: {
						applePay: 'auto',
						googlePay: 'auto'
					},
					terms: {
						applePay: 'never',
						googlePay: 'never'
						// Link terms are shown automatically when needed
					},
					business: {
						name: 'TenantFlow'
					}
				}}
				onReady={() => {
					setIsLoading(false)
					setElementReady(true)
				}}
				onLoadError={event => {
					logger.error('Payment Element failed to load', { event })
					toast.error('Failed to load payment form')
					setIsLoading(false)
				}}
				onLoaderStart={() => {
					setIsLoading(true)
				}}
				onChange={event => {
					// Handle form validation state changes if needed
					if (event.complete) {
						// Form is complete and valid
					}
				}}
			/>

			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-foreground">
						Email address
					</label>
					<LinkAuthenticationElement
						options={{
							defaultValues: {
								email: '' // Could be pre-filled if we have user email
							}
						}}
						onChange={event => {
							logger.info('Link Authentication changed', {
								complete: event.complete,
								empty: event.empty,
								value: event.value
							})
							// Email value is available in event.value.email
						}}
						onReady={() => {
							logger.info('Link Authentication Element ready')
						}}
						onFocus={() => {
							logger.info('Link Authentication Element focused')
						}}
						onBlur={() => {
							logger.info('Link Authentication Element blurred')
						}}
						onEscape={() => {
							logger.info('Link Authentication Element escape pressed')
						}}
						onLoadError={event => {
							logger.error('Link Authentication Element load error', {
						error: event.error
					})
							setError('Failed to load email authentication')
						}}
					/>
					<p className="text-xs text-muted-foreground">
						Enter your email to save and reuse your payment method with Link
					</p>
				</div>
			</div>

			{/* Payment Request Button - Apple Pay / Google Pay */}
			{canMakePayment && paymentRequest && (
				<div className="space-y-4">
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								Or pay with
							</span>
						</div>
					</div>
					<PaymentRequestButtonElement
						options={{
							paymentRequest,
							style: {
								paymentRequestButton: {
									type: 'default',
									theme: 'dark',
									height: '40px'
								}
							}
						}}
						onReady={() => {
							logger.info('Payment Request Button ready')
						}}
						onClick={event => {
							logger.info('Payment Request Button clicked', { event })
						}}
					/>
				</div>
			)}

			{/* Address Element - for enhanced billing address collection */}
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-foreground">
						Billing address
					</label>
					<AddressElement
						options={{
							mode: 'billing',
							allowedCountries: [
								'US',
								'CA',
								'GB',
								'AU',
								'DE',
								'FR',
								'IT',
								'ES',
								'NL',
								'BE',
								'AT',
								'CH',
								'SE',
								'NO',
								'DK',
								'FI',
								'IE',
								'PT',
								'LU',
								'MT',
								'CY',
								'SI',
								'SK',
								'EE',
								'LV',
								'LT',
								'HR',
								'HU',
								'CZ',
								'PL',
								'RO',
								'BG',
								'GR',
								'IS',
								'LI',
								'MC',
								'SM',
								'VA',
								'AD',
								'GI',
								'GG',
								'IM',
								'JE',
								'FO',
								'GL',
								'AX'
							], // Major countries + EU
							blockPoBox: true,
							fields: {
								phone: 'never' // We collect email separately
							},
							display: {
								name: 'full'
							}
						}}
						onChange={event => {
							logger.info('Address Element changed', {
								complete: event.complete,
								empty: event.empty,
								value: event.value
							})
							// Address data available in event.value
						}}
						onReady={() => {
							logger.info('Address Element ready')
						}}
						onFocus={() => {
							logger.info('Address Element focused')
						}}
						onBlur={() => {
							logger.info('Address Element blurred')
						}}
						onEscape={() => {
							logger.info('Address Element escape pressed')
						}}
						onLoadError={event => {
							logger.error('Address Element load error', { error: event.error })
							setError('Failed to load address form')
						}}
					/>
					<p className="text-xs text-muted-foreground">
						Required for billing and compliance. Supports international
						addresses.
					</p>
				</div>
			</div>

			{error && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
					{error}
				</div>
			)}

			{isLoading && (
				<div className="flex items-center justify-center py-4">
					<Spinner className="size-5 animate-spin" />
					<span className="ml-2 text-sm text-muted-foreground">
						Loading payment form...
					</span>
				</div>
			)}

			<Button
				type="submit"
				disabled={
					isProcessing || !stripe || !elements || isLoading || !elementReady
				}
				className="w-full"
			>
				{isProcessing ? (
					<>
						<Spinner className="mr-2 size-4 animate-spin" />
						Saving...
					</>
				) : (
					'Save Payment Method'
				)}
			</Button>
		</form>
	)
}

/**
 * PaymentMethodSetupForm - Wrapper component with Elements provider
 *
 * Modern implementation using direct PaymentMethod.create instead of SetupIntent.
 * Supports both card and ACH bank accounts with instant verification.
 *
 * @param onSuccess - Callback when payment method is saved successfully
 * @param onError - Optional error handler
 */
export function PaymentMethodSetupForm({
	onSuccess,
	onError
}: PaymentMethodSetupFormProps) {
	const options: StripeElementsOptions = {
		// No clientSecret needed for direct PaymentMethod.create
		mode: 'setup', // Still use setup mode for payment method collection
		// Enable fonts for better cross-platform consistency
		fonts: [
			{
				cssSrc:
					'https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@400;500;600&display=swap'
			}
		],
		appearance: {
			theme: 'stripe',
			labels: 'floating',
			variables: {
				colorPrimary: 'var(--primary)',
				colorBackground: 'var(--background)',
				colorText: 'var(--foreground)',
				colorDanger: 'var(--destructive)',
				colorTextSecondary: 'var(--muted-foreground)',
				colorTextPlaceholder: 'var(--muted-foreground)',
				colorIcon: 'var(--muted-foreground)',
				colorSuccess: 'var(--primary)',
				fontFamily: 'var(--font-roboto-flex), system-ui, sans-serif',
				fontSizeBase: '14px',
				fontSizeSm: '12px',
				fontSizeXs: '11px',
				fontSizeLg: '16px',
				fontSizeXl: '18px',
				fontWeightNormal: '400',
				fontWeightMedium: '500',
				fontWeightBold: '600',
				borderRadius: 'var(--radius)',
				focusOutline: 'none',
				focusBoxShadow: '0 0 0 2px var(--ring)',
				spacingUnit: '4px',
				spacingGridRow: '16px',
				spacingGridColumn: '16px',
				spacingTab: '8px',
				spacingAccordionItem: '8px'
			},
			rules: {
				'.Input': {
					boxShadow: 'var(--shadow-premium-sm)',
					transition: 'box-shadow 0.15s ease'
				},
				'.Input:focus': {
					boxShadow: '0 0 0 2px var(--ring)'
				},
				'.Tab': {
					border: '1px solid var(--border)',
					backgroundColor: 'var(--muted)',
					color: 'var(--muted-foreground)'
				},
				'.Tab:hover': {
					backgroundColor: 'var(--accent)',
					color: 'var(--accent-foreground)'
				},
				'.Tab--selected': {
					backgroundColor: 'var(--primary)',
					color: 'var(--primary-foreground)'
				},
				'.AccordionItem': {
					border: '1px solid var(--border)',
					borderRadius: 'var(--radius)',
					backgroundColor: 'var(--card)'
				}
			}
		}
	}

	return (
		<Elements stripe={stripePromise} options={options}>
			<SetupForm onSuccess={onSuccess} {...(onError ? { onError } : {})} />
		</Elements>
	)
}
