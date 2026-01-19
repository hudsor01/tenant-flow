'use client'

import { useState } from 'react'
import {
	AlertCircle,
	Building2,
	CheckCircle2,
	Clock,
	CreditCard,
	ExternalLink,
	RefreshCw,
	Wallet
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#components/ui/badge'
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
	useRefreshOnboardingMutation
} from '#hooks/api/use-stripe-connect'
import { apiRequest } from '#lib/api-request'
import { cn } from '#lib/utils'

interface ConnectAccountStatusProps {
	onSetupClick?: () => void
}

export function ConnectAccountStatus({
	onSetupClick
}: ConnectAccountStatusProps) {
	const { data: account, isLoading, error, refetch } = useConnectedAccount()
	const { data: balance } = useConnectedAccountBalance()
	const refreshOnboarding = useRefreshOnboardingMutation()
	const [isOpeningDashboard, setIsOpeningDashboard] = useState(false)

	const handleContinueSetup = async () => {
		try {
			const result = await refreshOnboarding.mutateAsync()
			if (result.data?.onboardingUrl) {
				window.open(result.data.onboardingUrl, '_blank')
			}
		} catch {
			toast.error('Failed to get onboarding link. Please try again.')
		}
	}

	const handleOpenDashboard = async () => {
		setIsOpeningDashboard(true)
		try {
			const response = await apiRequest<{
				success: boolean
				data: { url: string }
			}>('/api/v1/stripe/connect/dashboard-link', { method: 'POST' })
			if (response.data?.url) {
				window.open(response.data.url, '_blank')
			}
		} catch {
			toast.error('Failed to open Stripe Dashboard. Please try again.')
		} finally {
			setIsOpeningDashboard(false)
		}
	}

	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase()
		}).format(amount / 100)
	}

	const getStatusBadge = () => {
		if (!account) return null

		const status = account.onboarding_status || 'pending'

		switch (status) {
			case 'complete':
				return (
					<Badge variant="success" className="gap-1">
						<CheckCircle2 className="size-3" />
						Verified
					</Badge>
				)
			case 'in_progress':
				return (
					<Badge variant="warning" className="gap-1">
						<Clock className="size-3" />
						Setup In Progress
					</Badge>
				)
			default:
				return (
					<Badge variant="secondary" className="gap-1">
						<AlertCircle className="size-3" />
						Pending Setup
					</Badge>
				)
		}
	}

	// Loading state
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

	// Error state
	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wallet className="size-5 text-muted-foreground" />
						Payment Account
					</CardTitle>
					<CardDescription>
						Receive rent payments from your tenants
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
						<p className="text-sm text-destructive">
							Failed to load account status. Please try again.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="mt-4"
						onClick={() => refetch()}
					>
						<RefreshCw className="mr-2 size-4" />
						Retry
					</Button>
				</CardContent>
			</Card>
		)
	}

	// No account yet
	if (!account) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wallet className="size-5 text-muted-foreground" />
						Payment Account
					</CardTitle>
					<CardDescription>
						Receive rent payments from your tenants
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border border-muted bg-muted/50 p-6 text-center">
						<Building2 className="mx-auto mb-4 size-12 text-muted-foreground" />
						<h3 className="mb-2 font-semibold text-foreground">
							Set Up Payment Account
						</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							Connect a Stripe account to receive rent payments directly from
							your tenants. Setup takes about 5 minutes.
						</p>
						<Button onClick={onSetupClick} className="min-h-11">
							Get Started
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	// Has account - show status
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
						<CardDescription>
							{account.business_name || 'Your Stripe Connect account'}
						</CardDescription>
					</div>
					{getStatusBadge()}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Capabilities */}
				<div className="grid gap-4 sm:grid-cols-2">
					<div
						className={cn(
							'flex items-center gap-3 rounded-lg border p-3',
							account.charges_enabled
								? 'border-success/30 bg-success/5'
								: 'border-muted bg-muted/50'
						)}
					>
						<CreditCard
							className={cn(
								'size-5',
								account.charges_enabled
									? 'text-success'
									: 'text-muted-foreground'
							)}
						/>
						<div>
							<p className="text-sm font-medium">
								{account.charges_enabled ? 'Can Receive Payments' : 'Payments'}
							</p>
							<p className="text-xs text-muted-foreground">
								{account.charges_enabled ? 'Enabled' : 'Setup required'}
							</p>
						</div>
					</div>
					<div
						className={cn(
							'flex items-center gap-3 rounded-lg border p-3',
							account.payouts_enabled
								? 'border-success/30 bg-success/5'
								: 'border-muted bg-muted/50'
						)}
					>
						<Building2
							className={cn(
								'size-5',
								account.payouts_enabled
									? 'text-success'
									: 'text-muted-foreground'
							)}
						/>
						<div>
							<p className="text-sm font-medium">
								{account.payouts_enabled ? 'Can Receive Payouts' : 'Payouts'}
							</p>
							<p className="text-xs text-muted-foreground">
								{account.payouts_enabled ? 'Enabled' : 'Setup required'}
							</p>
						</div>
					</div>
				</div>

				{/* Balance (only if account is verified) */}
				{isComplete && balance && (
					<div className="rounded-lg border bg-card p-4">
						<p className="mb-2 text-sm font-medium text-muted-foreground">
							Account Balance
						</p>
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<p className="text-2xl font-bold text-foreground">
									{balance.available?.[0]
										? formatCurrency(
												balance.available[0].amount,
												balance.available[0].currency
											)
										: '$0.00'}
								</p>
								<p className="text-xs text-muted-foreground">Available</p>
							</div>
							<div>
								<p className="text-2xl font-bold text-muted-foreground">
									{balance.pending?.[0]
										? formatCurrency(
												balance.pending[0].amount,
												balance.pending[0].currency
											)
										: '$0.00'}
								</p>
								<p className="text-xs text-muted-foreground">Pending</p>
							</div>
						</div>
					</div>
				)}

				{/* Requirements warning */}
				{requirementsCount > 0 && (
					<div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 size-5 text-warning" />
							<div>
								<p className="font-medium text-warning-foreground">
									{requirementsCount} item
									{requirementsCount > 1 ? 's' : ''} needed
								</p>
								<p className="text-sm text-muted-foreground">
									Complete your verification to enable all features.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="flex flex-wrap gap-2">
					{isComplete ? (
						<Button
							variant="outline"
							onClick={handleOpenDashboard}
							disabled={isOpeningDashboard}
							className="min-h-11"
						>
							{isOpeningDashboard ? (
								<RefreshCw className="mr-2 size-4 animate-spin" />
							) : (
								<ExternalLink className="mr-2 size-4" />
							)}
							Stripe Dashboard
						</Button>
					) : (
						<Button
							onClick={handleContinueSetup}
							disabled={refreshOnboarding.isPending}
							className="min-h-11"
						>
							{refreshOnboarding.isPending ? (
								<RefreshCw className="mr-2 size-4 animate-spin" />
							) : (
								<ExternalLink className="mr-2 size-4" />
							)}
							Continue Setup
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => refetch()}
						className="min-h-11"
					>
						<RefreshCw className="mr-2 size-4" />
						Refresh Status
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
