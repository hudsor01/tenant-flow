/**
 * Tenant Payment History
 *
 * Shows the tenant's rent payment history:
 * - All past payments with dates and amounts
 * - Payment status (paid, pending, overdue)
 * - Payment method used
 * - Receipts/invoices download
 */
'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { PaymentHistoryCard } from '#components/payments/payment-history-card'
import { PaymentHistoryItem, usePaymentHistory } from '#hooks/api/use-payment-history'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import { useMediaQuery } from '#hooks/use-media-query'
import { formatCurrency } from '#lib/formatters/currency'
import { Calendar, CreditCard, DollarSign, Download } from 'lucide-react'
import Link from 'next/link'

export default function TenantPaymentHistoryPage() {
	const { data: payments = [], isLoading: paymentsLoading } =
		usePaymentHistory()
	const { data: paymentMethods = [], isLoading: methodsLoading } =
		usePaymentMethods()
	const isMobile = useMediaQuery('(max-width: 768px)')

	// Calculate summary stats
	const totalPaid = payments
		.filter(p => p.status === 'succeeded')
		.reduce((sum, p) => sum + p.amount, 0)
	const lastPayment = payments.find(p => p.status === 'succeeded')
	const hasPayments = payments.length > 0

	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case 'succeeded':
				return 'bg-success/10 text-success-foreground border-success/20'
			case 'pending':
				return 'bg-warning/10 text-warning-foreground border-warning/20'
			case 'failed':
			case 'canceled':
				return 'bg-destructive/10 text-destructive-foreground border-destructive/20'
			default:
				return 'bg-muted text-muted-foreground border-border'
		}
	}

	return (
		<div className="space-y-8">
			<div className="flex-between">
				<div>
					<h1 className="typography-h2 tracking-tight">Payment History</h1>
					<p className="text-muted-foreground">
						View all your rent payments and download receipts
					</p>
				</div>
				<Link href="/tenant/payments">
					<Button>
						<CreditCard className="size-4 mr-2" />
						Make Payment
					</Button>
				</Link>
			</div>

			{/* Payment Summary */}
			<div className="grid gap-4 md:grid-cols-3">
				<CardLayout title="Total Paid" description="Lifetime payments">
					<div className="flex items-center gap-3">
						<DollarSign className="size-8 text-accent-main" />
						<div>
							{paymentsLoading ? (
								<Skeleton className="h-8 w-32" />
							) : (
								<p className="typography-h3">
									{formatCurrency(totalPaid)}
								</p>
							)}
							<p className="text-muted mt-1">All time</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout title="Last Payment" description="Most recent payment">
					<div className="flex items-center gap-3">
						<Calendar className="size-8 text-accent-main" />
						<div>
							{paymentsLoading ? (
								<Skeleton className="h-8 w-24" />
							) : lastPayment ? (
								<p className="typography-h3">
									{lastPayment.formattedDate}
								</p>
							) : (
								<p className="text-muted-foreground">No payments yet</p>
							)}
							<p className="text-muted mt-1">Date</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout title="Next Due" description="Upcoming payment">
					<div className="flex items-center gap-3">
						<Calendar className="size-8 text-accent-main" />
						<div>
							<Skeleton className="h-8 w-24" />
							<p className="text-muted mt-1">Due date</p>
						</div>
					</div>
				</CardLayout>
			</div>

		{/* Payment History Table */}
		<CardLayout
			title="All Payments"
			description="Complete payment history for your tenancy"
		>
			{paymentsLoading && (
				<div className="space-y-2 p-4">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			)}

			{!paymentsLoading && hasPayments && (
				isMobile ? (
					<div className="space-y-3">
						{payments.map((payment: PaymentHistoryItem) => (
							<PaymentHistoryCard
								key={payment.id}
								payment={payment}
								statusClass={getStatusBadgeClass(payment.status)}
							/>
						))}
					</div>
				) : (
					<div
						data-testid="payment-history-table"
						data-overflow-guard="true"
						className="overflow-x-auto"
					>
						<div className="min-w-[720px] space-y-1">
							<div className="grid grid-cols-5 gap-4 p-4 text-muted font-medium border-b">
								<div>Date</div>
								<div>Amount</div>
								<div>Method</div>
								<div>Status</div>
								<div className="text-right">Receipt</div>
							</div>

							{payments.map((payment: PaymentHistoryItem) => (
								<div
									key={payment.id}
									data-testid="payment-history-row"
									className="grid grid-cols-5 gap-4 p-4 items-center border-b hover:bg-accent/5 transition-colors"
								>
									<div className="space-y-1">
										<p className="font-medium">{payment.formattedDate}</p>
										<p className="text-muted">
											{payment.description || 'Monthly Rent'}
										</p>
									</div>
									<div>
										<p className="font-semibold">{payment.formattedAmount}</p>
									</div>
									<div>
										<div className="flex items-center gap-2">
											<CreditCard className="size-4 text-muted-foreground" />
											<span className="text-sm">Credit Card</span>
										</div>
									</div>
									<div>
										<Badge
											variant="outline"
											className={getStatusBadgeClass(payment.status)}
										>
											{payment.status === 'succeeded'
												? 'Paid'
												: payment.status.charAt(0).toUpperCase() +
													payment.status.slice(1)}
										</Badge>
									</div>
									<div className="text-right">
										<Button
											variant="ghost"
											size="sm"
											aria-label={`Download receipt for ${payment.formattedDate}`}
											className="gap-2"
										>
											<Download className="size-4" />
											<span className="sr-only">Download receipt</span>
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				)
			)}

			{/* Empty State */}
			{!paymentsLoading && !hasPayments && (
				<div className="text-center section-spacing-compact">
					<p className="text-muted-foreground">No payment history yet</p>
					<Link href="/tenant/payments">
						<Button variant="outline" className="mt-4">
							Make Your First Payment
						</Button>
					</Link>
				</div>
			)}
		</CardLayout>

			{/* Payment Methods */}
			<CardLayout
				title="Saved Payment Methods"
				description="Manage your payment methods for faster checkout"
			>
				<div className="space-y-3">
					{/* Loading State */}
					{methodsLoading && (
						<div className="space-y-2">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					)}

					{/* Payment Method Cards */}
					{!methodsLoading &&
						paymentMethods.map(method => (
							<div
								key={method.id}
								className="flex-between p-4 border rounded-lg"
							>
								<div className="flex items-center gap-3">
									<CreditCard className="size-5 text-accent-main" />
									<div>
										<p className="font-medium">
											{method.brand || 'Card'} •••• {method.last4}
										</p>
										<p className="text-muted capitalize">
											{method.type.replace('_', ' ')}
										</p>
									</div>
								</div>
								{method.isDefault && <Badge variant="outline">Default</Badge>}
							</div>
						))}

					{/* Empty State */}
					{!methodsLoading && paymentMethods.length === 0 && (
						<p className="text-muted text-center py-4">
							No saved payment methods yet
						</p>
					)}
				</div>
			</CardLayout>
		</div>
	)
}
