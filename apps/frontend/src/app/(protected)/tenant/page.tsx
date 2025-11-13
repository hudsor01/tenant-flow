/**
 * Tenant Portal Dashboard
 *
 * Self-service portal for tenants to:
 * - View their lease information
 * - Pay rent
 * - View payment history
 * - Submit maintenance requests
 * - View lease documents
 */

'use client'

import '../manage/dashboard.css'
import { ErrorFallback } from '#components/error-boundary/error-fallback'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
// import { TenantAutopayCard } from './autopay-card'
import { TenantPaymentMethods } from './payments/methods/tenant-payment-methods.client'
import { useTenantPortalDashboard } from '#hooks/api/use-tenant-portal'
import { formatCurrency } from '@repo/shared/utils/formatting'
import {
	Calendar,
	CreditCard,
	FileText,
	Home,
	Settings,
	Wrench
} from 'lucide-react'
import Link from 'next/link'

/**
 * Formats next payment date from upcoming payment or returns TBD
 */
function getNextPaymentDate(
	upcomingPayment: { dueDate?: string | null } | null | undefined,
	formatDate: (
		date: string | Date,
		options?: Intl.DateTimeFormatOptions
	) => string
): string {
	if (upcomingPayment?.dueDate) {
		return formatDate(upcomingPayment.dueDate, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}
	return 'TBD'
}

export default function TenantDashboardPage() {
	// Modern helpers - assume valid inputs
	const formatDate = (
		date: string | Date,
		options?: Intl.DateTimeFormatOptions
	): string => {
		const dateObj = new Date(date)
		return dateObj.toLocaleDateString('en-US', options)
	}

	const safeStringReplace = (
		str: string,
		search: string,
		replace: string
	): string => {
		return str.replace(search, replace)
	}

	const {
		data: dashboard,
		isLoading: dashboardLoading,
		error: dashboardError
	} = useTenantPortalDashboard()

	const activeLease = dashboard?.lease ?? null
	const maintenanceSummary = dashboard?.maintenance
	const recentRequests = dashboard?.maintenance?.recent ?? []
	const recentPayments = dashboard?.payments?.recent ?? []
	const upcomingPayment = dashboard?.payments?.upcoming ?? null

	// Format the next payment date from upcoming payment
	const nextPaymentDate = getNextPaymentDate(upcomingPayment, formatDate)

	// Single error source
	const error = dashboardError
	if (error) {
		return <ErrorFallback error={error} />
	}

	return (
		<div className="dashboard-root">
			<div className="dashboard-main space-y-10">
				{/* Welcome Section */}
				<div className="space-y-3">
				<h1 className="text-4xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
					My Tenant Portal
				</h1>
				<p className="text-lg text-muted-foreground max-w-2xl">
					View your lease, make payments, and submit maintenance requests
				</p>
			</div>

			{/* Quick Stats */}
			<div className="dashboard-cards-container grid gap-6 md:grid-cols-3">
				<CardLayout
					title="Current Lease"
					description="Your active lease information"
					className="dashboard-widget group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-linear-to-br from-blue-50/50 to-card dark:from-blue-950/20 dark:to-card border-2 hover:border-blue-200 dark:hover:border-blue-900"
					footer={
						<Link href="/tenant/lease">
							<Button variant="ghost" size="sm" className="w-full">
								View Details
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-clean-accent-100 dark:bg-clean-accent-900/30 group-hover:bg-clean-accent-200 dark:group-hover:bg-clean-accent-900/50 transition-colors">
							<Home className="size-7 text-clean-accent-600 dark:text-clean-accent-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Property</p>
							{dashboardLoading || !activeLease ? (
								<Skeleton className="h-7 w-48" />
							) : (
								<p className="text-xl font-semibold">Active Lease</p>
							)}
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Next Payment"
					description="Upcoming rent payment"
					className="dashboard-widget group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-linear-to-br from-green-50/50 to-card dark:from-green-950/20 dark:to-card border-2 hover:border-green-200 dark:hover:border-green-900"
					footer={
						<Link href="/tenant/payments">
							<Button className="w-full">Pay Now</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
							<Calendar className="size-7 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Due Date</p>
							{dashboardLoading || !activeLease ? (
								<Skeleton className="h-7 w-32" />
							) : (
								<p className="text-xl font-semibold">{nextPaymentDate}</p>
							)}
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance"
					description="Active requests"
					className="dashboard-widget group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-linear-to-br from-amber-50/50 to-card dark:from-amber-950/20 dark:to-card border-2 hover:border-amber-200 dark:hover:border-amber-900"
					footer={
						<Link href="/tenant/maintenance">
							<Button variant="outline" size="sm" className="w-full">
								View All
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
							<Wrench className="size-7 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Open Requests</p>
							{dashboardLoading ? (
								<Skeleton className="h-7 w-12" />
							) : (
								<p className="text-xl font-semibold">
									{maintenanceSummary?.open ?? 0}
								</p>
							)}
						</div>
					</div>
				</CardLayout>
			</div>

			{/* Quick Actions */}
			<CardLayout
				title="Quick Actions"
				description="Common tasks and shortcuts"
				className="dashboard-section dashboard-widget border-2"
			>
				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					<Link href="/tenant/payments" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<CreditCard className="size-6 text-primary" />
							</div>
							<span className="font-medium">Pay Rent</span>
						</Button>
					</Link>

					<Link href="/tenant/maintenance/new" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Wrench className="size-6 text-primary" />
							</div>
							<span className="font-medium">Submit Request</span>
						</Button>
					</Link>

					<Link href="/tenant/documents" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<FileText className="size-6 text-primary" />
							</div>
							<span className="font-medium">View Documents</span>
						</Button>
					</Link>

					<Link href="/tenant/profile" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Settings className="size-6 text-primary" />
							</div>
							<span className="font-medium">My Profile</span>
						</Button>
					</Link>
				</div>
		</CardLayout>

			{/* Autopay & Payment Methods */}
			<section className="dashboard-section space-y-6 border-2 border-border bg-card p-6">
				<div className="flex flex-col gap-1">
					<h2 className="text-2xl font-semibold">Automate payments</h2>
					<p className="text-sm text-muted-foreground">
						Control autopay and manage the payment methods on file.
					</p>
				</div>
				<div className="grid gap-6 lg:grid-cols-2">
					{/* TODO: Replace with Stripe Customer Portal for autopay management */}
					{/* <TenantAutopayCard /> */}
					<TenantPaymentMethods />
				</div>
			</section>

			{/* Recent Activity */}
			<div className="dashboard-section grid gap-6 lg:grid-cols-2">
				<CardLayout
					title="Recent Payments"
					description="Your last 5 rent payments"
					className="dashboard-widget border-2"
					footer={
						<Link href="/tenant/payments/history">
							<Button variant="ghost" size="sm">
								View All Payments
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						{dashboardLoading ? (
							<Skeleton className="h-16 w-full" />
						) : activeLease ? (
							<div className="flex items-center justify-between py-3 border-b border-border/50">
								<div>
									<p className="font-medium">Monthly Rent</p>
									<p className="text-sm text-muted-foreground">
										Due: {nextPaymentDate}
									</p>
								</div>
								<div className="text-right">
									<p className="font-semibold">
										{formatCurrency(activeLease.rentAmount)}
									</p>
									<p className="text-xs text-muted-foreground">
										{activeLease.status === 'ACTIVE'
											? 'Active'
											: activeLease.status}
									</p>
								</div>
							</div>
						) : (
							<div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
								<p className="text-sm text-muted-foreground">
									No active lease found
								</p>
							</div>
						)}

						{dashboardLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-14 w-full" />
								<Skeleton className="h-14 w-full" />
								<Skeleton className="h-14 w-full" />
							</div>
						) : recentPayments.length > 0 ? (
							recentPayments.slice(0, 3).map(payment => (
								<div
									key={payment.id}
									className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
								>
									<div>
										<p className="font-medium">
											{(() => {
												const dateValue = payment.createdAt ?? payment.dueDate
												return dateValue
													? formatDate(dateValue, {
															month: 'short',
															day: 'numeric',
															year: 'numeric'
														})
													: '—'
											})()}
										</p>
										<p className="text-sm text-muted-foreground">
											{payment.status === 'SUCCEEDED' ||
											payment.status === 'PAID'
												? 'Paid'
												: payment.status
													? payment.status.replace('_', ' ')
													: 'Unknown'}
										</p>
									</div>
									<div className="text-right">
										<p className="font-semibold">
											{formatCurrency(payment.amount / 100)}
										</p>
										<p className="text-xs text-muted-foreground">
											{payment.receiptUrl ? 'Receipt available' : 'Processing'}
										</p>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
								<p className="text-sm text-muted-foreground">
									No recent payments found
								</p>
							</div>
						)}
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance Requests"
					description="Your recent requests"
					className="dashboard-widget border-2"
					footer={
						<Link href="/tenant/maintenance">
							<Button variant="ghost" size="sm">
								View All Requests
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						{dashboardLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						) : recentRequests.length > 0 ? (
							recentRequests.slice(0, 3).map(request => (
								<div
									key={request.id}
									className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
								>
									<div>
										<p className="font-medium">{request.title}</p>
										<p className="text-sm text-muted-foreground">
											{formatDate(request.createdAt, {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</p>
									</div>
									<div className="text-right">
										<p
											className={`text-xs font-semibold ${
												request.status === 'COMPLETED'
													? 'text-green-600'
													: request.status === 'IN_PROGRESS'
														? 'text-blue-600'
														: request.status === 'CANCELED'
															? 'text-gray-600'
															: 'text-amber-600'
											}`}
										>
											{safeStringReplace(request.status, '_', ' ')}
										</p>
										<p
											className={`text-xs ${
												request.priority === 'URGENT'
													? 'text-red-600'
													: request.priority === 'HIGH'
														? 'text-orange-600'
														: 'text-muted-foreground'
											}`}
										>
											{request.priority}
										</p>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
								<p className="text-sm text-muted-foreground">
									No maintenance requests yet
								</p>
							</div>
						)}
					</div>
				</CardLayout>
			</div>
		</div>
	</div>
	)
}
