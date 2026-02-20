'use client'

import { CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { Spinner } from '#components/ui/loading-spinner'
import type { ConnectedAccountWithIdentity } from '@repo/shared/types/stripe'

interface BillingAccountDetailsProps {
	account: ConnectedAccountWithIdentity
	isActive: boolean
	isRefreshPending: boolean
	onRefreshOnboarding: () => void
}

export function BillingAccountDetails({
	account,
	isActive,
	isRefreshPending,
	onRefreshOnboarding
}: BillingAccountDetailsProps) {
	return (
		<BlurFade delay={0.3} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div className="p-4 border-b border-border">
					<h3 className="font-medium text-foreground">Account Details</h3>
					<p className="text-sm text-muted-foreground">
						Your Stripe Connect account information
					</p>
				</div>
				<div className="p-6 space-y-4">
					<div className="flex items-center justify-between py-3 border-b border-border">
						<span className="text-sm text-muted-foreground">
							Stripe Account ID
						</span>
						<span className="text-sm font-mono">
							{account.stripe_account_id || 'N/A'}
						</span>
					</div>
					<div className="flex items-center justify-between py-3 border-b border-border">
						<span className="text-sm text-muted-foreground">
							Identity Verification
						</span>
						<span
							className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
								isActive
									? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
									: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
							}`}
						>
							{isActive ? (
								<CheckCircle className="w-3.5 h-3.5" />
							) : (
								<Clock className="w-3.5 h-3.5" />
							)}
							{account.identityVerification?.status || 'Incomplete'}
						</span>
					</div>
					<div className="flex items-center justify-between py-3">
						<span className="text-sm text-muted-foreground">Platform</span>
						<span className="text-sm">Stripe Connect</span>
					</div>
				</div>

				{!isActive && (
					<div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
							<div>
								<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
									Complete Your Stripe Onboarding
								</p>
								<p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
									Finish setting up your account to start collecting payments
									from tenants.
								</p>
							</div>
							<Button
								onClick={onRefreshOnboarding}
								disabled={isRefreshPending}
								size="sm"
							>
								{isRefreshPending ? (
									<>
										<Spinner className="mr-2 w-4 h-4 animate-spin" />
										Loading...
									</>
								) : (
									<>
										Complete Onboarding
										<ExternalLink className="ml-2 w-4 h-4" />
									</>
								)}
							</Button>
						</div>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
