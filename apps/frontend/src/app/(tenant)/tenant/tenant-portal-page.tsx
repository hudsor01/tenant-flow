'use client'

import '../../(owner)/dashboard.css'
import { Stat, StatLabel, StatValue, StatDescription, StatIndicator } from '#components/ui/stat'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { Skeleton } from '#components/ui/skeleton'
import { Button } from '#components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyDescription } from '#components/ui/empty'
import { TenantOnboardingTour, TenantTourTrigger } from '#components/tours'
import { useTenantPortalDashboard } from '#hooks/api/use-tenant-portal'
import { tenantPortalQueries } from '#hooks/api/queries/tenant-portal-queries'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'
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
	AlertTriangle,
	PenLine
} from 'lucide-react'
import Link from 'next/link'
import { LEASE_STATUS } from '#lib/constants/status-values'

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

	// Check if lease needs tenant signature
	const needsSignature = activeLease?.lease_status === LEASE_STATUS.PENDING_SIGNATURE && !activeLease?.tenant_signed_at

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
			href: '/tenant/payments/new',
			tourId: 'pay-rent'
		},
		{
			title: 'Submit Request',
			description: 'Report maintenance issue',
			icon: Wrench,
			href: '/tenant/maintenance/new',
			tourId: 'maintenance'
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
		<>
			<TenantOnboardingTour />
			<div className="dashboard-root @container/main flex min-h-screen w-full flex-col bg-gradient-to-br from-[var(--color-background)] via-[var(--color-card)] to-[var(--color-muted)]/50 dark:from-[var(--color-background)] dark:via-(--card) dark:to-(--muted)/50">
			<div className="dashboard-main border-b-2 border-(--color-border)/40 bg-gradient-to-b from-[var(--color-background)] via-[var(--color-muted)]/30 to-[var(--color-muted)]/20 dark:border-[var(--color-border)]/40 dark:from-[var(--color-background)] dark:via-[var(--color-muted)]/30 dark:to-[var(--color-muted)]/20">
				<div className="dashboard-section mx-auto max-w-400 px-(--layout-container-padding-x) py-(--layout-content-padding)">
					<div className="flex-between">
						<h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[var(--color-foreground)] via-[var(--color-foreground)]/80 to-[var(--color-foreground)] bg-clip-text text-transparent dark:from-[var(--color-background)] dark:via-(--background) dark:to-[var(--color-background)]">
							Tenant Portal
						</h1>
						<TenantTourTrigger />
					</div>

					{/* Pending Signature Alert */}
					{needsSignature && activeLease && (
						<div className="rounded-lg border border-warning/20 bg-warning/10 dark:border-warning/80 dark:bg-warning/10 p-4 flex-between gap-4" data-testid="pending-signature">
							<div className="flex items-center gap-3">
								<div className="flex-center w-10 h-10 rounded-full bg-warning/20 dark:bg-warning/20">
									<PenLine className="size-5 text-warning dark:text-warning" />
								</div>
								<div>
									<p className="font-semibold text-warning dark:text-warning-foreground">
										Lease Agreement Pending Your Signature
									</p>
									<p className="text-sm text-warning dark:text-warning">
										Please review and sign your lease agreement to complete the process.
									</p>
								</div>
							</div>
							<Link href="/tenant/lease">
								<Button className="gap-2">
									<PenLine className="size-4" />
									Sign Lease
								</Button>
							</Link>
						</div>
					)}

					{/* Stats Cards - Inline from SectionCards pattern */}
					<div data-testid="tenant-dashboard-stats">
						<ErrorBoundary
							fallback={
								<div className="dashboard-panel p-(--layout-content-padding-compact)">
									<p className="text-muted">
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
						<Stat data-testid="stat-card">
							<StatLabel>Current Lease</StatLabel>
							<StatValue>{activeLease?.status === 'active' ? 'Active' : 'Inactive'}</StatValue>
							<StatDescription>
								{activeLease?.start_date && activeLease?.end_date
									? `${formatDate(activeLease.start_date)} - ${formatDate(activeLease.end_date)}`
									: 'No active lease'}
							</StatDescription>
							<StatIndicator variant="icon" color="primary">
								<Home />
							</StatIndicator>
						</Stat>

						{/* Payment Card */}
						<Stat data-testid="stat-card">
							<StatLabel>Next Payment</StatLabel>
							<StatValue>{nextPaymentAmount}</StatValue>
							<StatDescription>Due: {nextPaymentDate}</StatDescription>
							{paymentStatus ? (
								<StatIndicator
									variant="badge"
									color={
										paymentStatus.variant === 'success' ? 'success' :
										paymentStatus.variant === 'warning' ? 'warning' : 'error'
									}
								>
									<paymentStatus.icon className="size-3" />
									{paymentStatus.label}
								</StatIndicator>
							) : (
								<StatIndicator variant="icon" color="primary">
									<Calendar />
								</StatIndicator>
							)}
						</Stat>

						{/* Maintenance Card */}
						<Stat data-testid="stat-card">
							<StatLabel>Maintenance</StatLabel>
							<StatValue>{maintenanceSummary?.open ?? 0}</StatValue>
							<StatDescription>
								{maintenanceSummary?.open === 0
									? 'No open requests'
									: maintenanceSummary?.open === 1
									? '1 request in progress'
									: `${maintenanceSummary.open} requests in progress`}
							</StatDescription>
							<StatIndicator variant="icon" color="primary">
								<Wrench />
							</StatIndicator>
						</Stat>
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
								<p className="text-muted">
									Unable to load quick actions
								</p>
							</div>
						}
					>
						<section className="dashboard-panel" data-density="compact" data-tour="quick-actions">
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
												{...(action.tourId && { 'data-tour': action.tourId })}
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
								<p className="text-muted">Unable to load activity</p>
							</div>
						}
					>
						<div className="dashboard-grid" data-tour="recent-activity">
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
													className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
												>
													{/* Avatar initials in colored circle - Hero Mockup pattern */}
													<div className="size-8 rounded-full bg-success/10 flex-center text-success text-xs font-medium">
														<CheckCircle2 className="size-4" />
													</div>
													{/* Action text with name highlighting */}
													<div className="flex-1 min-w-0">
														<div className="text-sm text-foreground">
															<span className="font-medium">Payment</span>
															<span className="text-muted-foreground"> completed</span>
														</div>
													</div>
													{/* Status badge with rounded-full */}
													<span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
														{formatCurrency(payment.amount / 100)}
													</span>
													{/* Timestamp */}
													<span className="text-xs text-muted-foreground">
														{payment.created_at
															? formatDate(payment.created_at)
															: payment.dueDate
															? formatDate(payment.dueDate)
															: ''}
													</span>
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
														bg: 'bg-warning/10',
														textColor: 'text-warning',
														badgeBg: 'bg-warning/10 text-warning'
													},
													IN_PROGRESS: {
														bg: 'bg-primary/10',
														textColor: 'text-primary',
														badgeBg: 'bg-primary/10 text-primary'
													},
													COMPLETED: {
														bg: 'bg-success/10',
														textColor: 'text-success',
														badgeBg: 'bg-success/10 text-success'
													},
													CANCELED: {
														bg: 'bg-muted',
														textColor: 'text-muted-foreground',
														badgeBg: 'bg-muted text-muted-foreground'
													}
												} as const

												const config =
													statusConfig[request.status as keyof typeof statusConfig] || statusConfig.PENDING

												return (
													<div
														key={request.id}
														className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
													>
														{/* Avatar initials in colored circle - Hero Mockup pattern */}
														<div className={`size-8 rounded-full ${config.bg} flex-center ${config.textColor} text-xs font-medium`}>
															<Wrench className="size-4" />
														</div>
														{/* Action text with name highlighting */}
														<div className="flex-1 min-w-0">
															<div className="text-sm text-foreground">
																<span className="font-medium">{request.title}</span>
															</div>
														</div>
														{/* Status badge with rounded-full */}
														<span className={`text-xs px-2 py-0.5 rounded-full ${config.badgeBg}`}>
															{request.status.replace('_', ' ')}
														</span>
														{/* Timestamp */}
														<span className="text-xs text-muted-foreground">
															{formatDate(request.created_at)}
														</span>
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
		</div>
		</>
	)
}
