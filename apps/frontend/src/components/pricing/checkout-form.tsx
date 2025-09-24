'use client'

import { useState } from 'react'
import { useCheckout, PaymentElement } from '@stripe/react-stripe-js/checkout'
import { createLogger } from '@repo/shared'

const logger = createLogger({ component: 'CheckoutForm' })
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingDots } from '@/components/magicui/loading-spinner'
import { AlertTriangle, CreditCard, Lock, Mail } from 'lucide-react'

interface CheckoutFormProps {
	amount: number
	currency: string
	planName: string
	features: string[]
	metadata?: Record<string, string>
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

// Stripe's email validation function as per documentation
const validateEmail = async (email: string) => {
	if (!email || !email.includes('@')) {
		return {
			isValid: false,
			message: 'Please enter a valid email address'
		}
	}

	// Additional validation could be added here
	// For now, basic email format validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	const isValid = emailRegex.test(email)

	return {
		isValid,
		message: isValid ? '' : 'Please enter a valid email address'
	}
}

export function CheckoutForm({
	planName,
	features,
	onSuccess,
	onError
}: CheckoutFormProps) {
	const checkoutState = useCheckout()
	const [email, setEmail] = useState('')
	const [emailError, setEmailError] = useState('')
	const [message, setMessage] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	// Handle loading state
	if (checkoutState.type === 'loading') {
		return (
			<Card className="border-[var(--color-border)] shadow-sm">
				<CardContent className="p-8">
					<div className="flex flex-col items-center justify-center space-y-4">
						<LoadingDots size="lg" variant="primary" />
						<p className="text-[var(--color-text-secondary)]">
							Loading secure checkout...
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	// Handle error state
	if (checkoutState.type === 'error') {
		return (
			<Card className="border-[var(--color-border)] shadow-sm">
				<CardContent className="p-8">
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							{checkoutState.error.message}
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		)
	}

	// Success state - checkout object is available
	const { checkout } = checkoutState

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setEmailError('')
		setMessage('')

		// Email validation as per Stripe documentation
		const { isValid, message: validationMessage } = await validateEmail(email)
		if (!isValid) {
			setEmailError(validationMessage)
			setMessage(validationMessage)
			setIsLoading(false)
			return
		}

		// Check if all required data is present by checking canConfirm
		if (!checkout.canConfirm) {
			setMessage('Please complete all required fields')
			setIsLoading(false)
			return
		}

		// Complete the payment - Call confirm when customer is ready
		const confirmResult = await checkout.confirm()

		// This point will only be reached if there is an immediate error when
		// confirming the payment. Otherwise, your customer will be redirected to
		// your 'return_url'. For some payment methods like iDEAL, your customer will
		// be redirected to an intermediate site first to authorize the payment, then
		// redirected to the 'return_url'.
		if (confirmResult.type === 'error') {
			setMessage(confirmResult.error.message)
			setIsLoading(false)
			if (onError) {
				onError(confirmResult.error)
			}
		} else {
			// Success - customer will be redirected to return_url
			if (onSuccess) {
				onSuccess()
			}
		}
	}

	return (
		<Card className="border-[var(--color-border)] shadow-sm">
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
					<CreditCard className="w-5 h-5" />
					Complete Payment
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Email Collection */}
				<div className="space-y-2">
					<Label htmlFor="email" className="text-sm font-medium text-[var(--color-text-primary)]">
						<Mail className="w-4 h-4 inline mr-2" />
						Email address
					</Label>
					<Input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Enter your email address"
						className="h-11" // 44px minimum touch target
						required
					/>
					{emailError && (
						<p className="text-sm text-[var(--color-system-red)]">
							{emailError}
						</p>
					)}
				</div>

				{/* Payment Element */}
				<div className="space-y-2">
					<Label className="text-sm font-medium text-[var(--color-text-primary)]">
						Payment information
					</Label>
					<div className="min-h-[44px]"> {/* Touch-first minimum height */}
						<PaymentElement
							options={{
								layout: 'tabs'
							}}
							onReady={() => {
								logger.info('PaymentElement ready for user interaction', {
									action: 'payment_element_ready'
								})
							}}
							onChange={(event) => {
								logger.info('PaymentElement state changed', {
									action: 'payment_element_changed',
									metadata: {
										complete: event?.complete || false,
										elementType: event?.elementType || 'unknown'
									}
								})
							}}
						/>
					</div>
				</div>

				{/* Error Message */}
				{message && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							{message}
						</AlertDescription>
					</Alert>
				)}

				{/* Plan Summary */}
				<div className="p-4 bg-[var(--color-fill-secondary)] rounded-lg">
					<h4 className="font-medium text-[var(--color-text-primary)] mb-2">
						{planName} Plan
					</h4>
					<ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
						{features.slice(0, 3).map((feature, index) => (
							<li key={index}>• {feature}</li>
						))}
						{features.length > 3 && (
							<li className="text-[var(--color-text-muted)]">
								+ {features.length - 3} more features
							</li>
						)}
					</ul>
				</div>

				{/* Submit Button */}
				<form onSubmit={handleSubmit}>
					<Button
						type="submit"
						disabled={isLoading || !email}
						className="w-full h-11 text-base font-medium"
					>
						{isLoading ? (
							<>
								<LoadingDots size="sm" variant="primary" />
								<span className="ml-2">Processing...</span>
							</>
						) : (
							'Complete Payment'
						)}
					</Button>
				</form>

				{/* Security Notice */}
				<div className="flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]">
					<Lock className="w-4 h-4" />
					<span>Secure payment powered by Stripe</span>
				</div>
			</CardContent>
		</Card>
	)
}