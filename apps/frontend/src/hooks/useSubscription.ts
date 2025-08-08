import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { PLAN_TYPE } from '@repo/shared'
import type { PlanType } from '@repo/shared'

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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/current`, {
          headers: {
            'Authorization': `Bearer ${user.access_token}`
          }
        })

        if (!response.ok) {
          if (response.status === 404) {
            // No subscription found - this is valid for free users
            setSubscription(null)
            return
          }
          throw new Error('Failed to fetch subscription')
        }

        const data = await response.json()
        setSubscription(data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription'
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
    renewsAt: subscription?.currentPeriodEnd,
  }
}

export function useCanAccessPremiumFeatures(): boolean {
  const { subscription } = useSubscription()
  
  if (!subscription) return false
  
  // Allow access for active or trialing subscriptions with non-free plans
  const isActiveOrTrialing = ['active', 'trialing'].includes(subscription.status)
  const isNotFreePlan = subscription.planType !== PLAN_TYPE.FREETRIAL
  
  return isActiveOrTrialing && isNotFreePlan
}