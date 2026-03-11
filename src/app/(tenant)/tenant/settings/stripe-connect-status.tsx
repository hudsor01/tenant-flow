'use client'

import { Spinner } from '#components/ui/loading-spinner'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Building, CheckCircle, ExternalLink, XCircle } from 'lucide-react'

import {
	useConnectedAccount,
	useRefreshOnboardingMutation
} from '#hooks/api/use-stripe-connect'
import { IdentityVerificationCard } from '#components/connect/identity-verification-card'
import { ConnectOnboardingDialog } from './stripe-connect-onboarding'

export function StripeConnectStatus() {
	const { data: account, isLoading, error } = useConnectedAccount()
	const refreshOnboarding = useRefreshOnboardingMutation()
	const [showOnboarding, setShowOnboarding] = useState(false)

	// Don't show anything while loading
	if (isLoading) {
		return (
			<CardLayout
				title="Payment Collection"
				description="Loading Stripe account status..."
			>
				<div className="flex-center py-8">
					<Spinner className="size-8 animate-spin text-muted-foreground" />
				</div>
			</CardLayout>
		)
	}

	// No account exists - show setup prompt
	if (error || !account) {
		return (
			<>
				<CardLayout
					title="Payment Collection"
					description="Connect Stripe to collect rent payments from tenants"
				>
					<div className="space-y-4">
						<div className="rounded-lg border border-warning/20 bg-warning/10 p-4 dark:border-warning/80 dark:bg-warning/10">
							<p className="text-sm text-warning dark:text-warning-foreground">
								You need to connect a Stripe account before tenants can pay rent
								online.
							</p>
						</div>
						<Button onClick={() => setShowOnboarding(true)} className="w-full">
							<Building className="mr-2 size-4" />
							Connect Stripe Account
						</Button>
					</div>
				</CardLayout>

				<ConnectOnboardingDialog
					open={showOnboarding}
					onOpenChange={setShowOnboarding}
				/>
			</>
		)
	}

	// Account exists - show status
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'text-success dark:text-success'
			case 'pending':
				return 'text-warning dark:text-warning'
			default:
				return 'text-muted-foreground dark:text-muted-foreground'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'active':
				return <CheckCircle className="size-5 text-success" />
			case 'pending':
				return <Spinner className="size-5 text-warning animate-spin" />
			default:
				return <XCircle className="size-5 text-muted-foreground" />
		}
	}

	const handleRefreshOnboarding = async () => {
		try {
			// Hook performs full-page redirect to Stripe onboarding URL automatically
			await refreshOnboarding.mutateAsync()
		} catch {
			toast.error('Failed to refresh onboarding link')
		}
	}

	return (
		<>
			<CardLayout
				title="Payment Collection"
				description="Stripe Connect account status"
			>
				<div className="space-y-4">
					<div className="flex-between rounded-lg border p-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								{getStatusIcon(
									account.identityVerification?.status || 'incomplete'
								)}
								<span
									className={`font-medium capitalize ${getStatusColor(
										account.identityVerification?.status || 'incomplete'
									)}`}
								>
									{account.identityVerification?.status || 'incomplete'}
								</span>
							</div>
							<p className="text-muted-foreground">
								Stripe Account ID: {account.stripe_account_id || 'N/A'}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
						<div className="space-y-1">
							<p className="typography-small">Charges</p>
							<p className="text-muted-foreground">
								{account.charges_enabled ? (
									<span className="text-success">Enabled</span>
								) : (
									<span className="text-muted-foreground">Disabled</span>
								)}
							</p>
						</div>
						<div className="space-y-1">
							<p className="typography-small">Payouts</p>
							<p className="text-muted-foreground">
								{account.payouts_enabled ? (
									<span className="text-success">Enabled</span>
								) : (
									<span className="text-muted-foreground">Disabled</span>
								)}
							</p>
						</div>
					</div>

					{account.identityVerification?.status !== 'active' && (
						<div className="rounded-lg border border-warning/20 bg-warning/10 p-4 dark:border-warning/80 dark:bg-warning/10">
							<p className="text-sm text-warning dark:text-warning-foreground mb-3">
								Complete your Stripe onboarding to start collecting payments.
							</p>
							<Button
								onClick={handleRefreshOnboarding}
								disabled={refreshOnboarding.isPending}
								variant="outline"
								size="sm"
							>
								{refreshOnboarding.isPending ? (
									<>
										<Spinner className="mr-2 size-4 animate-spin" />
										Loading...
									</>
								) : (
									<>
										Complete Onboarding
										<ExternalLink className="ml-2 size-4" />
									</>
								)}
							</Button>
						</div>
					)}
				</div>
			</CardLayout>
			<div className="mt-6">
				<IdentityVerificationCard />
			</div>
		</>
	)
}
