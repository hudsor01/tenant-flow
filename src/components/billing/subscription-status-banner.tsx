'use client'

import { AlertTriangle, Clock, Info, Lock } from 'lucide-react'
import Link from 'next/link'
import { useSubscriptionStatus } from '#hooks/api/use-billing'

/**
 * SubscriptionStatusBanner — shows warning/lock banner for subscription issues.
 *
 * - trialing: indigo banner with days-remaining counter + upgrade CTA
 * - active: renders nothing (null)
 * - past_due: yellow warning with link to /owner/billing
 * - unpaid/canceled/cancelled: red lock banner with link to /owner/billing
 * - null (no subscription): blue info banner with link to /pricing
 *
 * Include in owner layout to show across all owner pages.
 */
export function SubscriptionStatusBanner() {
	const { data: subscription, isLoading } = useSubscriptionStatus()

	if (isLoading) return null

	// No subscription at all — user needs to subscribe
	if (!subscription || subscription.subscriptionStatus === null) {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
				<Info className="size-5 shrink-0" />
				<p className="flex-1">
					Start your subscription to unlock all property management features.
				</p>
				<Link
					href="/pricing"
					className="shrink-0 font-medium underline underline-offset-4 hover:text-blue-900 dark:hover:text-blue-100"
				>
					View plans
				</Link>
			</div>
		)
	}

	const status = subscription.subscriptionStatus

	// Trialing: days-remaining banner with upgrade CTA. Fall back to a generic
	// trial-active message if trial_ends_at is missing (data gap we still want
	// to surface rather than render nothing).
	if (status === 'trialing') {
		const daysLeft = calculateDaysRemaining(subscription.trialEndsAt)
		const dayWord = daysLeft === 1 ? 'day' : 'days'
		const message =
			daysLeft === null
				? "You're on a free trial — upgrade to keep access."
				: daysLeft <= 0
					? 'Your trial ended. Upgrade to keep access.'
					: `${daysLeft} ${dayWord} left in your trial — upgrade to keep access.`

		return (
			<div className="flex items-center gap-3 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
				<Clock className="size-5 shrink-0" />
				<p className="flex-1">{message}</p>
				<Link
					href="/billing/plans?source=trial_banner"
					className="shrink-0 font-medium underline underline-offset-4 hover:text-indigo-900 dark:hover:text-indigo-100"
				>
					Upgrade
				</Link>
			</div>
		)
	}

	// Active subscriptions need no banner
	if (status === 'active') {
		return null
	}

	// Past due: yellow warning
	if (status === 'past_due') {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
				<AlertTriangle className="size-5 shrink-0" />
				<p className="flex-1">
					Your subscription payment failed. Please update your payment method
					within 7 days to avoid service interruption.
				</p>
				<Link
					href="/owner/billing"
					className="shrink-0 font-medium underline underline-offset-4 hover:text-amber-900 dark:hover:text-amber-100"
				>
					Update billing
				</Link>
			</div>
		)
	}

	// Unpaid, canceled, cancelled: red lock banner
	return (
		<div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-200">
			<Lock className="size-5 shrink-0" />
			<p className="flex-1">
				Your subscription is inactive. Premium features are disabled until
				your subscription is renewed.
			</p>
			<Link
				href="/owner/billing"
				className="shrink-0 font-medium underline underline-offset-4 hover:text-red-900 dark:hover:text-red-100"
			>
				Reactivate
			</Link>
		</div>
	)
}

function calculateDaysRemaining(trialEndsAt: string | null): number | null {
	if (!trialEndsAt) return null
	const endMs = Date.parse(trialEndsAt)
	if (Number.isNaN(endMs)) return null
	const diffMs = endMs - Date.now()
	return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
