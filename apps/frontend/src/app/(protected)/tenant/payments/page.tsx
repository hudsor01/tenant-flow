/**
 * Tenant Rent Payment Page
 *
 * Allows tenants to make one-time rent payments using:
 * - Saved payment methods
 * - New payment method (Stripe Elements)
 * - Displays current rent amount and due date
 */

'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { useCurrentLease } from '#hooks/api/use-lease'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import { useCreateRentPayment } from '#hooks/api/use-rent-payments'
import { logger } from '@repo/shared/lib/frontend-logger'
import { formatCurrency } from '@repo/shared/utils/currency'
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	CreditCard,
	DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function TenantPaymentPage() {
	const router = useRouter()
	const { data: lease, isLoading: leaseLoading } = useCurrentLease()
	const { data: paymentMethods = [], isLoading: methodsLoading } =
		usePaymentMethods()
	const createRentPayment = useCreateRentPayment()

	const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)

	useEffect(() => {
		if (methodsLoading || selectedMethodId) return
		if (paymentMethods.length === 0) return

		const preferredMethod =
			paymentMethods.find(method => method.isDefault) ?? paymentMethods[0]
		if (preferredMethod) {
			setSelectedMethodId(preferredMethod.id)
		}
	}, [methodsLoading, paymentMethods, selectedMethodId])

	// Calculate next payment date (1st of next month)
	const getNextPaymentDate = () => {
		const today = new Date()
		const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
		return nextMonth.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	// Check if payment is overdue (after 5th of month with 5-day grace period)
	const isPaymentOverdue = () => {
		const today = new Date()
		return today.getDate() > 5
	}

	const handlePayment = async () => {
		if (!selectedMethodId) {
			toast.error('Please select a payment method')
			return
		}

		if (!lease || !lease.tenantId) {
			toast.error('No active lease found')
			return
		}

		try {
			const response = await createRentPayment.mutateAsync({
				tenantId: lease.tenantId,
				leaseId: lease.id,
				amount: Math.round(lease.rentAmount * 100), // Convert to cents
				paymentMethodId: selectedMethodId
			})

			if (response.success) {
				toast.success('Payment submitted successfully!', {
					description: `${formatCurrency(lease.rentAmount)} has been charged to your payment method.`
				})

				// Redirect to payment history after success
				router.push('/tenant/payments/history')
			} else {
				throw new Error('Payment failed - no success status')
			}
		} catch (error) {
			logger.error('Failed to process rent payment', {
				action: 'process_rent_payment',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error',
					leaseId: lease?.id,
					paymentMethodId: selectedMethodId
				}
			})
			toast.error('Payment failed', {
				description: 'Please try again or contact support if the issue persists.'
			})
		}
	}

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Pay Rent</h1>
				<p className="text-muted-foreground">
					Make a one-time rent payment using your saved payment method
				</p>
			</div>

			{/* Payment Summary */}
			<div className="grid gap-4 md:grid-cols-3">
				<CardLayout title="Amount Due" description="Monthly rent payment">
					<div className="flex items-center gap-3">
						<DollarSign className="size-8 text-primary" />
						<div>
							{leaseLoading || !lease ? (
								<Skeleton className="h-8 w-32" />
							) : (
								<p className="text-3xl font-bold text-primary">
									{formatCurrency(lease.rentAmount)}
								</p>
							)}
							<p className="text-sm text-muted-foreground mt-1">Due monthly</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout title="Due Date" description="Payment deadline">
					<div className="flex items-center gap-3">
						<Calendar className="size-8 text-amber-600 dark:text-amber-400" />
						<div>
							<p className="text-2xl font-bold">{getNextPaymentDate()}</p>
							<p className="text-sm text-muted-foreground mt-1">
								{isPaymentOverdue() ? (
									<span className="text-destructive font-medium">Overdue</span>
								) : (
									'On time'
								)}
							</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout title="Payment Status" description="Current status">
					<div className="flex items-center gap-3">
						{isPaymentOverdue() ? (
							<>
								<AlertCircle className="size-8 text-destructive" />
								<div>
									<p className="text-lg font-semibold text-destructive">
										Payment Due
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										Please pay now
									</p>
								</div>
							</>
						) : (
							<>
								<CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
								<div>
									<p className="text-lg font-semibold text-green-600 dark:text-green-400">
										No Balance
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										Up to date
									</p>
								</div>
							</>
						)}
					</div>
				</CardLayout>
			</div>

			{/* Payment Method Selection */}
			<CardLayout
				title="Select Payment Method"
				description="Choose how you want to pay"
			>
				<div className="space-y-4">
					{methodsLoading && (
						<div className="space-y-2">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					)}

					{!methodsLoading && paymentMethods.length === 0 && (
						<div className="text-center py-8">
							<CreditCard className="size-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground mb-4">
								No payment methods saved yet
							</p>
							<Link href="/tenant/payments/methods">
								<Button>Add Payment Method</Button>
							</Link>
						</div>
					)}

					{!methodsLoading &&
						paymentMethods.map(method => (
							<button
								key={method.id}
								onClick={() => setSelectedMethodId(method.id)}
								className={`w-full flex items-center justify-between p-4 border rounded-lg transition-all ${
									selectedMethodId === method.id
										? 'border-primary bg-primary/5 ring-2 ring-primary/20'
										: 'border-border hover:border-primary/40 hover:bg-accent/30'
								}`}
								disabled={createRentPayment.isPending}
							>
								<div className="flex items-center gap-4">
									<div
										className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
											selectedMethodId === method.id
												? 'border-primary bg-primary'
												: 'border-border'
										}`}
									>
										{selectedMethodId === method.id && (
											<div className="w-2 h-2 rounded-full bg-white" />
										)}
									</div>
									<CreditCard className="size-5 text-primary" />
									<div className="text-left">
										<p className="font-medium">
												{method.brand || 'Card'} •••• {method.last4}
											</p>
									</div>
								</div>
								{method.isDefault && (
									<Badge variant="outline" className="bg-primary/10">
										Default
									</Badge>
								)}
							</button>
						))}

					{!methodsLoading && paymentMethods.length > 0 && (
						<Link href="/tenant/payments/methods">
							<Button variant="outline" className="w-full">
								Add New Payment Method
							</Button>
						</Link>
					)}
				</div>
			</CardLayout>

			{/* Payment Summary & Submit */}
			{lease && paymentMethods.length > 0 && (
				<CardLayout title="Payment Summary" description="Review before paying">
					<div className="space-y-6">
						<div className="space-y-3">
							<div className="flex items-center justify-between py-2">
								<span className="text-muted-foreground">Monthly Rent</span>
								<span className="font-semibold">
									{formatCurrency(lease.rentAmount)}
								</span>
							</div>
							<div className="flex items-center justify-between py-2 border-t">
								<span className="text-muted-foreground">Processing Fee</span>
								<span className="font-semibold">$0.00</span>
							</div>
							<div className="flex items-center justify-between py-3 border-t border-border/60">
								<span className="text-lg font-bold">Total Amount</span>
								<span className="text-2xl font-bold text-primary">
									{formatCurrency(lease.rentAmount)}
								</span>
							</div>
						</div>

						<div className="flex gap-4 pt-4">
							<Link href="/tenant" className="flex-1">
								<Button
									variant="outline"
									className="w-full"
									disabled={createRentPayment.isPending}
								>
									Cancel
								</Button>
							</Link>
							<Button
								className="flex-1"
								onClick={handlePayment}
								disabled={!selectedMethodId || createRentPayment.isPending}
							>
								{createRentPayment.isPending ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
										Processing...
									</>
								) : (
									<>
										<CreditCard className="size-4 mr-2" />
										Pay {formatCurrency(lease.rentAmount)}
									</>
								)}
							</Button>
						</div>

						<p className="text-xs text-center text-muted-foreground">
							Your payment will be processed securely through Stripe. You will
							receive an email receipt upon successful payment.
						</p>
					</div>
				</CardLayout>
			)}

			{/* Quick Links */}
			<div className="flex gap-4 text-sm">
				<Link
					href="/tenant/payments/history"
					className="text-primary hover:underline"
				>
					View Payment History
				</Link>
				<span className="text-muted-foreground">•</span>
				<Link
					href="/tenant/payments/methods"
					className="text-primary hover:underline"
				>
					Manage Payment Methods
				</Link>
				<span className="text-muted-foreground">•</span>
				<Link href="/tenant/lease" className="text-primary hover:underline">
					View Lease Details
				</Link>
			</div>
		</div>
	)
}
