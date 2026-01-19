'use client'

import { Button } from '#components/ui/button'
import { Spinner } from '#components/ui/loading-spinner'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	AddressElement,
	Elements,
	ExpressCheckoutElement,
	LinkAuthenticationElement,
	PaymentElement,
	useElements,
	useStripe
} from '@stripe/react-stripe-js'
import type {
	StripeElementsOptions,
	StripeError,
	StripeExpressCheckoutElementConfirmEvent
} from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'PaymentMethodSetupForm' })

// Load Stripe outside component render per official docs
const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
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
	const [expressCheckoutReady, setExpressCheckoutReady] = useState(false)

	// Ref to track component mount state for async operations
	const isMountedRef = useRef(true)
	// Ref for AbortController to cancel fetch requests on unmount
	const abortControllerRef = useRef<AbortController | null>(null)
	// Ref for stable callback reference
	const onSuccessRef = useRef(onSuccess)
	const onErrorRef = useRef(onError)

	// Keep refs updated without triggering effects
	useEffect(() => {
		onSuccessRef.current = onSuccess
		onErrorRef.current = onError
	}, [onSuccess, onError])

	// Cleanup on unmount
	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			// Abort any pending requests
			abortControllerRef.current?.abort()
		}
	}, [])

	const handleSubmit = useCallback(
		async (e: FormEvent) => {
			e.preventDefault()

			// Guard: Stripe not loaded
			if (!stripe || !elements) {
				toast.error('Payment form not ready. Please wait.')
				return
			}

			// Guard: Already processing
			if (isProcessing) return

			setIsProcessing(true)
			setError(null)

			// Create new AbortController for this submission
			abortControllerRef.current?.abort()
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			try {
				// Step 1: Submit the form data for validation
				const { error: submitError } = await elements.submit()
				if (submitError) {
					if (!isMountedRef.current) return
					setError(
						submitError.message || 'Please check your payment information'
					)
					setIsProcessing(false)
					return
				}

				// Step 2: Create payment method using collected data
				const { paymentMethod, error: createError } =
					await stripe.createPaymentMethod({
						elements,
						params: {
							billing_details: {
								// Address and email auto-included from Elements
							}
						}
					})

				// Check if aborted or unmounted
				if (abortController.signal.aborted || !isMountedRef.current) return

				if (createError) {
					const errorMessage = getStripeErrorMessage(createError)
					setError(errorMessage)
					onErrorRef.current?.(new Error(errorMessage))
					setIsProcessing(false)
					return
				}

				if (!paymentMethod) {
					const message = 'Payment method creation failed'
					setError(message)
					onErrorRef.current?.(new Error(message))
					setIsProcessing(false)
					return
				}

				// Step 3: Attach payment method to customer via backend
				const attachResponse = await fetch(
					'/api/v1/stripe/attach-tenant-payment-method',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							payment_method_id: paymentMethod.id,
							set_as_default: true
						}),
						signal: abortController.signal
					}
				)

				// Check if aborted or unmounted
				if (abortController.signal.aborted || !isMountedRef.current) return

				const attachResult = await attachResponse.json()

				if (!attachResult.success) {
					const message = attachResult.error || 'Failed to save payment method'
					setError(message)
					onErrorRef.current?.(new Error(message))
					setIsProcessing(false)
					return
				}

				// Success
				toast.success('Payment method saved successfully')
				onSuccessRef.current(paymentMethod.id)
			} catch (err) {
				// Ignore abort errors
				if (err instanceof Error && err.name === 'AbortError') return
				if (!isMountedRef.current) return

				const error =
					err instanceof Error ? err : new Error('An unexpected error occurred')
				setError(error.message)
				toast.error(error.message)
				onErrorRef.current?.(error)
			} finally {
				if (isMountedRef.current) {
					setIsProcessing(false)
				}
			}
		},
		[stripe, elements, isProcessing]
	)

	const handleElementReady = useCallback(() => {
		if (isMountedRef.current) {
			setIsLoading(false)
			setElementReady(true)
		}
	}, [])

	const handleLoadError = useCallback((message: string) => {
		if (isMountedRef.current) {
			logger.error('Element failed to load', { message })
			toast.error(message)
			setIsLoading(false)
		}
	}, [])

	// Handler for ExpressCheckoutElement confirmation (Apple Pay/Google Pay)
	const handleExpressCheckoutConfirm = useCallback(
		async (_event: StripeExpressCheckoutElementConfirmEvent) => {
			if (!stripe || !elements) {
				toast.error('Payment form not ready. Please wait.')
				return
			}

			if (isProcessing) return

			setIsProcessing(true)
			setError(null)

			// Create new AbortController for this submission
			abortControllerRef.current?.abort()
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			try {
				// Confirm the setup using the express checkout element
				const { error: confirmError, setupIntent } =
					await stripe.confirmSetup({
						elements,
						confirmParams: {
							return_url: `${window.location.origin}/tenant/settings/payment-methods`
						},
						redirect: 'if_required'
					})

				if (abortController.signal.aborted || !isMountedRef.current) return

				if (confirmError) {
					const errorMessage = getStripeErrorMessage(confirmError)
					setError(errorMessage)
					onErrorRef.current?.(new Error(errorMessage))
					setIsProcessing(false)
					return
				}

				if (setupIntent?.payment_method) {
					const paymentMethodId =
						typeof setupIntent.payment_method === 'string'
							? setupIntent.payment_method
							: setupIntent.payment_method.id

					// Attach payment method to customer via backend
					const attachResponse = await fetch(
						'/api/v1/stripe/attach-tenant-payment-method',
						{
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								payment_method_id: paymentMethodId,
								set_as_default: true
							}),
							signal: abortController.signal
						}
					)

					if (abortController.signal.aborted || !isMountedRef.current) return

					const attachResult = await attachResponse.json()

					if (!attachResult.success) {
						const message =
							attachResult.error || 'Failed to save payment method'
						setError(message)
						onErrorRef.current?.(new Error(message))
						setIsProcessing(false)
						return
					}

					toast.success('Payment method saved successfully')
					onSuccessRef.current(paymentMethodId)
				}
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') return
				if (!isMountedRef.current) return

				const error =
					err instanceof Error ? err : new Error('An unexpected error occurred')
				setError(error.message)
				toast.error(error.message)
				onErrorRef.current?.(error)
			} finally {
				if (isMountedRef.current) {
					setIsProcessing(false)
				}
			}
		},
		[stripe, elements, isProcessing]
	)

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* ACH Cost Savings Banner */}
			<div className="rounded-lg border border-success/30 bg-success/10 p-4">
				<p className="text-sm font-medium text-success-foreground">
					Bank accounts recommended for rent payments
				</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Save up to $39 per payment with ACH (0.8% capped at $5) vs cards
					(2.9% + $0.30).
				</p>
			</div>

			{/* Express Checkout - Apple Pay / Google Pay / Link */}
			<ExpressCheckoutElement
				options={{
					buttonType: {
						applePay: 'add-money',
						googlePay: 'plain'
					},
					buttonTheme: {
						applePay: 'black',
						googlePay: 'black'
					},
					layout: {
						maxColumns: 3,
						maxRows: 1
					},
					paymentMethods: {
						applePay: 'auto',
						googlePay: 'auto',
						link: 'auto'
					}
				}}
				onConfirm={handleExpressCheckoutConfirm}
				onReady={() => setExpressCheckoutReady(true)}
			/>

			{/* Divider - only show if express checkout is available */}
			{expressCheckoutReady && (
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">
							Or pay with bank account or card
						</span>
					</div>
				</div>
			)}

			{/* Stripe PaymentElement - handles card + ACH + validation */}
			<PaymentElement
				options={{
					layout: {
						type: 'accordion',
						defaultCollapsed: false,
						spacedAccordionItems: true
					},
					// ACH first - 0.8% capped at $5 vs 2.9% + $0.30 for cards
					paymentMethodOrder: ['us_bank_account', 'card'],
					fields: {
						billingDetails: {
							name: 'never',
							email: 'never',
							phone: 'never',
							address: 'never'
						}
					},
					wallets: {
						applePay: 'auto',
						googlePay: 'auto'
					},
					business: {
						name: 'TenantFlow'
					}
				}}
				onReady={handleElementReady}
				onLoadError={() => handleLoadError('Failed to load payment form')}
				onLoaderStart={() => setIsLoading(true)}
			/>

			{/* Email with Link authentication */}
			<div className="space-y-2">
				<label className="typography-small text-foreground">
					Email address
				</label>
				<LinkAuthenticationElement
					options={{ defaultValues: { email: '' } }}
					onLoadError={() => handleLoadError('Failed to load email form')}
				/>
				<p className="text-caption">
					Enter your email to save and reuse your payment method with Link
				</p>
			</div>

			{/* Billing Address */}
			<div className="space-y-2">
				<label className="typography-small text-foreground">
					Billing address
				</label>
				<AddressElement
					options={{
						mode: 'billing',
						allowedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
						blockPoBox: true,
						fields: { phone: 'never' },
						display: { name: 'full' }
					}}
					onLoadError={() => handleLoadError('Failed to load address form')}
				/>
				<p className="text-caption">Required for billing and compliance</p>
			</div>

			{/* Error Display */}
			{error && (
				<div
					role="alert"
					className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
				>
					{error}
				</div>
			)}

			{/* Loading State */}
			{isLoading && (
				<div className="flex-center py-4">
					<Spinner className="size-5 animate-spin" />
					<span className="ml-2 text-muted">Loading payment form...</span>
				</div>
			)}

			{/* Submit Button */}
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
 * Extract user-friendly error message from Stripe errors
 */
function getStripeErrorMessage(error: StripeError): string {
	switch (error.type) {
		case 'card_error':
			return error.message || 'Card error occurred'
		case 'validation_error':
			return error.message || 'Please check your payment information'
		case 'invalid_request_error':
			logger.error('Invalid request error', { error })
			return 'Invalid payment request. Please try again.'
		default:
			logger.error('Payment method creation error', { error })
			return error.message || 'Failed to create payment method'
	}
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
			<SetupForm onSuccess={onSuccess} {...(onError && { onError })} />
		</Elements>
	)
}
