'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Spinner } from '#components/ui/spinner'
import { getStripe } from '#lib/stripe/stripe-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { IdentityVerificationStatus } from '@repo/shared/types/identity'
import {
	useCreateIdentityVerificationSession,
	useIdentityVerificationStatus
} from '#hooks/api/use-identity-verification'
import {
	AlertTriangle,
	CheckCircle,
	ShieldCheck,
	XCircle
} from 'lucide-react'

const logger = createLogger({ component: 'IdentityVerificationCard' })

const statusMap: Record<
	IdentityVerificationStatus,
	{
		title: string
		description: string
		icon: typeof CheckCircle
		btnLabel: string
	}
> = {
	created: {
		title: 'Verification started',
		description: 'Stripe is preparing to verify your identity.',
		icon: ShieldCheck,
		btnLabel: 'Continue verification'
	},
	processing: {
		title: 'Verification in progress',
		description: 'Stripe is reviewing the documents you submitted.',
		icon: ShieldCheck,
		btnLabel: 'Open Stripe Identity'
	},
	requires_input: {
		title: 'More information needed',
		description: 'Stripe requires additional documents before completing verification.',
		icon: AlertTriangle,
		btnLabel: 'Resume verification'
	},
	verified: {
		title: 'Identity verified',
		description: 'Thank you — your identity has been confirmed.',
		icon: CheckCircle,
		btnLabel: 'Verified'
	},
	canceled: {
		title: 'Verification canceled',
		description: 'You can restart the flow whenever you are ready.',
		icon: XCircle,
		btnLabel: 'Restart verification'
	},
	expired: {
		title: 'Verification expired',
		description: 'Start a new verification session to continue onboarding.',
		icon: XCircle,
		btnLabel: 'Start over'
	},
	redacted: {
		title: 'Verification redacted',
		description: 'Stripe redacted the session. Please begin a new verification attempt.',
		icon: AlertTriangle,
		btnLabel: 'Start verification'
	}
}

const defaultStatus = {
	title: 'Identity verification required',
	description: 'Verify your identity to finish onboarding.',
	icon: ShieldCheck,
	btnLabel: 'Verify identity'
}

export function IdentityVerificationCard() {
	const statusQuery = useIdentityVerificationStatus()
	const sessionMutation = useCreateIdentityVerificationSession()
	const status = statusQuery.data?.status ?? null
	const info = (status && statusMap[status]) || defaultStatus
	const Icon = info.icon

	const handleStartVerification = useCallback(async () => {
		if (sessionMutation.isPending) return

		try {
			const response = await sessionMutation.mutateAsync()
			const stripe = await getStripe()

			if (!stripe) {
				throw new Error('Stripe SDK failed to initialize')
			}

			const { error } = await stripe.verifyIdentity(
				response.data.clientSecret
			)

			if (error) {
				throw error
			}

			toast.success('Opening Stripe Identity flow')
		} catch (error) {
			logger.error('Failed to start identity verification', {
				error: error instanceof Error ? error.message : String(error)
			})
			toast.error(
				typeof error === 'string'
					? error
					: error instanceof Error
					? error.message
					: 'Unable to launch identity verification'
			)
		}
	}, [sessionMutation])

	const buttonDisabled =
		status === 'verified' || sessionMutation.isPending || statusQuery.isLoading

	const iconColor =
		status === 'verified' ? 'text-green-600' : status === 'requires_input' ? 'text-amber-600' : 'text-muted-foreground'

	return (
		<CardLayout
			title="Identity verification"
			description="Stripe Identity gives us confidence that you are who you say you are."
		>
			<div className="space-y-4">
				<div className="flex items-start gap-3">
					<Icon className={`size-6 ${iconColor}`} />
					<div>
						<p className="font-medium text-sm">{info.title}</p>
						<p className="text-sm text-muted-foreground">{info.description}</p>
					</div>
				</div>
				<Button
					onClick={handleStartVerification}
					disabled={buttonDisabled}
					className="w-full justify-center"
				>
					{sessionMutation.isPending ? (
						<>
							<Spinner className="mr-2 size-4 animate-spin" />
							Loading...
						</>
					) : (
						info.btnLabel
					)}
				</Button>
			</div>
			{statusQuery.error && (
				<p className="text-xs text-destructive">
					Unable to load verification status. Please refresh the page.
				</p>
			)}
		</CardLayout>
	)
}
