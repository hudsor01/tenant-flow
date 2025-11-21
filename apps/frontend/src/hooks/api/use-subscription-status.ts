/**
 * Real-time Subscription Status Hook
 *
 * Verifies subscription status by making a live API call to the backend,
 * which in turn checks Stripe for the current subscription state.
 *
 * This prevents users from accessing paid features using stale JWT claims
 * if their subscription was cancelled after token issuance.
 *
 * Cache Duration: 5 minutes
 * - Avoids excessive Stripe API calls
 * - Updates frequently enough to catch most subscription changes
 * - For immediate updates, user can refresh the page
 */

import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'UseSubscriptionStatus' })

export interface SubscriptionStatusResponse {
  subscriptionStatus: 'active' | 'trialing' | 'canceled' | 'past_due' | null
  stripeCustomerId: string | null
}

export interface UseSubscriptionStatusOptions {
  /**
   * Enable/disable the query
   * @default true
   */
  enabled?: boolean
}

export function useSubscriptionStatus(
  options: UseSubscriptionStatusOptions = {}
) {
  const { enabled = true } = options

  return useQuery<SubscriptionStatusResponse>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/stripe/subscription-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 401) {
            logger.warn('Subscription status check failed: Unauthorized')
            throw new Error('Authentication required')
          }
          throw new Error(
            `Subscription verification failed: ${response.statusText}`
          )
        }

        const data = await response.json()
        logger.debug('Subscription status verified', {
          status: data.subscriptionStatus
        })
        return data
      } catch (error) {
        logger.error('Failed to verify subscription status', { error })
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    enabled
  })
}
