'use client'

import { Spinner } from '@/components/ui/spinner'
import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { EditDialog } from '@/components/ui/base-dialogs'
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

	const handleSetupSuccess = async (paymentMethodId: string) => {
		if (!paymentMethodId) {
			toast.error('Payment method identifier missing')
			return
		}

		try {
			const result = await savePaymentMethod.mutateAsync({
				paymentMethodId
			})

			if (result.success) {
				toast.success('Payment method saved successfully')
				onOpenChange(false)
				onSuccess?.()
				setClientSecret(null)
				setPaymentMethodType('card')
			} else {
				toast.error('Failed to save payment method')
			}
		} catch {
			toast.error('Failed to save payment method')
		}
	}

	const handleDialogChange = (isOpen: boolean) => {
		if (!isOpen) {
			setClientSecret(null)
			setPaymentMethodType('card')
		}
		onOpenChange(isOpen)
	}

	return (
		<EditDialog
			open={open}
			hideTrigger
			onOpenChange={handleDialogChange}
			title="Add Payment Method"
			description="Add a card or bank account to pay rent automatically"
			formType="tenant"
			isPending={createSetupIntent.isPending || savePaymentMethod.isPending}
			submitText="Close"
			submitPendingText="Closing..."
			contentClassName="sm:max-w-lg"
			onSubmit={e => {
				e.preventDefault()
				onOpenChange(false)
			}}
		>
			{() => (
				<div className="space-y-6">
					<div className="flex items-center gap-2 text-label-secondary">
						<CreditCard className="size-5" />
						<span>
							Add a card or bank account to keep rent payments on autopilot.
						</span>
					</div>

					{!clientSecret ? (
						<>
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
										Bank accounts are verified instantly via a secure bank
										connection.
									</p>
								)}
							</Field>

							<Button
								type="button"
								onClick={handleCreateSetupIntent}
								disabled={createSetupIntent.isPending}
								className="w-full"
							>
								{createSetupIntent.isPending ? (
									<>
										<Spinner className="mr-2 size-4 animate-spin" />
										Initializing...
									</>
								) : (
									'Continue'
								)}
							</Button>
						</>
					) : (
						<>
							<PaymentMethodSetupForm
								clientSecret={clientSecret}
								onSuccess={handleSetupSuccess}
								onError={() => {
									/* handled internally */
								}}
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
			)}
		</EditDialog>
	)
}
