/**
 * Tenant Payment History
 *
 * Shows the tenant's rent payment history:
 * - All past payments with dates and amounts
 * - Payment status (paid, pending, overdue)
 * - Payment method used
 * - Receipts/invoices download
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Calendar, CreditCard, DollarSign, Download } from 'lucide-react'
import Link from 'next/link'

export default function TenantPaymentHistoryPage() {
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
						<CreditCard className="h-4 w-4 mr-2" />
						Make Payment
					</Button>
				</Link>
			</div>

			{/* Payment Summary */}
			<div className="grid gap-4 md:grid-cols-3">
				<CardLayout title="Total Paid" description="Lifetime payments">
					<div className="flex items-center gap-3">
						<DollarSign className="h-8 w-8 text-accent-main" />
						<div>
							<p className="text-2xl font-bold">Loading...</p>
							<p className="text-sm text-muted-foreground">All time</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout title="Last Payment" description="Most recent payment">
					<div className="flex items-center gap-3">
						<Calendar className="h-8 w-8 text-accent-main" />
						<div>
							<p className="text-2xl font-bold">Loading...</p>
							<p className="text-sm text-muted-foreground">Date</p>
						</div>
					</div>
				</CardLayout>

				<CardLayout title="Next Due" description="Upcoming payment">
					<div className="flex items-center gap-3">
						<Calendar className="h-8 w-8 text-accent-main" />
						<div>
							<p className="text-2xl font-bold">Loading...</p>
							<p className="text-sm text-muted-foreground">Due date</p>
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

					{/* Sample Payment Row (TODO: Replace with real data) */}
					<div className="grid grid-cols-5 gap-4 p-4 items-center border-b hover:bg-accent/5 transition-colors">
						<div>
							<p className="font-medium">Dec 1, 2024</p>
							<p className="text-sm text-muted-foreground">Monthly Rent</p>
						</div>
						<div>
							<p className="font-semibold">$1,200.00</p>
						</div>
						<div>
							<div className="flex items-center gap-2">
								<CreditCard className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm">Credit Card</span>
							</div>
						</div>
						<div>
							<Badge
								variant="outline"
								className="bg-green-50 text-green-700 border-green-200"
							>
								Paid
							</Badge>
						</div>
						<div className="text-right">
							<Button variant="ghost" size="sm">
								<Download className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Empty State */}
					<div className="text-center py-12">
						<p className="text-muted-foreground">No payment history yet</p>
						<Link href="/tenant/payments">
							<Button variant="outline" className="mt-4">
								Make Your First Payment
							</Button>
						</Link>
					</div>
				</div>
			</CardLayout>

			{/* Payment Methods */}
			<CardLayout
				title="Saved Payment Methods"
				description="Manage your payment methods for faster checkout"
			>
				<div className="space-y-3">
					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<CreditCard className="h-5 w-5 text-accent-main" />
							<div>
								<p className="font-medium">•••• •••• •••• 4242</p>
								<p className="text-sm text-muted-foreground">Expires 12/25</p>
							</div>
						</div>
						<Badge variant="outline">Default</Badge>
					</div>
					<p className="text-sm text-center text-muted-foreground py-4">
						No saved payment methods yet
					</p>
				</div>
			</CardLayout>
		</div>
	)
}
