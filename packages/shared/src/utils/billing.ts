/**
 * Billing utilities
 * Helper functions for billing and subscription display
 */

type PlanType = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'

export const getPlanTypeLabel = (plan: PlanType): string => {
  const labels: Record<PlanType, string> = {
    FREE: 'Free Trial',
    STARTER: 'Starter',
    GROWTH: 'Growth',
    ENTERPRISE: 'Enterprise'
  }
  return labels[plan] || plan
}