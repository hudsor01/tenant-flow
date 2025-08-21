import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { PLAN_TYPE } from '@repo/shared'
import type { PlanType } from '@repo/shared'
import { apiClient } from '@/lib/api-client'

interface Subscription {
	id: string
	status: string
	planType: PlanType
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
	trialEnd?: Date
}

export function useSubscription() {
	const { user } = useAuth()
	const [subscription, setSubscription] = useState<Subscription | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!user) {
			setSubscription(null)
			setIsLoading(false)
			return
		}

		const fetchSubscription = async () => {
			try {
				setIsLoading(true)
				const data = await apiClient.get('/subscriptions/current')
				setSubscription(data)
			} catch (err: unknown) {
				// Handle 404 as valid case for free users
				const apiError = err as { code?: string; message?: string }
				if (apiError.code === '404') {
					setSubscription(null)
					return
				}
				const errorMessage =
					err instanceof Error
						? err.message
						: 'Failed to fetch subscription'
				setError(errorMessage)
			} finally {
				setIsLoading(false)
			}
		}

		void fetchSubscription()
	}, [user])

	return {
		subscription,
		isLoading,
		error,
		// Helper methods
		hasActiveSubscription: subscription?.status === 'active',
		isTrialing: subscription?.status === 'trialing',
		isCanceled: subscription?.cancelAtPeriodEnd === true,
		currentPlan: subscription?.planType || PLAN_TYPE.FREETRIAL,
		trialEndsAt: subscription?.trialEnd,
		renewsAt: subscription?.currentPeriodEnd
	}
}

export function useCanAccessPremiumFeatures(): boolean {
	const { subscription } = useSubscription()

	if (!subscription) return false

	// Allow access for active or trialing subscriptions with non-free plans
	const isActiveOrTrialing = ['active', 'trialing'].includes(
		subscription.status
	)
	const isNotFreePlan = subscription.planType !== PLAN_TYPE.FREETRIAL

	return isActiveOrTrialing && isNotFreePlan
}
