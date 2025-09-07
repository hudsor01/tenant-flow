import { useQuery } from '@tanstack/react-query'
import { stripeApi } from '@/lib/api-client'
import type { Tables } from '@repo/shared/types/supabase-generated'

type Subscription = Tables<'Subscription'>

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => stripeApi.getSubscription(),
    retry: (failureCount, error: any) => {
      // Don't retry if user has no subscription (404)
      if (error?.status === 404) {
        return false
      }
      return failureCount < 3
    },
    // Consider subscription data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
  })
}

// Helper hook to check if user has active subscription
export function useHasActiveSubscription() {
  const { data: subscription, isLoading } = useSubscription()
  
  const hasActiveSubscription = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
  
  return {
    hasActiveSubscription,
    subscription,
    isLoading,
    planType: subscription?.planType,
    isTrialing: subscription?.status === 'TRIALING'
  }
}