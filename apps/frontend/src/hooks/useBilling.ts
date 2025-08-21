import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { PlanType } from '@repo/shared'

export function useBilling() {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const createCheckoutSession = async (
		priceId: string,
		planType: PlanType,
		billingInterval: 'monthly' | 'annual'
	) => {
		setIsLoading(true)
		setError(null)

		try {
			const response = await apiClient.post<{ url: string }>(
				'/stripe/create-checkout-session',
				{
					priceId,
					billingInterval,
					mode: 'subscription',
					successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
					cancelUrl: `${window.location.origin}/pricing`,
					metadata: {
						planType
					}
				}
			)

			if (response.url) {
				window.location.href = response.url
			} else {
				throw new Error('No checkout URL received')
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: 'Failed to create checkout session'
			setError(errorMessage)
			toast.error(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		createCheckoutSession,
		isLoading,
		error
	}
}
