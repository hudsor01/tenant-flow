'use client'

import { Loader2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Skeleton } from '#components/ui/skeleton'
import { useSubscriptionStatus } from '#hooks/api/use-billing'
import { useBillingPortalMutation } from '#hooks/api/use-billing-mutations'
import { SubscriptionCancelSection } from '#components/settings/sections/subscription-cancel-section'
import { BillingHistorySection } from '#components/settings/sections/billing-history-section'

function getStatusBadge(status: string | null) {
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
		case 'cancelled':
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

export function BillingSettings() {
	const { data: subscriptionStatus, isLoading: statusLoading } =
		useSubscriptionStatus()

	const createPortalSession = useBillingPortalMutation()

	const isLoading = statusLoading

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

			<BillingHistorySection />
			<SubscriptionCancelSection />
		</div>
	)
}
