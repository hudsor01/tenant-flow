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

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Skeleton } from '@/components/ui/skeleton'
import { usePaymentHistory } from '@/hooks/api/use-payment-history'
import { usePaymentMethods } from '@/hooks/api/use-payment-methods'
import { Calendar, CreditCard, DollarSign, Download } from 'lucide-react'
import Link from 'next/link'

export default function TenantPaymentHistoryPage() {
	const { data: payments = [], isLoading: paymentsLoading } =
		usePaymentHistory()
	const { data: paymentMethods = [], isLoading: methodsLoading } =
		usePaymentMethods()

	// Calculate summary stats
	const totalPaid = payments
		.filter(p => p.status === 'succeeded')
		.reduce((sum, p) => sum + p.amount, 0)
	const lastPayment = payments.find(p => p.status === 'succeeded')
	const hasPayments = payments.length > 0

	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case 'succeeded':
				return 'bg-green-50 text-green-700 border-green-200'
			case 'pending':
				return 'bg-yellow-50 text-yellow-700 border-yellow-200'
			case 'failed':
			case 'canceled':
				return 'bg-red-50 text-red-700 border-red-200'
			default:
				return ''
		}
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount / 100)
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
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
								<p className="text-2xl font-bold">
									{formatCurrency(totalPaid)}
								</p>
							)}
							<p className="text-sm text-muted-foreground mt-1">All time</p>
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
								<p className="text-2xl font-bold">
									{lastPayment.formattedDate}
								</p>
							) : (
								<p className="text-muted-foreground">No payments yet</p>
							)}
							<p className="text-sm text-muted-foreground mt-1">Date</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout title="Next Due" description="Upcoming payment">
					<div className="flex items-center gap-3">
						<Calendar className="size-8 text-accent-main" />
						<div>
							<Skeleton className="h-8 w-24" />
							<p className="text-sm text-muted-foreground mt-1">Due date</p>
						</div>
					</div>
				</CardLayout>
			</div>

			{/* Payment History Table */}
			<CardLayout
				title="All Payments"
				description="Complete payment history for your tenancy"
			>
				<div className="space-y-1">
					{/* Header */}
					<div className="grid grid-cols-5 gap-4 p-4 text-sm font-medium text-muted-foreground border-b">
						<div>Date</div>
						<div>Amount</div>
						<div>Method</div>
						<div>Status</div>
						<div className="text-right">Receipt</div>
					</div>

					{/* Loading State */}
					{paymentsLoading && (
						<div className="space-y-2 p-4">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					)}

					{/* Payment Rows */}
					{!paymentsLoading &&
						hasPayments &&
						payments.map(payment => (
							<div
								key={payment.id}
								className="grid grid-cols-5 gap-4 p-4 items-center border-b hover:bg-accent/5 transition-colors"
							>
								<div>
									<p className="font-medium">{payment.formattedDate}</p>
									<p className="text-sm text-muted-foreground">
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
									<Button variant="ghost" size="sm">
										<Download className="size-4" />
									</Button>
								</div>
							</div>
						))}

					{/* Empty State */}
					{!paymentsLoading && !hasPayments && (
						<div className="text-center py-12">
							<p className="text-muted-foreground">No payment history yet</p>
							<Link href="/tenant/payments">
								<Button variant="outline" className="mt-4">
									Make Your First Payment
								</Button>
							</Link>
						</div>
					)}
				</div>
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
								className="flex items-center justify-between p-4 border rounded-lg"
							>
								<div className="flex items-center gap-3">
									<CreditCard className="size-5 text-accent-main" />
									<div>
										<p className="font-medium">
											{method.brand || 'Card'} •••• {method.last4}
										</p>
										<p className="text-sm text-muted-foreground capitalize">
											{method.type.replace('_', ' ')}
										</p>
									</div>
								</div>
								{method.isDefault && <Badge variant="outline">Default</Badge>}
							</div>
						))}

					{/* Empty State */}
					{!methodsLoading && paymentMethods.length === 0 && (
						<p className="text-sm text-center text-muted-foreground py-4">
							No saved payment methods yet
						</p>
					)}
				</div>
			</CardLayout>
		</div>
	)
}
