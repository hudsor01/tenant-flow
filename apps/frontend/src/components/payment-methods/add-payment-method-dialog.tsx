'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { useCreateSetupIntent } from '@/hooks/api/use-payment-methods'
import type { PaymentMethodType } from '@repo/shared/types/core'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { BanknoteIcon, CreditCardIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { PaymentMethodSetupForm } from './payment-method-setup-form'

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface AddPaymentMethodDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

export function AddPaymentMethodDialog({
	open,
	onOpenChange,
	onSuccess
}: AddPaymentMethodDialogProps) {
	const [selectedType, setSelectedType] = useState<PaymentMethodType | null>(
		null
	)
	const [clientSecret, setClientSecret] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const createSetupIntent = useCreateSetupIntent()

	const handleSelectType = async (type: PaymentMethodType) => {
		setError(null)
		setSelectedType(type)

		try {
			const result = await createSetupIntent.mutateAsync({ type })

			if (result.clientSecret) {
				setClientSecret(result.clientSecret)
			} else {
				setError('Failed to initialize payment setup. Please try again.')
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to initialize payment setup'
			)
		}
	}

	const handleClose = () => {
		setSelectedType(null)
		setClientSecret(null)
		setError(null)
		createSetupIntent.reset()
		onOpenChange(false)
	}

	const handleSuccess = () => {
		handleClose()
		onSuccess?.()
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Add Payment Method</DialogTitle>
					<DialogDescription>
						Choose how you'd like to pay for rent and fees
					</DialogDescription>
				</DialogHeader>

				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{!selectedType && (
					<div className="grid gap-4">
						<Button
							variant="outline"
							className="h-auto flex-col items-start gap-2 p-4"
							onClick={() => handleSelectType('card')}
							disabled={createSetupIntent.isPending}
						>
							<div className="flex items-center gap-2">
								<CreditCardIcon className="h-5 w-5" />
								<span className="font-medium">Credit or Debit Card</span>
							</div>
							<span className="text-sm text-muted-foreground">
								Pay with Visa, Mastercard, American Express
							</span>
						</Button>

						<Button
							variant="outline"
							className="h-auto flex-col items-start gap-2 p-4"
							onClick={() => handleSelectType('us_bank_account')}
							disabled={createSetupIntent.isPending}
						>
							<div className="flex items-center gap-2">
								<BanknoteIcon className="h-5 w-5" />
								<span className="font-medium">Bank Account (ACH)</span>
							</div>
							<span className="text-sm text-muted-foreground">
								Lower fees, instant verification with Plaid
							</span>
						</Button>

						{createSetupIntent.isPending && (
							<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<Loader2Icon className="h-4 w-4 animate-spin" />
								<span>Initializing...</span>
							</div>
						)}
					</div>
				)}

				{selectedType && clientSecret && (
					<Elements stripe={stripePromise} options={{ clientSecret }}>
						<PaymentMethodSetupForm
							paymentMethodType={selectedType}
							onSuccess={handleSuccess}
							onCancel={handleClose}
						/>
					</Elements>
				)}
			</DialogContent>
		</Dialog>
	)
}
