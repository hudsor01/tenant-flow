'use client'

import { Spinner } from '#components/ui/spinner'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Building, CheckCircle, ExternalLink, XCircle } from 'lucide-react'

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
import { IdentityVerificationCard } from '#components/identity/identity-verification-card'

const stripeLogger = createLogger({ component: 'StripeConnectOnboarding' })

interface ConnectOnboardingDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function ConnectOnboardingDialog({
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

				// Refresh onboarding to get the onboarding URL
				const onboardingResult = await refreshOnboarding.mutateAsync()
				if (onboardingResult.success && onboardingResult.data.onboardingUrl) {
					// Validate URL scheme for security
					try {
						const url = new URL(onboardingResult.data.onboardingUrl)
						// Only allow HTTPS protocol for security
						if (
							url.protocol !== 'https:' ||
							!url.hostname.includes('stripe.com')
						) {
							stripeLogger.error('Invalid or untrusted URL', { metadata: { url: url.href } })
							return
						}
						// Open with security features
						window.open(url.href, '_blank', 'noopener,noreferrer')
					} catch {
						// Invalid URL, do nothing
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
						<Building className="size-5" />
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
						<p className="text-sm text-muted-foreground mt-1">
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
									<Spinner className="mr-2 size-4 animate-spin" />
									Creating...
								</>
							) : (
								<>
									Continue to Stripe
									<ExternalLink className="ml-2 size-4" />
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

export function StripeConnectStatus() {
	const { data: account, isLoading, error } = useConnectedAccount()
	const refreshOnboarding = useRefreshOnboarding()
	const [showOnboarding, setShowOnboarding] = useState(false)

	// Don't show anything while loading
	if (isLoading) {
		return (
			<CardLayout
				title="Payment Collection"
				description="Loading Stripe account status..."
			>
				<div className="flex items-center justify-center py-8">
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
						<div className="rounded-lg border border-amber-20 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
							<p className="text-sm text-amber-900 dark:text-amber-100">
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
				return 'text-green-600 dark:text-green-400'
			case 'pending':
				return 'text-amber-600 dark:text-amber-400'
			default:
				return 'text-gray-600 dark:text-gray-400'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'active':
				return <CheckCircle className="size-5 text-green-600" />
			case 'pending':
				return <Spinner className="size-5 text-amber-60 animate-spin" />
			default:
				return <XCircle className="size-5 text-gray-600" />
		}
	}

	const handleRefreshOnboarding = async () => {
		try {
			const result = await refreshOnboarding.mutateAsync()
			if (result.success && result.data.onboardingUrl) {
				// Validate URL scheme for security
				try {
					const url = new URL(result.data.onboardingUrl)
					// Only allow HTTPS protocol for security
					if (
						url.protocol !== 'https:' ||
						!url.hostname.includes('stripe.com')
					) {
						stripeLogger.error('Invalid or untrusted URL', { metadata: { url: url.href } })
						return
					}
					// Open with security features
					window.open(url.href, '_blank', 'noopener,noreferrer')
					toast.success('Opening Stripe onboarding in new window')
			} catch {
				// Invalid URL, do nothing
				stripeLogger.error('Invalid URL format', {
					metadata: { url: result.data.onboardingUrl }
				})
			}
			}
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
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								{getStatusIcon(account.identityVerification?.status || 'incomplete')}
								<span
									className={`font-medium capitalize ${getStatusColor(
										account.identityVerification?.status || 'incomplete'
									)}`}
								>
									{account.identityVerification?.status || 'incomplete'}
								</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Stripe Account ID: {account.stripe_account_id || 'N/A'}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
						<div className="space-y-1">
							<p className="text-sm font-medium">Charges</p>
							<p className="text-sm text-muted-foreground">
								{account.charges_enabled ? (
									<span className="text-green-600">Enabled</span>
								) : (
									<span className="text-gray-600">Disabled</span>
								)}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium">Payouts</p>
							<p className="text-sm text-muted-foreground">
								{account.payouts_enabled ? (
									<span className="text-green-600">Enabled</span>
								) : (
									<span className="text-gray-600">Disabled</span>
								)}
							</p>
						</div>
					</div>

					{account.identityVerification?.status !== 'active' && (
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
							<p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
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
