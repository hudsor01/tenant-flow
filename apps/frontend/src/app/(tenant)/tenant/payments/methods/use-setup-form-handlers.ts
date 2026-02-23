'use client'

import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useElements, useStripe } from '@stripe/react-stripe-js'
import type { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { attachPaymentMethod } from './attach-payment-method'
import { getStripeErrorMessage } from './stripe-error-utils'

const logger = createLogger({ component: 'PaymentMethodSetupForm' })

interface SetupFormState {
	isProcessing: boolean
	isLoading: boolean
	elementReady: boolean
	error: string | null
	expressCheckoutReady: boolean
}

interface SetupFormHandlers {
	handleSubmit: (e: FormEvent) => Promise<void>
	handleElementReady: () => void
	handleLoadError: (message: string) => void
	handleExpressCheckoutConfirm: (
		event: StripeExpressCheckoutElementConfirmEvent
	) => Promise<void>
	setExpressCheckoutReady: (ready: boolean) => void
	setIsLoading: (loading: boolean) => void
}

export function useSetupFormHandlers(
	onSuccess: (paymentMethodId: string) => void,
	onError?: (error: Error) => void
): SetupFormState & SetupFormHandlers {
	const stripe = useStripe()
	const elements = useElements()
	const [isProcessing, setIsProcessing] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [elementReady, setElementReady] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [expressCheckoutReady, setExpressCheckoutReady] = useState(false)

	const isMountedRef = useRef(true)
	const abortControllerRef = useRef<AbortController | null>(null)
	const onSuccessRef = useRef(onSuccess)
	const onErrorRef = useRef(onError)

	useEffect(() => {
		onSuccessRef.current = onSuccess
		onErrorRef.current = onError
	}, [onSuccess, onError])

	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			abortControllerRef.current?.abort()
		}
	}, [])

	const handleSubmit = useCallback(
		async (e: FormEvent) => {
			e.preventDefault()

			if (!stripe || !elements) {
				toast.error('Payment form not ready. Please wait.')
				return
			}

			if (isProcessing) return

			setIsProcessing(true)
			setError(null)

			abortControllerRef.current?.abort()
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			try {
				const { error: submitError } = await elements.submit()
				if (submitError) {
					if (!isMountedRef.current) return
					setError(submitError.message || 'Please check your payment information')
					setIsProcessing(false)
					return
				}

				const { paymentMethod, error: createError } =
					await stripe.createPaymentMethod({
						elements,
						params: { billing_details: {} }
					})

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

				const attachResult = await attachPaymentMethod(
					paymentMethod.id,
					abortController.signal
				)

				if (abortController.signal.aborted || !isMountedRef.current) return

				if (!attachResult.success) {
					const message = attachResult.error || 'Failed to save payment method'
					setError(message)
					onErrorRef.current?.(new Error(message))
					setIsProcessing(false)
					return
				}

				toast.success('Payment method saved successfully')
				onSuccessRef.current(paymentMethod.id)
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') return
				if (!isMountedRef.current) return

				const caught =
					err instanceof Error ? err : new Error('An unexpected error occurred')
				setError(caught.message)
				toast.error(caught.message)
				onErrorRef.current?.(caught)
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

	const handleExpressCheckoutConfirm = useCallback(
		async (_event: StripeExpressCheckoutElementConfirmEvent) => {
			if (!stripe || !elements) {
				toast.error('Payment form not ready. Please wait.')
				return
			}

			if (isProcessing) return

			setIsProcessing(true)
			setError(null)

			abortControllerRef.current?.abort()
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			try {
				const { error: confirmError, setupIntent } = await stripe.confirmSetup({
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

					const attachResult = await attachPaymentMethod(
						paymentMethodId,
						abortController.signal
					)

					if (abortController.signal.aborted || !isMountedRef.current) return

					if (!attachResult.success) {
						const message = attachResult.error || 'Failed to save payment method'
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

				const caught =
					err instanceof Error ? err : new Error('An unexpected error occurred')
				setError(caught.message)
				toast.error(caught.message)
				onErrorRef.current?.(caught)
			} finally {
				if (isMountedRef.current) {
					setIsProcessing(false)
				}
			}
		},
		[stripe, elements, isProcessing]
	)

	return {
		isProcessing,
		isLoading,
		elementReady,
		error,
		expressCheckoutReady,
		handleSubmit,
		handleElementReady,
		handleLoadError,
		handleExpressCheckoutConfirm,
		setExpressCheckoutReady,
		setIsLoading
	}
}
