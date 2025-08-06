import { useAuthStore } from '@/stores/auth-store'

// Simple feature checking based on what you already have
export const useFeatures = () => {
  const { user } = useAuthStore()

  return {
    // Plan-based features (use existing subscription)
    hasAdvancedReporting: user?.subscription?.plan === 'tenantflow_max',
    hasBulkOperations: user?.subscription?.plan === 'pro' || user?.subscription?.plan === 'tenantflow_max',
    hasApiAccess: user?.subscription?.plan === 'tenantflow_max',

    // Role-based features (use existing roles)
    hasAdminTools: user?.role === 'ADMIN',
    hasOwnerFeatures: user?.role === 'OWNER',
    hasTenantPortal: user?.role === 'TENANT',

    // Environment-based features
    hasDebugMode: process.env.NODE_ENV === 'development',
    hasBetaFeatures: process.env.NEXT_PUBLIC_ENABLE_BETA === 'true',

    // Simple helper
    canAccess: (feature: string) => {
      switch (feature) {
        case 'advanced-reporting':
          return user?.subscription?.plan === 'tenantflow_max'
        case 'bulk-operations':
          return ['pro', 'tenantflow_max'].includes(user?.subscription?.plan || '')
        case 'admin-panel':
          return user?.role === 'ADMIN'
        default:
          return true
      }
    }
  }
}

// Usage: const { hasAdvancedReporting, canAccess } = useFeatures()
