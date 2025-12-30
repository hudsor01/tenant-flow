'use client'

import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Skeleton } from '#components/ui/skeleton'
import { useSubscriptionStatus } from '#hooks/api/use-subscription-status'
import { useBillingHistory } from '#hooks/api/use-billing-history'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'

export function BillingSettings() {
	const supabase = createClient()
	const { data: subscriptionStatus, isLoading: statusLoading } =
		useSubscriptionStatus()
	const { data: paymentHistory, isLoading: historyLoading } =
		useBillingHistory()

	// Fetch payment methods
	const { data: paymentMethods, isLoading: methodsLoading } = useQuery({
		queryKey: ['payment-methods'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('payment_methods')
				.select('id, type, brand, last_four, exp_month, exp_year')
				.order('created_at', { ascending: false })
			if (error) throw error
			return data || []
		},
		staleTime: 2 * 60 * 1000
	})

	// Create billing portal session
	const createPortalSession = useMutation({
		mutationFn: async () => {
			return apiRequest<{ url: string }>(
				'/api/v1/stripe/create-billing-portal-session',
				{ method: 'POST' }
			)
		},
		onSuccess: data => {
			window.location.href = data.url
		},
		onError: error => {
			const message =
				error instanceof Error && error.message.includes('No Stripe customer')
					? 'Your billing account is not set up yet. Please contact support.'
					: 'Failed to open billing portal. Please try again.'
			toast.error(message)
		}
	})

	const isLoading = statusLoading || historyLoading || methodsLoading

	const getStatusBadge = (status: string | null) => {
		switch (status) {
			case 'active':
				return (
					<span className="text-xs bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded-full">
						Active
					</span>
				)
			case 'trialing':
				return (
					<span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
						Trial
					</span>
				)
			case 'past_due':
				return (
					<span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
						Past Due
					</span>
				)
			case 'canceled':
				return (
					<span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
						Canceled
					</span>
				)
			default:
				return (
					<span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
						No Subscription
					</span>
				)
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="mb-6">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-40 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Billing & Subscription</h2>
					<p className="text-sm text-muted-foreground">
						Manage your subscription and payment methods
					</p>
				</div>
			</BlurFade>

			{/* Current Plan */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6 relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="var(--color-primary)"
						colorTo="oklch(from var(--color-primary) l c h / 0.3)"
					/>
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Current Plan
					</h3>

					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<h4 className="text-xl font-bold">
									{subscriptionStatus?.subscriptionStatus === 'active'
										? 'Professional'
										: 'Free'}
								</h4>
								{getStatusBadge(subscriptionStatus?.subscriptionStatus ?? null)}
							</div>
							{subscriptionStatus?.subscriptionStatus === 'active' && (
								<>
									<p className="text-2xl font-bold text-primary">
										$49
										<span className="text-sm font-normal text-muted-foreground">
											/month
										</span>
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										Up to 50 units · Unlimited tenants
									</p>
									<p className="text-xs text-muted-foreground mt-2">
										Next billing date: January 1, 2025
									</p>
								</>
							)}
							{!subscriptionStatus?.subscriptionStatus && (
								<p className="text-sm text-muted-foreground mt-1">
									Upgrade to unlock premium features
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2">
							<button
								onClick={() => createPortalSession.mutate()}
								disabled={createPortalSession.isPending}
								className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
							>
								{createPortalSession.isPending ? (
									<span className="flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading...
									</span>
								) : (
									'Upgrade Plan'
								)}
							</button>
							<button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
								View All Plans
							</button>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Payment Method */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Payment Method
					</h3>

					{paymentMethods && paymentMethods.length > 0 ? (
						<div className="space-y-3">
							{paymentMethods.map(
								(pm: {
									id: string
									brand: string | null
									last_four: string | null
									exp_month: number | null
									exp_year: number | null
								}) => (
									<div
										key={pm.id}
										className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-14 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white uppercase">
												{pm.brand || 'VISA'}
											</div>
											<div>
												<p className="text-sm font-medium">
													**** **** **** {pm.last_four}
												</p>
												<p className="text-xs text-muted-foreground">
													Expires {pm.exp_month}/{pm.exp_year}
												</p>
											</div>
										</div>
										<button
											className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
											onClick={() => createPortalSession.mutate()}
										>
											Update Card
										</button>
									</div>
								)
							)}
						</div>
					) : (
						<div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-14 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
									VISA
								</div>
								<div>
									<p className="text-sm font-medium">**** **** **** 4242</p>
									<p className="text-xs text-muted-foreground">
										Expires 12/2026
									</p>
								</div>
							</div>
							<button
								className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
								onClick={() => createPortalSession.mutate()}
							>
								Update Card
							</button>
						</div>
					)}
				</section>
			</BlurFade>

			{/* Billing History */}
			<BlurFade delay={0.35} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Billing History
					</h3>

					{paymentHistory && paymentHistory.length > 0 ? (
						<div className="space-y-2">
							{paymentHistory
								.slice(0, 5)
								.map(
									(
										invoice: {
											id: string
											created_at: string
											amount: number
											status: string
										},
										idx: number
									) => (
										<BlurFade key={invoice.id} delay={0.4 + idx * 0.05} inView>
											<div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
												<div className="flex items-center gap-4">
													<span className="text-sm font-medium">
														{invoice.id.slice(0, 12)}
													</span>
													<span className="text-sm text-muted-foreground">
														{new Date(invoice.created_at).toLocaleDateString(
															'en-US',
															{
																month: 'short',
																day: 'numeric',
																year: 'numeric'
															}
														)}
													</span>
												</div>
												<div className="flex items-center gap-4">
													<span className="text-sm font-medium">
														${(invoice.amount / 100).toFixed(2)}
													</span>
													<span className="inline-flex items-center gap-1 text-xs font-medium text-success">
														<CheckCircle className="w-3 h-3" />
														Paid
													</span>
													<button className="text-sm text-primary hover:underline">
														Download
													</button>
												</div>
											</div>
										</BlurFade>
									)
								)}
						</div>
					) : (
						<div className="p-4 text-center">
							<p className="text-sm text-muted-foreground">
								No billing history yet
							</p>
						</div>
					)}

					{paymentHistory && paymentHistory.length > 5 && (
						<div className="mt-4 text-center">
							<button
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
								onClick={() => createPortalSession.mutate()}
							>
								View All Invoices
							</button>
						</div>
					)}
				</section>
			</BlurFade>

			{/* Danger Zone */}
			<BlurFade delay={0.55} inView>
				<section className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
					<h3 className="mb-4 text-sm font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
						<AlertTriangle className="h-4 w-4" />
						Danger Zone
					</h3>

					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Cancel Subscription</p>
							<p className="text-xs text-muted-foreground">
								Your data will be retained for 30 days after cancellation
							</p>
						</div>
						<button
							className="px-4 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors"
							onClick={() => createPortalSession.mutate()}
						>
							Cancel Plan
						</button>
					</div>
				</section>
			</BlurFade>
		</div>
	)
}
