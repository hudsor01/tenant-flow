'use client'

import { useMutation } from '@tanstack/react-query'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { CreditCard, Loader2, ExternalLink } from 'lucide-react'
import { apiRequest } from '#lib/api-request'
import { toast } from 'sonner'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'BillingManagement' })

interface BillingPortalResponse {
	url: string
}

/**
 * Billing Management Component
 *
 * Allows users to manage their Stripe billing through the Customer Portal:
 * - Update payment methods
 * - View invoices and billing history
 * - Manage subscription settings
 *
 * SECURITY:
 * - Portal sessions expire after 1 hour
 * - User ownership verified on backend
 * - Return URL validated to prevent open redirects
 */
export function BillingManagement() {
	const createPortalSession = useMutation<BillingPortalResponse>({
		mutationFn: async () => {
			logger.debug('Creating billing portal session')
			return apiRequest<BillingPortalResponse>(
				'/api/v1/stripe/create-billing-portal-session',
				{
					method: 'POST'
				}
			)
		},
		onSuccess: data => {
			logger.debug('Billing portal session created', { url: data.url })
			// Redirect to Stripe Customer Portal
			window.location.href = data.url
		},
		onError: error => {
			logger.error('Failed to create billing portal session', { error })

			// User-friendly error message
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to open billing portal'

			const message = errorMessage.includes('No Stripe customer')
				? 'Your billing account is not set up yet. Please contact support.'
				: 'Failed to open billing portal. Please try again or contact support.'

			toast.error(message)
		}
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Billing & Payment Methods</CardTitle>
				<CardDescription>
					Manage your subscription, payment methods, and billing history
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Button
					onClick={() => createPortalSession.mutate()}
					disabled={createPortalSession.isPending}
					className="w-full"
					size="lg"
				>
					{createPortalSession.isPending ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Loading...
						</>
					) : (
						<>
							<CreditCard className="mr-2 h-4 w-4" />
							Manage Billing
							<ExternalLink className="ml-2 h-3 w-3" />
						</>
					)}
				</Button>

				<p className="text-sm text-muted-foreground text-center">
					You'll be redirected to our secure billing portal powered by Stripe
				</p>
			</CardContent>
		</Card>
	)
}
