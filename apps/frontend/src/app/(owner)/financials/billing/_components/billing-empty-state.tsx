'use client'

import { Building, CreditCard } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { ConnectOnboardingDialog } from './connect-onboarding-dialog'

interface BillingEmptyStateProps {
	showOnboarding: boolean
	onShowOnboarding: (open: boolean) => void
}

export function BillingEmptyState({
	showOnboarding,
	onShowOnboarding
}: BillingEmptyStateProps) {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Billing & Payments</h1>
						<p className="text-muted-foreground">
							Connect and manage your Stripe account for rent collection.
						</p>
					</div>
				</div>
			</BlurFade>

			<BlurFade delay={0.15} inView>
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
						<CreditCard className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						Connect Your Payment Account
					</h2>
					<p className="text-muted-foreground mb-6">
						Connect a Stripe account to start receiving rent payments directly
						from tenants.
					</p>
					<div className="p-4 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 mb-6">
						<p className="text-sm text-amber-700 dark:text-amber-300">
							You need to connect a Stripe account before tenants can pay rent
							online.
						</p>
					</div>
					<button
						onClick={() => onShowOnboarding(true)}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Building className="w-5 h-5" />
						Connect Stripe Account
					</button>
				</div>
			</BlurFade>

			<ConnectOnboardingDialog
				open={showOnboarding}
				onOpenChange={onShowOnboarding}
			/>
		</div>
	)
}
