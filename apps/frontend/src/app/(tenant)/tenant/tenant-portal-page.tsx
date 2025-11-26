'use client'

import '../../(owner)/dashboard.css'
import { StatCard } from '#components/dashboard/stat-card'
import { ErrorBoundary } from '#components/ui/error-boundary'
import { Skeleton } from '#components/ui/skeleton'
import { Badge } from '#components/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyDescription } from '#components/ui/empty'
import { useTenantPortalDashboard } from '#hooks/api/use-tenant-portal'
import { tenantPortalQueries } from '#hooks/api/queries/tenant-portal-queries'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@repo/shared/utils/currency'
import {
	Home,
	Calendar,
	Wrench,
	CreditCard,
	FileText,
	User,
	ArrowRight,
	CheckCircle2,
	Clock,
	AlertCircle,
	AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

/**
 * Tenant Portal Dashboard
 *
 * Self-service portal for tenants to:
 * - View their lease information
 * - Pay rent
 * - View payment history
 * - Submit maintenance requests
 *
 * Scope: Tenant-only data (their property, unit, leases, requests)
 */
export default function TenantDashboardPage() {
	const { data, isLoading } = useTenantPortalDashboard()
	const { data: amountDue, isLoading: isLoadingAmountDue } = useQuery(tenantPortalQueries.amountDue())

	const activeLease = data?.lease
	const upcomingPayment = data?.payments?.upcoming
	const maintenanceSummary = data?.maintenance
	const recentPayments = data?.payments?.recent ?? []
	const recentRequests = data?.maintenance?.recent ?? []

	const formatDate = (date: string | Date) => {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	// Calculate payment status for badge
	const getPaymentStatus = () => {
		if (isLoadingAmountDue) return null
		if (amountDue?.already_paid) {
			return { label: 'Paid', variant: 'success' as const, icon: CheckCircle2 }
		}
		if (amountDue && amountDue.days_late > 0) {
			return { label: 'Overdue', variant: 'destructive' as const, icon: AlertTriangle }
		}
		// Check if due within 5 days
		if (amountDue?.due_date) {
			const dueDate = new Date(amountDue.due_date)
			const today = new Date()
			const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
			if (daysUntilDue <= 5 && daysUntilDue >= 0) {
				return { label: 'Due Soon', variant: 'warning' as const, icon: Clock }
			}
		}
		return null
	}

	const paymentStatus = getPaymentStatus()

	// Format next payment
	const nextPaymentDate = upcomingPayment?.dueDate ? formatDate(upcomingPayment.dueDate) : 'TBD'
	const nextPaymentAmount = upcomingPayment?.amount
		? formatCurrency(upcomingPayment.amount / 100)
		: activeLease?.rent_amount
		? formatCurrency(activeLease.rent_amount)
		: '$0'

	// Quick actions data
	const tenantQuickActions = [
		{
			title: 'Pay Rent',
			description: 'Make a rent payment',
			icon: CreditCard,
			href: '/tenant/payments/new'
		},
		{
			title: 'Submit Request',
			description: 'Report maintenance issue',
			icon: Wrench,
			href: '/tenant/maintenance/new'
		},
		{
			title: 'View Lease',
			description: 'See lease details',
			icon: FileText,
			href: '/tenant/lease'
		},
		{
			title: 'My Profile',
			description: 'Update your information',
			icon: User,
			href: '/tenant/profile'
		}
	]

	return (
		<main className="dashboard-root @container/main flex min-h-screen w-full flex-col bg-gradient-to-br from-[var(--background)] via-[var(--card)] to-[var(--muted)]/50 dark:from-[var(--background)] dark:via-(--card) dark:to-(--muted)/50">
			<div className="dashboard-main border-b-2 border-(--color-border)/40 bg-gradient-to-b from-[var(--background)] via-[var(--muted)]/30 to-[var(--muted)]/20 dark:border-[var(--color-border)]/40 dark:from-[var(--background)] dark:via-[var(--muted)]/30 dark:to-[var(--muted)]/20">
				<div className="dashboard-section mx-auto max-w-400 px-(--layout-container-padding-x) py-(--layout-content-padding)">
					<h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)]/80 to-[var(--foreground)] bg-clip-text text-transparent dark:from-[var(--background)] dark:via-(--background) dark:to-[var(--background)]">
						Tenant Portal
					</h1>

					{/* Stats Cards - Inline from SectionCards pattern */}
					<div data-testid="tenant-dashboard-stats">
						<ErrorBoundary
							fallback={
								<div className="dashboard-panel p-(--layout-content-padding-compact)">
									<p className="text-sm text-muted-foreground">
										Unable to load dashboard stats
									</p>
								</div>
							}
						>
							{isLoading ? (
								<div className="dashboard-cards-container grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 gap-(--layout-gap-items)">
									{[...Array(3)].map((_, i) => (
										<div
											key={i}
											className="dashboard-widget rounded-xl border bg-card p-(--layout-content-padding-compact)"
										>
											<Skeleton className="h-5 w-32 mb-4" />
											<Skeleton className="h-9 w-24 mb-2" />
											<Skeleton className="h-4 w-full" />
										</div>
									))}
								</div>
							) : (
								<div className="dashboard-cards-container grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 gap-(--layout-gap-group)">
									{/* Lease Card */}
									<StatCard
										title="Current Lease"
										value={activeLease?.status === 'active' ? 'Active' : 'Inactive'}
										description={
											activeLease?.start_date && activeLease?.end_date
												? `${formatDate(activeLease.start_date)} - ${formatDate(activeLease.end_date)}`
												: 'No active lease'
										}
										icon={Home}
									/>

									{/* Payment Card */}
									<StatCard
										title="Next Payment"
										value={nextPaymentAmount}
										description={`Due: ${nextPaymentDate}`}
										badge={
											paymentStatus && (
												<Badge
													variant={paymentStatus.variant === 'success' ? 'default' : paymentStatus.variant === 'warning' ? 'outline' : 'destructive'}
													className={
														paymentStatus.variant === 'success'
															? 'status-badge status-badge-success'
															: paymentStatus.variant === 'warning'
															? 'status-badge status-badge-warning'
															: ''
													}
												>
													<paymentStatus.icon className="size-3 mr-1" />
													{paymentStatus.label}
												</Badge>
											)
										}
										icon={Calendar}
									/>

									{/* Maintenance Card */}
									<StatCard
										title="Maintenance"
										value={maintenanceSummary?.open ?? 0}
										description={
											maintenanceSummary?.open === 0
												? 'No open requests'
												: maintenanceSummary?.open === 1
												? '1 request in progress'
												: `${maintenanceSummary.open} requests in progress`
										}
										icon={Wrench}
									/>
								</div>
							)}
						</ErrorBoundary>
					</div>
				</div>
			</div>

			<div className="dashboard-main flex-1 py-(--layout-content-padding) px-(--layout-container-padding-x)">
				<div className="dashboard-content mx-auto max-w-400">
					{/* Quick Actions - Inline from QuickActionsSection pattern */}
					<ErrorBoundary
						fallback={
							<div className="dashboard-panel p-(--layout-content-padding-compact)">
								<p className="text-sm text-muted-foreground">
									Unable to load quick actions
								</p>
							</div>
						}
					>
						<section className="dashboard-panel" data-density="compact">
							<div className="dashboard-panel-header" data-variant="actions">
								<h3 className="dashboard-panel-title">Quick Actions</h3>
								<p className="dashboard-panel-description">
									Common tasks and shortcuts
								</p>
							</div>
							<div className="dashboard-panel-body">
								<div className="dashboard-quick-actions">
									{tenantQuickActions.map(action => {
										const Icon = action.icon
										return (
											<Link
												key={action.href}
												href={action.href}
												className="dashboard-quick-action group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
												aria-label={`${action.title}: ${action.description}`}
											>
												<div className="dashboard-quick-action-icon">
													<Icon className="size-5" aria-hidden="true" />
												</div>
												<div className="dashboard-quick-action-content">
													<p className="dashboard-quick-action-title">
														{action.title}
													</p>
													<p className="dashboard-quick-action-description">
														{action.description}
													</p>
												</div>
												<div className="dashboard-quick-action-chevron">
													<ArrowRight className="size-4 transition-transform duration-200" />
												</div>
											</Link>
										)
									})}
								</div>
							</div>
						</section>
					</ErrorBoundary>

					{/* Recent Activity - Inline from ActivitySection pattern */}
					<ErrorBoundary
						fallback={
							<div className="dashboard-panel p-(--layout-content-padding-compact)">
								<p className="text-sm text-muted-foreground">Unable to load activity</p>
							</div>
						}
					>
						<div className="dashboard-grid">
							{/* Recent Payments */}
							<section className="dashboard-panel" data-density="compact">
								<div className="dashboard-panel-header">
									<div>
										<h3 className="dashboard-panel-title">Recent Payments</h3>
										<p className="dashboard-panel-description">Your payment history</p>
									</div>
									<Link
										href="/tenant/payments/history"
										className="text-sm text-primary hover:underline font-medium"
									>
										View All
									</Link>
								</div>
								<div className="dashboard-panel-body">
									{isLoading ? (
										<div className="space-y-4">
											{[...Array(3)].map((_, i) => (
												<Skeleton key={i} className="h-16 w-full" />
											))}
										</div>
									) : recentPayments.length === 0 ? (
										<Empty>
											<EmptyHeader>
												<EmptyMedia variant="icon">
													<Calendar />
												</EmptyMedia>
												<EmptyDescription>No payments yet</EmptyDescription>
											</EmptyHeader>
										</Empty>
									) : (
										<div className="space-y-1">
											{recentPayments.slice(0, 5).map(payment => (
												<div
													key={payment.id}
													className="flex items-center justify-between py-4 px-4 rounded-lg hover:bg-muted/50 transition-colors"
												>
													<div className="flex items-center gap-4">
														<div className="flex items-center justify-center w-10 h-10 rounded-lg icon-bg-success">
															<CheckCircle2 className="size-5" />
														</div>
														<div>
															<p className="font-medium text-sm">
																{payment.created_at
																	? formatDate(payment.created_at)
																	: payment.dueDate
																	? formatDate(payment.dueDate)
																	: 'Unknown date'}
															</p>
															<p className="text-xs text-muted-foreground">
																{payment.status === 'SUCCEEDED' ||
																payment.status === 'PAID'
																	? 'Payment successful'
																	: payment.status?.replace('_', ' ') ?? 'Unknown'}
															</p>
														</div>
													</div>
													<div className="text-right">
														<p className="font-semibold text-sm">
															{formatCurrency(payment.amount / 100)}
														</p>
														{payment.receiptUrl && (
															<a
																href={payment.receiptUrl}
																className="text-xs text-primary hover:underline"
															>
																Receipt
															</a>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</section>

							{/* Recent Maintenance */}
							<section className="dashboard-panel" data-density="compact">
								<div className="dashboard-panel-header">
									<div>
										<h3 className="dashboard-panel-title">Maintenance Requests</h3>
										<p className="dashboard-panel-description">Your recent requests</p>
									</div>
									<Link
										href="/tenant/maintenance"
										className="text-sm text-primary hover:underline font-medium"
									>
										View All
									</Link>
								</div>
								<div className="dashboard-panel-body">
									{isLoading ? (
										<div className="space-y-4">
											{[...Array(3)].map((_, i) => (
												<Skeleton key={i} className="h-16 w-full" />
											))}
										</div>
									) : recentRequests.length === 0 ? (
										<Empty>
											<EmptyHeader>
												<EmptyMedia variant="icon">
													<Wrench />
												</EmptyMedia>
												<EmptyDescription>No maintenance requests yet</EmptyDescription>
											</EmptyHeader>
										</Empty>
									) : (
										<div className="space-y-1">
											{recentRequests.slice(0, 5).map(request => {
												const statusConfig = {
													PENDING: {
														icon: Clock,
														bg: 'icon-bg-warning',
														textColor: 'text-[var(--color-warning)]'
													},
													IN_PROGRESS: {
														icon: Clock,
														bg: 'icon-bg-primary',
														textColor: 'text-[var(--color-primary)]'
													},
													COMPLETED: {
														icon: CheckCircle2,
														bg: 'icon-bg-success',
														textColor: 'text-[var(--color-success)]'
													},
													CANCELED: {
														icon: AlertCircle,
														bg: 'bg-muted text-muted-foreground',
														textColor: 'text-muted-foreground'
													}
												} as const

												const config =
													statusConfig[request.status as keyof typeof statusConfig] || statusConfig.PENDING
												const Icon = config.icon

												return (
													<div
														key={request.id}
														className="flex items-center justify-between py-4 px-4 rounded-lg hover:bg-muted/50 transition-colors"
													>
														<div className="flex items-center gap-4">
															<div
																className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.bg}`}
															>
																<Icon className="size-5" />
															</div>
															<div>
																<p className="font-medium text-sm">{request.title}</p>
																<p className="text-xs text-muted-foreground">
																	{formatDate(request.created_at)}
																</p>
															</div>
														</div>
														<div className="text-right">
															<p className={`text-xs font-semibold ${config.textColor}`}>
																{request.status.replace('_', ' ')}
															</p>
															<p className="text-xs text-muted-foreground">
																{request.priority}
															</p>
														</div>
													</div>
												)
											})}
										</div>
									)}
								</div>
							</section>
						</div>
					</ErrorBoundary>
				</div>
			</div>
		</main>
	)
}
