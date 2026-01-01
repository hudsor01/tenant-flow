'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { useCreateRentPaymentMutation } from '#hooks/api/use-payments'
import { usePaymentMethods } from '#hooks/api/use-payments'
import { formatCurrency } from '#lib/formatters/currency'
import type { LeaseWithExtras } from '@repo/shared/types/core'
import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface PayRentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	lease: LeaseWithExtras
	onSuccess?: () => void
}

export function PayRentDialog({
	open,
	onOpenChange,
	lease,
	onSuccess
}: PayRentDialogProps) {
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
		useState<string>('')

	const { data: paymentMethods } = usePaymentMethods()
	const createPayment = useCreateRentPaymentMutation()

	const handlePayRent = async () => {
		if (!selectedPaymentMethodId) {
			toast.error('Please select a payment method')
			return
		}

		try {
			// Extract tenant_id before async call for TypeScript control flow analysis
			const tenant_id = lease.tenant_id

			if (!tenant_id) {
				toast.error('Lease has no tenant assigned')
				return
			}

			const result = await createPayment.mutateAsync({
				tenant_id: tenant_id,
				lease_id: lease.id,
				amount: lease.rent_amount,
				paymentMethodId: selectedPaymentMethodId
			})

			const receiptUrl =
				result.paymentIntent.receiptUrl || result.paymentIntent.receiptUrl

			if (result.success && receiptUrl) {
				toast.success(
					<div>
						Payment successful!{' '}
						<a
							href={receiptUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="underline"
						>
							View Receipt
						</a>
					</div>
				)
				onSuccess?.()
				onOpenChange(false)
				setSelectedPaymentMethodId('')
			} else {
				toast.error('Payment completed but receipt unavailable')
			}
		} catch {
			toast.error('Payment failed. Please try again.')
		}
	}

	const handleCancel = () => {
		onOpenChange(false)
		setSelectedPaymentMethodId('')
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent intent="create" className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-[var(--spacing-2)]">
						<CreditCard className="w-[var(--spacing-5)] h-[var(--spacing-5)]" />
						Pay Rent
					</DialogTitle>
					<DialogDescription>
						Make a one-time rent payment for this lease
					</DialogDescription>
				</DialogHeader>

				<DialogBody>
					{/* Rent Amount Display */}
					<div className="p-4 bg-muted rounded-lg">
						<p className="text-muted mb-[var(--spacing-1)]">Rent Amount</p>
						<p className="typography-h3">{formatCurrency(lease.rent_amount)}</p>
					</div>

					{/* Payment Method Selection */}
					<div className="space-y-[var(--spacing-2)]">
						<Label htmlFor="paymentMethod">Payment Method</Label>
						<Select
							value={selectedPaymentMethodId}
							onValueChange={setSelectedPaymentMethodId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select payment method" />
							</SelectTrigger>
							<SelectContent>
								{paymentMethods?.map(method => (
									<SelectItem key={method.id} value={method.id}>
										{method.type === 'card'
											? `${method.brand} ••••${method.last4}`
											: `${method.bankName || 'Bank'} ••••${method.last4}`}
										{method.isDefault && ' (Default)'}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{!paymentMethods?.length && (
							<p className="text-muted">
								No payment methods saved. Please add a payment method first.
							</p>
						)}
					</div>
				</DialogBody>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						onClick={handlePayRent}
						disabled={
							createPayment.isPending ||
							!selectedPaymentMethodId ||
							!paymentMethods?.length
						}
					>
						{createPayment.isPending ? 'Processing...' : 'Pay Now'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
