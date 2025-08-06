/**
 * Modular Zustand Store Architecture
 * 
 * This barrel export provides a clean API for accessing all stores.
 * Each store is focused on a single responsibility for better performance
 * and maintainability.
 */

// Authentication & Session Management
export {
  useAuthStore,
  useAuth,
  useUser,
  useIsAuthenticated,
  useAuthLoading,
  useOrganization,
  useSessionStatus,
  useAuthActions,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading as selectAuthLoading,
  selectOrganization,
  selectSessionStatus,
  selectAuthError,
  selectIsSessionExpired,
  selectUserPermissions,
  selectUserRole,
  selectSubscriptionStatus,
  type AuthUser,
} from './auth-store'

// UI Preferences & Layout
export {
  useUIStore,
  useTheme,
  useSidebar,
  useLayout,
  useAccessibility,
  useIsOnline,
  selectTheme,
  selectSidebar,
  selectLayout,
  selectAccessibility,
  selectNetworkStatus,
  type Theme,
  type ViewMode,
} from './ui-store'

// Notification Management
export {
  useNotificationStore,
  useNotifications,
  useNotificationHistory,
  useNotificationPreferences,
  useNotify,
  selectNotifications,
  selectNotificationHistory,
  selectNotificationPosition,
  selectNotificationPreferences,
  selectUnreadNotifications,
  selectNotificationCount,
  selectHasNotifications,
  type Notification,
  type NotificationType,
  type NotificationPosition,
} from './notification-store'

// Modal Management
export {
  useModalStore,
  useModal,
  useActiveModal,
  useModalStack,
  useHasModals,
  usePropertyModal,
  useTenantModal,
  useSubscriptionModal,
  useConfirmation,
  selectModalStack,
  selectActiveModal,
  selectModalHistory,
  selectIsTransitioning,
  selectBackdrop,
  selectHasModals,
  selectModalCount,
  selectIsModalOpen,
  type Modal,
  type ModalType,
} from './modal-store'

// Feature Flags & Configuration
export {
  useFeatureFlagStore,
  useFeatureFlags,
  useFeature,
  useFeatureMetadata,
  useABTest,
  useFeatureDebug,
  selectFeatureFlags,
  selectEffectiveFlags,
  selectFeatureMetadata,
  selectRemoteConfig,
  selectOverrides,
  selectIsFeatureEnabled,
  type FeatureFlag,
  type FeatureFlagMetadata,
} from './feature-flag-store'

// Business Domain Stores (unchanged, already modular)
export * from './property-store'
export * from './tenant-store'
export * from './lease-store'
export * from './navigation-store'
export * from './form-store'
export * from './workflow-state'

// Selection Store with explicit re-exports to avoid conflicts
export {
  useSelectionStore,
  useBulkActions,
  usePropertySelection,
  useTenantSelection,
  selectBulkSelection,
  selectFilters,
  selectSelectionMode,
  selectHasAnySelection,
  selectSelectedPropertyUnits,
  selectAvailableUnits,
  // Re-export with prefixed names to avoid conflicts
  selectSelectedProperty as selectGlobalSelectedProperty,
  selectSelectedTenant as selectGlobalSelectedTenant,
  selectSelectedUnit as selectGlobalSelectedUnit,
  selectSelectedLease as selectGlobalSelectedLease,
  type SelectionState
} from './selection-store'

// Migration utilities for transitioning from old stores
export { migrateFromOldStores } from './migration'

/**
 * Store initialization helper
 * Call this once at app startup to ensure all stores are properly initialized
 */
export function initializeStores() {
  // Dynamic imports to avoid circular dependencies
  Promise.all([
    import('./ui-store'),
    import('./feature-flag-store'), 
    import('./migration')
  ]).then(([uiStoreModule, featureFlagStoreModule, migrationModule]) => {
    const { useUIStore } = uiStoreModule
    const { useFeatureFlagStore } = featureFlagStoreModule
    const { migrateFromOldStores } = migrationModule
    
    // Get the actual store instances
    const uiStore = useUIStore.getState()
    const featureFlagStore = useFeatureFlagStore.getState()
    
    // Apply system preferences to UI store
    uiStore.applySystemPreferences()
    
    // Fetch remote feature flags
    featureFlagStore.fetchRemoteConfig().catch(console.error)
    
    // Check for migrations
    migrateFromOldStores()
    
    console.warn('[initializeStores] All stores initialized successfully')
  }).catch((error) => {
    console.error('[initializeStores] Failed to initialize stores:', error)
  })
}