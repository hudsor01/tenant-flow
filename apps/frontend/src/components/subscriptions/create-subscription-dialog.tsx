/**
 * Create Subscription Dialog
 * Phase 4: Autopay Subscriptions
 *
 * Interface for creating recurring rent payment subscriptions
 */

'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { usePaymentMethods } from '@/hooks/api/use-payment-methods'
import { useCreateSubscription } from '@/hooks/api/use-subscriptions'
import type { Database } from '@repo/shared/types/supabase-generated'
import { Calendar, CreditCard, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type Lease = Database['public']['Tables']['lease']['Row'] & {
	Unit: Database['public']['Tables']['unit']['Row'] & {
		Property: Database['public']['Tables']['property']['Row']
	}
}

interface CreateSubscriptionDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	leases: Lease[]
	onSuccess?: () => void
}

/**
 * Generate array of days 1-31 for billing day selector
 */
const BILLING_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount)
}

/**
 * Main dialog component for subscription creation
 */
export function CreateSubscriptionDialog({
	open,
	onOpenChange,
	leases,
	onSuccess
}: CreateSubscriptionDialogProps) {
	const [selectedLeaseId, setSelectedLeaseId] = useState<string>('')
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
		useState<string>('')
	const [billingDayOfMonth, setBillingDayOfMonth] = useState<number>(1)

	const createSubscription = useCreateSubscription()
	const { data: paymentMethods, isLoading: isLoadingPaymentMethods } =
		usePaymentMethods()

	// Find selected lease to display amount
	const selectedLease = leases.find(l => l.id === selectedLeaseId)
	const rentAmount = selectedLease?.rentAmount || 0

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!selectedLeaseId || !selectedPaymentMethodId) {
			toast.error('Please fill in all fields')
			return
		}

		if (!rentAmount) {
			toast.error('Invalid rent amount')
			return
		}

		createSubscription.mutate(
			{
				leaseId: selectedLeaseId,
				paymentMethodId: selectedPaymentMethodId,
				amount: rentAmount,
				billingDayOfMonth,
				currency: 'usd'
			},
			{
				onSuccess: () => {
					onSuccess?.()
					onOpenChange(false)
					// Reset form
					setSelectedLeaseId('')
					setSelectedPaymentMethodId('')
					setBillingDayOfMonth(1)
				}
			}
		)
	}

	const handleCancel = () => {
		onOpenChange(false)
		// Reset form
		setSelectedLeaseId('')
		setSelectedPaymentMethodId('')
		setBillingDayOfMonth(1)
	}

	// Get all payment methods (backend only returns active ones)
	const activePaymentMethods = paymentMethods || []

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Set Up Autopay</DialogTitle>
					<DialogDescription>
						Automatically charge rent each month on your selected billing day
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6 mt-4">
					{/* Lease Selection */}
					<div className="space-y-2">
						<Label
							htmlFor="lease"
							className="text-label-secondary text-[11px] font-medium uppercase tracking-[0.01em]"
						>
							Select Lease
						</Label>
						<Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
							<SelectTrigger id="lease">
								<SelectValue placeholder="Choose a lease" />
							</SelectTrigger>
							<SelectContent>
								{leases.map(lease => (
									<SelectItem key={lease.id} value={lease.id}>
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{lease.Unit.Property.name} - Unit{' '}
												{lease.Unit.unitNumber}
											</span>
											<span className="text-label-tertiary">
												{formatCurrency(lease.rentAmount)}/mo
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Payment Method Selection */}
					<div className="space-y-2">
						<Label
							htmlFor="payment-method"
							className="text-label-secondary text-[11px] font-medium uppercase tracking-[0.01em]"
						>
							Payment Method
						</Label>
						{isLoadingPaymentMethods ? (
							<div className="flex items-center justify-center py-8">
								<Spinner className="h-5 w-5 animate-spin text-accent-main" />
							</div>
						) : activePaymentMethods.length === 0 ? (
							<div className="rounded-lg border border-separator bg-fill-tertiary p-4">
								<p className="text-sm text-label-secondary">
									No payment methods available. Add one first.
								</p>
							</div>
						) : (
							<Select
								value={selectedPaymentMethodId}
								onValueChange={setSelectedPaymentMethodId}
							>
								<SelectTrigger id="payment-method">
									<SelectValue placeholder="Choose payment method" />
								</SelectTrigger>
								<SelectContent>
									{activePaymentMethods.map(pm => (
										<SelectItem key={pm.id} value={pm.id}>
											<div className="flex items-center gap-2">
												<CreditCard className="h-4 w-4 text-label-tertiary" />
												<span className="capitalize">{pm.type}</span>
												{pm.last4 && (
													<span className="text-label-tertiary">
														•••• {pm.last4}
													</span>
												)}
												{pm.isDefault && (
													<span className="ml-auto text-xs text-accent-main">
														Default
													</span>
												)}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					{/* Billing Day Selection */}
					<div className="space-y-2">
						<Label
							htmlFor="billing-day"
							className="text-label-secondary text-[11px] font-medium uppercase tracking-[0.01em]"
						>
							Billing Day of Month
						</Label>
						<Select
							value={billingDayOfMonth.toString()}
							onValueChange={v => setBillingDayOfMonth(Number(v))}
						>
							<SelectTrigger id="billing-day">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{BILLING_DAYS.map(day => (
									<SelectItem key={day} value={day.toString()}>
										<div className="flex items-center gap-2">
											<Calendar className="h-4 w-4 text-label-tertiary" />
											<span>Day {day}</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-label-tertiary">
							Rent will be charged automatically on this day each month
						</p>
					</div>

					{/* Amount Display */}
					{selectedLease && (
						<div className="rounded-lg border border-separator bg-fill-tertiary p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<DollarSign className="h-5 w-5 text-label-tertiary" />
									<span className="text-sm text-label-secondary">
										Monthly Amount
									</span>
								</div>
								<span className="text-lg font-semibold text-label-primary">
									{formatCurrency(rentAmount)}
								</span>
							</div>
							<p className="mt-2 text-xs text-label-tertiary">
								Platform fee: 2.9% ({formatCurrency(rentAmount * 0.029)})
							</p>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={createSubscription.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								!selectedLeaseId ||
								!selectedPaymentMethodId ||
								createSubscription.isPending ||
								activePaymentMethods.length === 0
							}
						>
							{createSubscription.isPending && (
								<Spinner className="mr-2 h-4 w-4 animate-spin" />
							)}
							{createSubscription.isPending ? 'Creating...' : 'Enable Autopay'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}
