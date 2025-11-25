'use client'

import '../../(owner)/dashboard.css'
import { ErrorBoundary } from '#components/ui/error-boundary'
import { Skeleton } from '#components/ui/skeleton'
import { useTenantPortalDashboard } from '#hooks/api/use-tenant-portal'
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
	AlertCircle
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
		<main className="dashboard-root @container/main flex min-h-screen w-full flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/50">
			<div className="dashboard-main border-b-2 border-slate-200/40 bg-gradient-to-b from-white via-slate-50/30 to-slate-100/20 dark:border-slate-700/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20">
				<div className="dashboard-section mx-auto max-w-400 px-(--layout-container-padding-x) py-(--layout-content-padding)">
					<h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-white">
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
									<div className="dashboard-widget group relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border hover:scale-[1.02]">
										<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted-foreground/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
										<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
										<div className="relative p-6">
											<div className="flex items-center gap-3 mb-4">
												<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
													<Home className="h-5 w-5" />
												</div>
												<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
													Current Lease
												</p>
											</div>
											<div className="space-y-3">
												<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-primary">
													{activeLease?.status === 'active' ? 'Active' : 'Inactive'}
												</h3>
												<p className="text-sm text-muted-foreground font-medium">
													{activeLease?.start_date && activeLease?.end_date
														? `${formatDate(activeLease.start_date)} - ${formatDate(activeLease.end_date)}`
														: 'No active lease'}
												</p>
											</div>
										</div>
									</div>

									{/* Payment Card */}
									<div className="dashboard-widget group relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border hover:scale-[1.02]">
										<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted-foreground/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
										<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
										<div className="relative p-6">
											<div className="flex items-center gap-3 mb-4">
												<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)]">
													<Calendar className="h-5 w-5" />
												</div>
												<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
													Next Payment
												</p>
											</div>
											<div className="space-y-3">
												<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-[var(--color-success)]">
													{nextPaymentAmount}
												</h3>
												<p className="text-sm text-muted-foreground font-medium">
													Due: {nextPaymentDate}
												</p>
											</div>
										</div>
									</div>

									{/* Maintenance Card */}
									<div className="dashboard-widget group relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border hover:scale-[1.02]">
										<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted-foreground/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
										<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
										<div className="relative p-6">
											<div className="flex items-center gap-3 mb-4">
												<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
													<Wrench className="h-5 w-5" />
												</div>
												<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
													Maintenance
												</p>
											</div>
											<div className="space-y-3">
												<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-[var(--color-warning)]">
													{maintenanceSummary?.open ?? 0}
												</h3>
												<p className="text-sm text-muted-foreground font-medium">
													{maintenanceSummary?.open === 0
														? 'No open requests'
														: maintenanceSummary?.open === 1
														? '1 request in progress'
														: `${maintenanceSummary.open} requests in progress`}
												</p>
											</div>
										</div>
									</div>
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
										<div className="py-12 text-center border-2 border-dashed rounded-lg">
											<Calendar className="size-12 mx-auto mb-3 text-muted-foreground/40" />
											<p className="text-sm text-muted-foreground">No payments yet</p>
										</div>
									) : (
										<div className="space-y-1">
											{recentPayments.slice(0, 5).map(payment => (
												<div
													key={payment.id}
													className="flex items-center justify-between py-4 px-4 rounded-lg hover:bg-muted/50 transition-colors"
												>
													<div className="flex items-center gap-4">
														<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-success)]/10">
															<CheckCircle2 className="size-5 text-[var(--color-success)]" />
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
										<div className="py-12 text-center border-2 border-dashed rounded-lg">
											<Wrench className="size-12 mx-auto mb-3 text-muted-foreground/40" />
											<p className="text-sm text-muted-foreground">
												No maintenance requests yet
											</p>
										</div>
									) : (
										<div className="space-y-1">
											{recentRequests.slice(0, 5).map(request => {
												const statusConfig = {
													PENDING: {
														icon: Clock,
														color: 'text-[var(--color-warning)]',
														bg: 'bg-[var(--color-warning)]/10'
													},
													IN_PROGRESS: {
														icon: Clock,
														color: 'text-[var(--color-primary)]',
														bg: 'bg-[var(--color-primary)]/10'
													},
													COMPLETED: {
														icon: CheckCircle2,
														color: 'text-[var(--color-success)]',
														bg: 'bg-[var(--color-success)]/10'
													},
													CANCELED: {
														icon: AlertCircle,
														color: 'text-muted-foreground',
														bg: 'bg-muted'
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
																<Icon className={`size-5 ${config.color}`} />
															</div>
															<div>
																<p className="font-medium text-sm">{request.title}</p>
																<p className="text-xs text-muted-foreground">
																	{formatDate(request.created_at)}
																</p>
															</div>
														</div>
														<div className="text-right">
															<p className={`text-xs font-semibold ${config.color}`}>
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
