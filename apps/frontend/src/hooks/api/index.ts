/**
 * Central export for all React Query API hooks
 * Import hooks from here for consistent usage across the app
 */

// Properties
export * from './use-properties'

// Tenants
export * from './use-tenants'

// Leases
export * from './use-leases'

// Units
export * from './use-units'

// Maintenance - Restored with proper type-safe stub implementation
export * from './use-maintenance'

// Dashboard
export * from './use-dashboard'

// Authentication
export * from './use-auth'

// PDF Generation
export * from './use-pdf'

// Billing hooks moved to root hooks directory for better organization
// Now available as: useSubscription and useSubscriptionActions
