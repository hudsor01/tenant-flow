'use client'

import { Spinner } from '@/components/ui/spinner'
import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

import {
	useCreateSetupIntent,
	useSavePaymentMethod
} from '@/hooks/api/use-payment-methods'

import { PaymentMethodSetupForm } from './payment-method-setup-form'

interface AddPaymentMethodDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

/**
 * AddPaymentMethodDialog - Modal for adding new payment methods
 *
 * Allows tenants to add card or ACH bank accounts for rent payments.
 * Uses Stripe's PaymentElement for secure payment method collection.
 *
 * Flow:
 * 1. Select payment type (card or ACH)
 * 2. Create SetupIntent on backend
 * 3. Collect payment method via Stripe PaymentElement
 * 4. Save payment method details to database
 */
export function AddPaymentMethodDialog({
	open,
	onOpenChange,
	onSuccess
}: AddPaymentMethodDialogProps) {
	const [paymentMethodType, setPaymentMethodType] = useState<
		'card' | 'us_bank_account'
	>('card')
	const [clientSecret, setClientSecret] = useState<string | null>(null)

	const createSetupIntent = useCreateSetupIntent()
	const savePaymentMethod = useSavePaymentMethod()

	// Step 1: Create SetupIntent when dialog opens and payment type is selected
	const handleCreateSetupIntent = async () => {
		try {
			const result = await createSetupIntent.mutateAsync({
				type: paymentMethodType
			})

			if (result.clientSecret) {
				setClientSecret(result.clientSecret)
			} else {
				toast.error('Failed to initialize payment method setup')
			}
		} catch {
			toast.error('Failed to initialize payment method setup')
		}
	}

	// Step 2: Handle successful payment method confirmation
	const handleSetupSuccess = async (paymentMethodId: string) => {
		if (!paymentMethodId) {
			toast.error('Payment method identifier missing')
			return
		}

		try {
			// Save payment method details to database
			const result = await savePaymentMethod.mutateAsync({
				paymentMethodId
			})

			if (result.success) {
				toast.success('Payment method saved successfully')
				onOpenChange(false)
				onSuccess?.()

				// Reset state for next use
				setClientSecret(null)
				setPaymentMethodType('card')
			} else {
				toast.error('Failed to save payment method')
			}
		} catch {
			toast.error('Failed to save payment method')
		}
	}

	const handleSetupError = () => {
		// Error already handled by PaymentMethodSetupForm
	}

	const handleDialogChange = (isOpen: boolean) => {
		if (!isOpen) {
			// Reset state when dialog closes
			setClientSecret(null)
			setPaymentMethodType('card')
		}
		onOpenChange(isOpen)
	}

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="w-5 h-5" />
						Add Payment Method
					</DialogTitle>
					<DialogDescription>
						Add a card or bank account to pay rent automatically
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{!clientSecret ? (
						<>
							{/* Step 1: Select payment method type */}
							<Field>
								<FieldLabel htmlFor="paymentType">
									Payment Method Type
								</FieldLabel>
								<Select
									value={paymentMethodType}
									onValueChange={(value: 'card' | 'us_bank_account') =>
										setPaymentMethodType(value)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="card">Credit or Debit Card</SelectItem>
										<SelectItem value="us_bank_account">
											US Bank Account (ACH)
										</SelectItem>
									</SelectContent>
								</Select>
								{paymentMethodType === 'us_bank_account' && (
									<p className="text-sm text-muted-foreground mt-2">
										Bank accounts are verified instantly via secure connection
										to your bank.
									</p>
								)}
							</Field>

							<Button
								onClick={handleCreateSetupIntent}
								disabled={createSetupIntent.isPending}
								className="w-full"
							>
								{createSetupIntent.isPending ? (
									<>
										<Spinner className="mr-2 h-4 w-4 animate-spin" />
										Initializing...
									</>
								) : (
									'Continue'
								)}
							</Button>
						</>
					) : (
						<>
							{/* Step 2: Collect payment method via Stripe PaymentElement */}
							<PaymentMethodSetupForm
								clientSecret={clientSecret}
								onSuccess={handleSetupSuccess}
								onError={handleSetupError}
							/>

							<div className="rounded-lg border p-4 bg-muted/50">
								<p className="text-sm text-muted-foreground">
									Your payment information is securely processed by Stripe. We
									never store your card details or bank credentials.
								</p>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
