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


interface AddPaymentMethodProps {
	onSuccess?: () => void
}

export function AddPaymentMethod({ onSuccess }: AddPaymentMethodProps = {}) {
	const [paymentMethodType, setPaymentMethodType] = useState<
		'card' | 'us_bank_account'
	>('card')
	const [showForm, setShowForm] = useState(false)

	const handleContinue = () => {
		setShowForm(true)
	}

	const handleSetupSuccess = async () => {
		// Payment method is already saved via PaymentMethod.create in PaymentMethodSetupForm
		toast.success('Payment method saved successfully')
		setShowForm(false)
		setPaymentMethodType('card')
		onSuccess?.()
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
			{!showForm ? (
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

					<Button onClick={handleContinue} className="w-full">
						Continue
					</Button>
				</div>
			) : (
				<div className="space-y-4">
					<PaymentMethodSetupForm
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
