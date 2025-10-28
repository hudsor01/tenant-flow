'use client'

import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PaymentMethodSetupForm } from '#app/(protected)/tenant/payments/methods/payment-method-setup-form'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Field, FieldLabel } from '#components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Spinner } from '#components/ui/spinner'
import {
	useCreateSetupIntent,
	useSavePaymentMethod
} from '#hooks/api/use-payment-methods'

export function AddPaymentMethod() {
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
				toast.error('Unable to initialize payment method setup')
			}
		} catch {
			toast.error('Failed to initialize payment method setup')
		}
	}

	const handleSetupSuccess = async (paymentMethodId: string) => {
		try {
			const result = await savePaymentMethod.mutateAsync({ paymentMethodId })
			if (result.success) {
				toast.success('Payment method saved successfully')
				setClientSecret(null)
				setPaymentMethodType('card')
			} else {
				toast.error('Failed to save payment method')
			}
		} catch {
			toast.error('Failed to save payment method')
		}
	}

	return (
		<CardLayout
			title="Add payment method"
			description="Collect rent automatically by saving a verified payment method."
			className="space-y-6"
		>
			<div className="flex items-center gap-2 text-lg font-semibold mb-2">
				<CreditCard className="size-5 text-primary" />
				Add payment method
			</div>
			{!clientSecret ? (
				<div className="space-y-4">
					<Field>
						<FieldLabel htmlFor="paymentType">Payment method type</FieldLabel>
						<Select
							value={paymentMethodType}
							onValueChange={value =>
								setPaymentMethodType(value as 'card' | 'us_bank_account')
							}
						>
							<SelectTrigger id="paymentType">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="card">Credit or debit card</SelectItem>
								<SelectItem value="us_bank_account">
									US bank account (ACH)
								</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					<Button
						onClick={handleCreateSetupIntent}
						disabled={createSetupIntent.isPending}
						className="w-full"
					>
						{createSetupIntent.isPending ? (
							<>
								<Spinner className="mr-2 size-4" />
								Initializing...
							</>
						) : (
							'Continue'
						)}
					</Button>
				</div>
			) : (
				<div className="space-y-4">
					<PaymentMethodSetupForm
						clientSecret={clientSecret}
						onSuccess={handleSetupSuccess}
						onError={() => toast.error('Payment method confirmation failed')}
					/>
					<div className="rounded-lg border border-muted-foreground/20 bg-muted/50 p-4 text-sm text-muted-foreground">
						Powered by Stripe — your payment details are encrypted and never
						stored on TenantFlow servers.
					</div>
				</div>
			)}
		</CardLayout>
	)
}
