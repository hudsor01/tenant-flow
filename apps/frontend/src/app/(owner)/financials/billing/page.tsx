'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import {
	useConnectedAccount,
	useRefreshOnboardingMutation
} from '#hooks/api/use-stripe-connect'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { BillingLoadingSkeleton } from './_components/billing-loading-skeleton'
import { BillingEmptyState } from './_components/billing-empty-state'
import { BillingStatCards } from './_components/billing-stat-cards'
import { BillingAccountDetails } from './_components/billing-account-details'

const stripeLogger = createLogger({ component: 'StripeConnectOnboarding' })

export default function BillingPage() {
	const { data: account, isLoading, error } = useConnectedAccount()
	const refreshOnboarding = useRefreshOnboardingMutation()
	const [showOnboarding, setShowOnboarding] = useState(false)

	const handleRefreshOnboarding = async () => {
		try {
			const result = await refreshOnboarding.mutateAsync()
			if (result.success && result.data.onboardingUrl) {
				try {
					const url = new URL(result.data.onboardingUrl)
					if (
						url.protocol !== 'https:' ||
						!url.hostname.includes('stripe.com')
					) {
						stripeLogger.error('Invalid or untrusted URL', {
							metadata: { url: url.href }
						})
						return
					}
					window.open(url.href, '_blank', 'noopener,noreferrer')
					toast.success('Opening Stripe onboarding in new window')
				} catch {
					stripeLogger.error('Invalid URL format', {
						metadata: { url: result.data.onboardingUrl }
					})
				}
			}
		} catch {
			toast.error('Failed to refresh onboarding link')
		}
	}

	if (isLoading) {
		return <BillingLoadingSkeleton />
	}

	if (error || !account) {
		return (
			<BillingEmptyState
				showOnboarding={showOnboarding}
				onShowOnboarding={setShowOnboarding}
			/>
		)
	}

	const isActive = account.identityVerification?.status === 'active'
	const isPending = account.identityVerification?.status === 'pending'

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Billing & Payments
						</h1>
						<p className="text-muted-foreground">
							Manage your Stripe account and payment settings.
						</p>
					</div>
					<button className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors">
						<Settings className="w-4 h-4" />
						Settings
					</button>
				</div>
			</BlurFade>

			<BillingStatCards
				account={account}
				isActive={isActive}
				isPending={isPending}
			/>

			<BillingAccountDetails
				account={account}
				isActive={isActive}
				isRefreshPending={refreshOnboarding.isPending}
				onRefreshOnboarding={handleRefreshOnboarding}
			/>
		</div>
	)
}
