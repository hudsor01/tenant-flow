'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'
import {
	useConnectedAccount,
	useRefreshOnboardingMutation
} from '#hooks/api/use-stripe-connect'
import { BillingLoadingSkeleton } from './_components/billing-loading-skeleton'
import { BillingEmptyState } from './_components/billing-empty-state'
import { BillingStatCards } from './_components/billing-stat-cards'
import { BillingAccountDetails } from './_components/billing-account-details'

export default function BillingPage() {
	const { data: account, isLoading, error } = useConnectedAccount()
	const refreshOnboarding = useRefreshOnboardingMutation()
	const [showOnboarding, setShowOnboarding] = useState(false)

	const handleRefreshOnboarding = async () => {
		try {
			// Hook performs full-page redirect to Stripe onboarding URL automatically
			await refreshOnboarding.mutateAsync()
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
					<Button variant="outline">
						<Settings className="w-4 h-4" />
						Settings
					</Button>
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
