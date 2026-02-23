'use client'

import type { ChangeEvent, FormEvent } from 'react'

import { Spinner } from '#components/ui/loading-spinner'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { Building, ExternalLink } from 'lucide-react'

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
	useCreateConnectedAccountMutation,
	useRefreshOnboardingMutation
} from '#hooks/api/use-stripe-connect'
import { createLogger } from '@repo/shared/lib/frontend-logger'

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

	const createAccount = useCreateConnectedAccountMutation()
	const refreshOnboarding = useRefreshOnboardingMutation()

	const handleSubmit = async (e: FormEvent) => {
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
							stripeLogger.error('Invalid or untrusted URL', {
								metadata: { url: url.href }
							})
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
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
						<p className="text-muted mt-1">
							Currently limited to US and Canada only
						</p>
					</Field>
					<div className="rounded-lg border p-4 bg-muted/50">
						<p className="text-muted">
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
