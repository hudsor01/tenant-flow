'use client'

import * as React from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	Building,
	CheckCircle,
	ExternalLink,
	XCircle,
	CreditCard,
	Clock,
	Settings
} from 'lucide-react'
import { Button } from '#components/ui/button'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	useConnectedAccount,
	useCreateConnectedAccount,
	useRefreshOnboarding
} from '#hooks/api/use-stripe-connect'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { Spinner } from '#components/ui/loading-spinner'

const stripeLogger = createLogger({ component: 'StripeConnectOnboarding' })

interface ConnectOnboardingDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

function ConnectOnboardingDialog({
	open,
	onOpenChange
}: ConnectOnboardingDialogProps) {
	const [displayName, setDisplayName] = useState('')
	const [businessName, setBusinessName] = useState('')
	const [entityType, setEntityType] = useState<'individual' | 'company'>(
		'individual'
	)
	const [country, setCountry] = useState('US')

	const createAccount = useCreateConnectedAccount()
	const refreshOnboarding = useRefreshOnboarding()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!displayName.trim()) {
			toast.error('Please enter a display name')
			return
		}

		try {
			const payload: {
				displayName: string
				businessName?: string
				country: string
				entityType: 'individual' | 'company'
			} = {
				displayName: displayName.trim(),
				country,
				entityType
			}
			if (businessName.trim()) {
				payload.businessName = businessName.trim()
			}
			const result = await createAccount.mutateAsync(payload)

			if (result.success && result.data) {
				toast.success('Stripe Connect account created successfully')
				onOpenChange(false)

				const onboardingResult = await refreshOnboarding.mutateAsync()
				if (onboardingResult.success && onboardingResult.data.onboardingUrl) {
					try {
						const url = new URL(onboardingResult.data.onboardingUrl)
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
					} catch {
						stripeLogger.error('Invalid URL format', {
							metadata: { url: onboardingResult.data.onboardingUrl }
						})
					}
				}
			}
		} catch {
			toast.error('Failed to create Stripe account')
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Building className="w-5 h-5" />
						Connect Stripe Account
					</DialogTitle>
					<DialogDescription>
						Connect your Stripe account to start receiving rent payments from
						tenants.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<Field>
						<FieldLabel htmlFor="entityType">Account Type</FieldLabel>
						<Select
							name="entityType"
							value={entityType}
							onValueChange={(value: 'individual' | 'company') =>
								setEntityType(value)
							}
						>
							<SelectTrigger id="entityType">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="individual">Individual</SelectItem>
								<SelectItem value="company">Company</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor="displayName">Display Name *</FieldLabel>
						<Input
							id="displayName"
							name="displayName"
							placeholder="Your name or business name"
							autoComplete="organization"
							value={displayName}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setDisplayName(e.target.value)
							}
							required
						/>
					</Field>
					{entityType === 'company' && (
						<Field>
							<FieldLabel htmlFor="businessName">Business Name</FieldLabel>
							<Input
								id="businessName"
								name="businessName"
								placeholder="Legal business name"
								autoComplete="organization"
								value={businessName}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setBusinessName(e.target.value)
								}
							/>
						</Field>
					)}
					<Field>
						<FieldLabel htmlFor="country">Country *</FieldLabel>
						<Select
							name="country"
							value={country}
							onValueChange={value => setCountry(value)}
						>
							<SelectTrigger id="country">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="US">United States</SelectItem>
								<SelectItem value="CA">Canada</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground mt-1">
							Currently limited to US and Canada only
						</p>
					</Field>
					<div className="rounded-lg border p-4 bg-muted/50">
						<p className="text-sm text-muted-foreground">
							After creating your account, you&apos;ll be redirected to Stripe
							to complete onboarding. This includes verifying your identity and
							bank account details.
						</p>
					</div>
					<div className="flex justify-end gap-2 pt-4 border-t">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={createAccount.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createAccount.isPending}>
							{createAccount.isPending ? (
								<>
									<Spinner className="mr-2 w-4 h-4 animate-spin" />
									Creating...
								</>
							) : (
								<>
									Continue to Stripe
									<ExternalLink className="ml-2 w-4 h-4" />
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export default function BillingPage() {
	const { data: account, isLoading, error } = useConnectedAccount()
	const refreshOnboarding = useRefreshOnboarding()
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
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-72" />
					</div>
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				{/* Content skeleton */}
				<Skeleton className="h-64 rounded-lg" />
			</div>
		)
	}

	// No account exists - show setup prompt
	if (error || !account) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header */}
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

				{/* Empty State */}
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
							onClick={() => setShowOnboarding(true)}
							className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<Building className="w-5 h-5" />
							Connect Stripe Account
						</button>
					</div>
				</BlurFade>

				<ConnectOnboardingDialog
					open={showOnboarding}
					onOpenChange={setShowOnboarding}
				/>
			</div>
		)
	}

	// Account exists - show status
	const isActive = account.identityVerification?.status === 'active'
	const isPending = account.identityVerification?.status === 'pending'

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
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

			{/* Summary Stats - Premium Stat Components */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{isActive && (
							<BorderBeam
								size={80}
								duration={10}
								colorFrom="hsl(142 76% 36%)"
								colorTo="hsl(142 76% 36% / 0.3)"
							/>
						)}
						<StatLabel>Account Status</StatLabel>
						<StatValue
							className={`flex items-baseline capitalize ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
						>
							{account.identityVerification?.status || 'Incomplete'}
						</StatValue>
						<StatIndicator
							variant="icon"
							color={isActive ? 'success' : 'warning'}
						>
							{isActive ? <CheckCircle /> : isPending ? <Clock /> : <XCircle />}
						</StatIndicator>
						<StatDescription>
							{isActive ? 'Verified & active' : 'Needs attention'}
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						{account.charges_enabled && (
							<BorderBeam
								size={80}
								duration={10}
								colorFrom="hsl(142 76% 36%)"
								colorTo="hsl(142 76% 36% / 0.3)"
							/>
						)}
						<StatLabel>Charges</StatLabel>
						<StatValue
							className={`flex items-baseline ${account.charges_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
						>
							{account.charges_enabled ? 'Enabled' : 'Disabled'}
						</StatValue>
						<StatIndicator
							variant="icon"
							color={account.charges_enabled ? 'success' : 'destructive'}
						>
							<CreditCard />
						</StatIndicator>
						<StatDescription>
							{account.charges_enabled
								? 'Can accept payments'
								: 'Complete setup'}
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						{account.payouts_enabled && (
							<BorderBeam
								size={80}
								duration={10}
								colorFrom="hsl(142 76% 36%)"
								colorTo="hsl(142 76% 36% / 0.3)"
							/>
						)}
						<StatLabel>Payouts</StatLabel>
						<StatValue
							className={`flex items-baseline ${account.payouts_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
						>
							{account.payouts_enabled ? 'Enabled' : 'Disabled'}
						</StatValue>
						<StatIndicator
							variant="icon"
							color={account.payouts_enabled ? 'success' : 'destructive'}
						>
							<Building />
						</StatIndicator>
						<StatDescription>
							{account.payouts_enabled ? 'Can receive funds' : 'Complete setup'}
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Account Details */}
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

					{/* Complete Onboarding CTA */}
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
									onClick={handleRefreshOnboarding}
									disabled={refreshOnboarding.isPending}
									size="sm"
								>
									{refreshOnboarding.isPending ? (
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
		</div>
	)
}
