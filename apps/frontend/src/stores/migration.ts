/**
 * Migration utilities for transitioning from old monolithic stores to new modular stores
 * This handles migrating persisted state from app-store, global-state, and meStore
 */

import { useAuthStore } from './auth-store'
import { useUIStore } from './ui-store'
import { useFeatureFlagStore } from './feature-flag-store'

// Keys for old persisted stores
const OLD_STORE_KEYS = {
  APP_STORE: 'tenantflow-app-store',
  GLOBAL_STORE: 'tenantflow-global-store',
  ME_STORE: 'tenantflow-me-store',
}

// Migration completed flag key
const MIGRATION_FLAG_KEY = 'tenantflow-store-migration-v2-completed'

interface OldAppStoreState {
  state?: {
    theme?: 'light' | 'dark' | 'system'
    sidebarOpen?: boolean
    features?: {
      darkMode?: boolean
      betaFeatures?: boolean
      analyticsEnabled?: boolean
    }
    user?: {
      id?: string
      email?: string
      name?: string | null
      organizationId?: string | null
    }
    lastActivity?: number
  }
}

interface OldGlobalStoreState {
  state?: {
    theme?: 'light' | 'dark' | 'system'
    sidebarCollapsed?: boolean
    compactMode?: boolean
    features?: {
      betaFeatures?: boolean
      analyticsEnabled?: boolean
      debugMode?: boolean
    }
    organizationId?: string | null
    organizationName?: string | null
  }
}

interface OldMeStoreState {
  state?: {
    me?: {
      id?: string
      email?: string
      name?: string | null
      organizationId?: string
      organizationName?: string
      role?: string
      permissions?: string[]
      subscription?: {
        status: string
        plan: string
        expiresAt?: Date
      }
    }
  }
}

/**
 * Migrate from old stores to new modular stores
 * This function should be called once during app initialization
 */
export function migrateFromOldStores() {
  // Check if migration has already been completed
  if (typeof window === 'undefined' || localStorage.getItem(MIGRATION_FLAG_KEY)) {
    return
  }

  console.warn('Starting store migration from old to new architecture...')

  try {
    // Migrate from app-store
    migrateAppStore()
    
    // Migrate from global-state
    migrateGlobalStore()
    
    // Migrate from meStore
    migrateMeStore()
    
    // Clean up old stores
    cleanupOldStores()
    
    // Mark migration as completed
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true')
    
    console.warn('Store migration completed successfully')
  } catch (error) {
    console.error('Store migration failed:', error)
    // Don't mark as completed so it can be retried
  }
}

/**
 * Migrate data from old app-store
 */
function migrateAppStore() {
  const oldDataRaw = localStorage.getItem(OLD_STORE_KEYS.APP_STORE)
  if (!oldDataRaw) return
  
  try {
    const oldData = JSON.parse(oldDataRaw) as OldAppStoreState
    
    if (oldData.state) {
      const { theme, sidebarOpen, features, user, lastActivity } = oldData.state
      
      // Migrate UI preferences
      if (theme || sidebarOpen !== undefined) {
        const uiStore = useUIStore.getState()
        if (theme) uiStore.setTheme(theme)
        if (sidebarOpen !== undefined) uiStore.setSidebarOpen(sidebarOpen)
      }
      
      // Migrate feature flags
      if (features) {
        const featureStore = useFeatureFlagStore.getState()
        const flagMap: Record<string, boolean> = {}
        
        if (features.betaFeatures !== undefined) {
          flagMap.betaFeatures = features.betaFeatures
        }
        if (features.analyticsEnabled !== undefined) {
          flagMap.analyticsEnabled = features.analyticsEnabled
        }
        if (features.darkMode !== undefined) {
          flagMap.darkModeEnabled = features.darkMode
        }
        
        featureStore.setMultipleFeatures(flagMap)
      }
      
      // Migrate auth data (if not already set)
      if (user && user.id && user.email && lastActivity) {
        const authStore = useAuthStore.getState()
        if (!authStore.user) {
          // Convert old user format to new AuthUser format
          const migratedUser = {
            id: user.id,
            supabaseId: user.id, // Assume same as id for migration
            stripeCustomerId: null,
            email: user.email,
            name: user.name || null,
            phone: null,
            bio: null,
            avatarUrl: null,
            role: 'OWNER' as const, // Default role for migration
            organizationId: user.organizationId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: true, // Assume verified for migration
          }
          authStore.setUser(migratedUser)
          if (lastActivity) {
            authStore.updateLastActivity()
          }
        }
      }
    }
    
    console.warn('Migrated data from app-store')
  } catch (error) {
    console.error('Failed to migrate app-store:', error)
  }
}

/**
 * Migrate data from old global-state
 */
function migrateGlobalStore() {
  const oldDataRaw = localStorage.getItem(OLD_STORE_KEYS.GLOBAL_STORE)
  if (!oldDataRaw) return
  
  try {
    const oldData = JSON.parse(oldDataRaw) as OldGlobalStoreState
    
    if (oldData.state) {
      const { 
        theme, 
        sidebarCollapsed, 
        compactMode, 
        features, 
        organizationId, 
        organizationName 
      } = oldData.state
      
      // Migrate UI preferences
      const uiStore = useUIStore.getState()
      if (theme) uiStore.setTheme(theme)
      if (sidebarCollapsed !== undefined) uiStore.setSidebarCollapsed(sidebarCollapsed)
      if (compactMode !== undefined) uiStore.setCompactMode(compactMode)
      
      // Migrate feature flags
      if (features) {
        const featureStore = useFeatureFlagStore.getState()
        const flagMap: Record<string, boolean> = {}
        
        if (features.betaFeatures !== undefined) {
          flagMap.betaFeatures = features.betaFeatures
        }
        if (features.analyticsEnabled !== undefined) {
          flagMap.analyticsEnabled = features.analyticsEnabled
        }
        if (features.debugMode !== undefined) {
          flagMap.debugMode = features.debugMode
        }
        
        featureStore.setMultipleFeatures(flagMap)
      }
      
      // Migrate organization data
      if (organizationId || organizationName) {
        const authStore = useAuthStore.getState()
        authStore.setOrganization(organizationId || null, organizationName || null)
      }
    }
    
    console.warn('Migrated data from global-state')
  } catch (error) {
    console.error('Failed to migrate global-state:', error)
  }
}

/**
 * Migrate data from old meStore
 */
function migrateMeStore() {
  const oldDataRaw = localStorage.getItem(OLD_STORE_KEYS.ME_STORE)
  if (!oldDataRaw) return
  
  try {
    const oldData = JSON.parse(oldDataRaw) as OldMeStoreState
    
    if (oldData.state?.me) {
      const me = oldData.state.me
      const authStore = useAuthStore.getState()
      
      // Only migrate if we don't already have user data
      if (!authStore.user && me.id && me.email) {
        // Convert old me format to new AuthUser format
        const migratedUser = {
          id: me.id,
          supabaseId: me.id, // Assume same as id for migration
          stripeCustomerId: null,
          email: me.email,
          name: me.name || null,
          phone: null,
          bio: null,
          avatarUrl: null,
          role: (me.role as 'ADMIN' | 'OWNER' | 'TENANT' | 'MANAGER') || 'OWNER', // Use existing role or default
          organizationId: me.organizationId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailVerified: true, // Assume verified for migration
          organizationName: me.organizationName,
          permissions: me.permissions,
          subscription: me.subscription,
        }
        authStore.setUser(migratedUser)
        
        // Also set organization data
        if (me.organizationId) {
          authStore.setOrganization(me.organizationId, me.organizationName)
        }
      }
    }
    
    console.warn('Migrated data from meStore')
  } catch (error) {
    console.error('Failed to migrate meStore:', error)
  }
}

/**
 * Clean up old store data from localStorage
 */
function cleanupOldStores() {
  // Keep old data for a while in case we need to rollback
  // Just rename them with a backup suffix
  Object.entries(OLD_STORE_KEYS).forEach(([key, storageKey]) => {
    const oldData = localStorage.getItem(storageKey)
    if (oldData) {
      // Backup old data
      localStorage.setItem(`${storageKey}-backup`, oldData)
      // Remove original
      localStorage.removeItem(storageKey)
      console.warn(`Backed up and removed old store: ${key}`)
    }
  })
}

/**
 * Rollback migration (for debugging/recovery)
 * This restores the old stores from backups
 */
export function rollbackMigration() {
  if (typeof window === 'undefined') return
  
  console.warn('Rolling back store migration...')
  
  // Restore old stores from backups
  Object.entries(OLD_STORE_KEYS).forEach(([key, storageKey]) => {
    const backupData = localStorage.getItem(`${storageKey}-backup`)
    if (backupData) {
      localStorage.setItem(storageKey, backupData)
      console.warn(`Restored old store: ${key}`)
    }
  })
  
  // Clear new stores
  const newStoreKeys = [
    'tenantflow-auth-store',
    'tenantflow-ui-store',
    'tenantflow-feature-flags',
  ]
  
  newStoreKeys.forEach(key => {
    localStorage.removeItem(key)
  })
  
  // Clear migration flag
  localStorage.removeItem(MIGRATION_FLAG_KEY)
  
  console.warn('Rollback completed. Please refresh the page.')
}

/**
 * Clean up backup data (call this after confirming migration is successful)
 * This should be called manually after a few days/weeks of successful operation
 */
export function cleanupBackups() {
  if (typeof window === 'undefined') return
  
  Object.values(OLD_STORE_KEYS).forEach(storageKey => {
    localStorage.removeItem(`${storageKey}-backup`)
  })
  
  console.warn('Cleaned up old store backups')
}