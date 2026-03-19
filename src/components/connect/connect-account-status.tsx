'use client'

import {
	Building2,
	ExternalLink,
	RefreshCw,
	Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import {
	useConnectedAccount,
	useConnectedAccountBalance,
	useRefreshOnboardingMutation,
	useStripeDashboardLink
} from '#hooks/api/use-stripe-connect'
import {
	StatusBadge,
	CapabilityCards,
	AccountBalance,
	RequirementsWarning
} from './connect-account-steps'

interface ConnectAccountStatusProps {
	onSetupClick?: () => void
}

export function ConnectAccountStatus({
	onSetupClick
}: ConnectAccountStatusProps) {
	const { data: account, isLoading, error, refetch } = useConnectedAccount()
	const { data: balance } = useConnectedAccountBalance()
	const refreshOnboarding = useRefreshOnboardingMutation()
	const dashboardLink = useStripeDashboardLink()

	const handleContinueSetup = async () => {
		try {
			await refreshOnboarding.mutateAsync()
		} catch {
			toast.error('Failed to get onboarding link. Please try again.')
		}
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-10 w-32" />
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wallet className="size-5 text-muted-foreground" />
						Payment Account
					</CardTitle>
					<CardDescription>Receive rent payments from your tenants</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
						<p className="text-sm text-destructive">
							Failed to load account status. Please try again.
						</p>
					</div>
					<Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
						<RefreshCw className="mr-2 size-4" />
						Retry
					</Button>
				</CardContent>
			</Card>
		)
	}

	if (!account) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wallet className="size-5 text-muted-foreground" />
						Payment Account
					</CardTitle>
					<CardDescription>Receive rent payments from your tenants</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-muted bg-muted/50 p-6 text-center">
						<Building2 className="mx-auto mb-4 size-12 text-muted-foreground" />
						<h3 className="mb-2 font-semibold text-foreground">Set Up Payment Account</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							Connect a Stripe account to receive rent payments directly from your tenants. Setup takes about 5 minutes.
						</p>
						<Button onClick={onSetupClick} className="min-h-11">Get Started</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	const isComplete = account.onboarding_status === 'complete'
	const requirementsCount = account.requirements_due?.length || 0

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Wallet className="size-5 text-primary" />
							Payment Account
						</CardTitle>
						<CardDescription>{account.business_name || 'Your Stripe Connect account'}</CardDescription>
					</div>
					<StatusBadge account={account} />
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<CapabilityCards account={account} />
				{isComplete && balance && <AccountBalance balance={balance} />}
				<RequirementsWarning count={requirementsCount} />
				<div className="flex flex-wrap gap-2">
					{isComplete ? (
						<Button variant="outline" onClick={() => dashboardLink.mutate()} disabled={dashboardLink.isPending} className="min-h-11">
							{dashboardLink.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <ExternalLink className="mr-2 size-4" />}
							Open Dashboard
						</Button>
					) : (
						<Button onClick={handleContinueSetup} disabled={refreshOnboarding.isPending} className="min-h-11">
							{refreshOnboarding.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <ExternalLink className="mr-2 size-4" />}
							Continue Setup
						</Button>
					)}
					<Button variant="ghost" size="sm" onClick={() => refetch()} className="min-h-11">
						<RefreshCw className="mr-2 size-4" />
						Refresh Status
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
