/**
 * Stripe-related type definitions
 */

export interface SubscriptionData {
  status: string
  planName: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}
