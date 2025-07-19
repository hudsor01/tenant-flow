import { useSubscription } from './useSubscription'

export function useEntitlements() {
  const { data: subscription, isLoading } = useSubscription()

  return {
    isLoading,
    canCreateProperties: true, // Basic entitlement check
    canCreateTenants: true,
    canCreateUnits: true,
    subscription
  }
}

// Export alias for property-specific entitlements
export const usePropertyEntitlements = useEntitlements