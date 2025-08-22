/**
 * JOTAI REMOVED - COMPLETED MIGRATION
 * 
 * Jotai has been completely removed from the codebase.
 * All state management now uses React primitives:
 * - useState for local component state
 * - React Context for shared state (Auth, etc.)
 * - TanStack Query for server state
 * - React Hook Form for form state
 */

// Export dedicated hooks (these take precedence)
export * from './use-auth'
export * from './use-tenants'

// Subscription hooks (consolidated from 4 → 2)
export * from './useSubscription'
export * from './useSubscriptionActions'

// Advanced business hooks (migrated from backup)
// export * from './use-lease-management' // Removed - use real API calls instead

// Server action and optimistic update hooks
export * from '@/lib/hooks/use-server-action'
export * from '@/lib/hooks/use-optimistic-data'

// Auth form hooks
export * from './use-signup'
export * from './use-password-validation'

// Analytics (SIMPLIFIED APPROACH - 2025 PostHog best practices)
// Single analytics hook replaces 7+ complex tracking hooks
export { 
  useAnalytics,
  type UseAnalyticsOptions,
  type UseAnalyticsReturn,
  type EssentialAnalyticsEvent,
  type AnalyticsProperties 
} from './common/use-analytics'
