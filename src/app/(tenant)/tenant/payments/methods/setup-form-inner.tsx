'use client'

import { Button } from '#components/ui/button'
import { Spinner } from '#components/ui/loading-spinner'
import {
	AddressElement,
	ExpressCheckoutElement,
	LinkAuthenticationElement,
	PaymentElement,
	useElements,
	useStripe
} from '@stripe/react-stripe-js'
import { useSetupFormHandlers } from './use-setup-form-handlers'

/**
 * Inner form component that uses Stripe hooks.
 * Must be wrapped in an Elements provider.
 */
export function SetupFormInner({
	onSuccess,
	onError
}: {
	onSuccess: (paymentMethodId: string) => void
	onError?: (error: Error) => void
}) {
	const stripe = useStripe()
	const elements = useElements()

	const {
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
	} = useSetupFormHandlers(onSuccess, onError)

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
