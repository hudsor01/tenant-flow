// Import specific hooks to avoid conflicts
export { 
  useUser,
  useIsAuthenticated,
  useAuthLoading,
  useOrganization,
  useTheme,
  useNotifications,
  useModals,
  useModal,
  useSelectedProperty,
  usePropertyFilters,
  useFilteredProperties,
  useSelectedTenant,
  useTenantFilters,
  useFilteredTenants,
  useActiveTenants
} from './use-atoms'

// Export dedicated hooks (these take precedence)
export * from './use-auth'
export * from './use-properties'
export * from './use-tenants'

// Advanced business hooks (migrated from backup)
export * from './use-lease-management'
export * from './use-maintenance'

// Server action and optimistic update hooks
export * from '@/lib/hooks/use-server-action'
export * from '@/lib/hooks/use-optimistic-data'

// Auth form hooks
export * from './use-signup'
export * from './use-password-validation'
export * from './use-form-state'