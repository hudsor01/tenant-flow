'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { useCreateRentPayment } from '#hooks/api/use-rent-payments'
import { useModalStore } from '#stores/modal-store'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import { formatCurrency } from '@repo/shared/utils/currency'
import type { LeaseWithExtras } from '@repo/shared/types/core'
import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface PayRentDialogProps {
	lease: LeaseWithExtras
}

export function PayRentDialog({ lease }: PayRentDialogProps) {
	const { closeModal, isModalOpen } = useModalStore()
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
		useState<string>('')

	const { data: paymentMethods } = usePaymentMethods()
	const createPayment = useCreateRentPayment()

	const modalId = `pay-rent-${lease.id}`

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
				closeModal(modalId)
				setSelectedPaymentMethodId('')
			} else {
				toast.error('Payment completed but receipt unavailable')
			}
		} catch {
			toast.error('Payment failed. Please try again.')
		}
	}

	const handleCancel = () => {
		closeModal(modalId)
		setSelectedPaymentMethodId('')
	}

	return (
		<>
			{isModalOpen(modalId) && (
				<Dialog open={true} onOpenChange={handleCancel}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
								<DialogTitle className="flex items-center gap-[var(--spacing-2)]">
									<CreditCard className="w-[var(--spacing-5)] h-[var(--spacing-5)]" />
								Pay Rent
							</DialogTitle>
							<DialogDescription>
								Make a one-time rent payment for this lease
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-[var(--spacing-4)]">
							{/* Rent Amount Display */}
							<div className="p-[var(--spacing-4)] bg-muted rounded-lg">
								<p className="text-sm text-muted-foreground mb-[var(--spacing-1)]">
									Rent Amount
								</p>
								<p className="text-2xl font-semibold">
									{formatCurrency(lease.rent_amount)}
								</p>
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
									<p className="text-sm text-muted-foreground">
										No payment methods saved. Please add a payment method first.
									</p>
								)}
							</div>

							{/* Action Buttons */}
							<div className="flex justify-end gap-[var(--spacing-2)] pt-[var(--spacing-4)] border-t">
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
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	)
}
