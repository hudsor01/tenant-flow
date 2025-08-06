import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Feature flag types
export type FeatureFlag = 
  | 'betaFeatures'
  | 'analyticsEnabled'
  | 'debugMode'
  | 'experimentalUI'
  | 'darkModeEnabled'
  | 'advancedReporting'
  | 'bulkOperations'
  | 'automations'
  | 'apiAccess'
  | 'customIntegrations'
  | 'multiLanguage'
  | 'offlineMode'
  | 'performanceMonitoring'
  | 'aiAssistant'
  | 'advancedSearch'

// Feature flag metadata
export interface FeatureFlagMetadata {
  name: string
  description: string
  category: 'experimental' | 'performance' | 'analytics' | 'ui' | 'integration' | 'accessibility'
  requiresReload?: boolean
  dependencies?: FeatureFlag[]
  conflictsWith?: FeatureFlag[]
  availableFor?: 'all' | 'admin' | 'enterprise' | 'beta'
}

// Remote configuration
interface RemoteConfig {
  flags: Partial<Record<FeatureFlag, boolean>>
  metadata?: Partial<Record<FeatureFlag, FeatureFlagMetadata>>
  lastFetched?: number
  version?: string
}

interface FeatureFlagState {
  // Feature flags
  flags: Record<FeatureFlag, boolean>
  
  // Metadata for each flag
  metadata: Record<FeatureFlag, FeatureFlagMetadata>
  
  // Remote configuration
  remoteConfig: RemoteConfig | null
  remoteConfigEnabled: boolean
  
  // Override flags (for testing/debugging)
  overrides: Partial<Record<FeatureFlag, boolean>>
  
  // User preferences (which flags user has explicitly toggled)
  userPreferences: Partial<Record<FeatureFlag, boolean>>
  
  // Rollout percentages (for gradual feature rollouts)
  rolloutPercentages: Partial<Record<FeatureFlag, number>>
  
  // A/B testing groups
  abTestGroups: Record<string, 'control' | 'variant'>
}

interface FeatureFlagActions {
  // Flag management
  toggleFeature: (flag: FeatureFlag) => void
  setFeature: (flag: FeatureFlag, enabled: boolean) => void
  setMultipleFeatures: (flags: Partial<Record<FeatureFlag, boolean>>) => void
  
  // Override management
  setOverride: (flag: FeatureFlag, enabled: boolean | undefined) => void
  clearOverrides: () => void
  clearOverride: (flag: FeatureFlag) => void
  
  // User preferences
  saveUserPreference: (flag: FeatureFlag, enabled: boolean) => void
  clearUserPreferences: () => void
  
  // Remote configuration
  fetchRemoteConfig: () => Promise<void>
  applyRemoteConfig: (config: RemoteConfig) => void
  toggleRemoteConfig: (enabled: boolean) => void
  
  // Rollout management
  setRolloutPercentage: (flag: FeatureFlag, percentage: number) => void
  isInRollout: (flag: FeatureFlag) => boolean
  
  // A/B testing
  assignToABTest: (testId: string, group: 'control' | 'variant') => void
  getABTestGroup: (testId: string) => 'control' | 'variant' | null
  
  // Utility
  isFeatureEnabled: (flag: FeatureFlag) => boolean
  getEffectiveFlags: () => Record<FeatureFlag, boolean>
  canEnableFeature: (flag: FeatureFlag) => { canEnable: boolean; reason?: string }
  reset: () => void
}

// Default metadata for all features
const defaultMetadata: Record<FeatureFlag, FeatureFlagMetadata> = {
  betaFeatures: {
    name: 'Beta Features',
    description: 'Enable access to beta features that are still in development',
    category: 'experimental',
    availableFor: 'beta',
  },
  analyticsEnabled: {
    name: 'Analytics',
    description: 'Enable analytics and usage tracking',
    category: 'analytics',
    availableFor: 'all',
  },
  debugMode: {
    name: 'Debug Mode',
    description: 'Enable debug logging and developer tools',
    category: 'performance',
    availableFor: 'admin',
  },
  experimentalUI: {
    name: 'Experimental UI',
    description: 'Try out new UI components and layouts',
    category: 'ui',
    requiresReload: true,
    dependencies: ['betaFeatures'],
    availableFor: 'beta',
  },
  darkModeEnabled: {
    name: 'Dark Mode',
    description: 'Enable dark mode theme',
    category: 'ui',
    availableFor: 'all',
  },
  advancedReporting: {
    name: 'Advanced Reporting',
    description: 'Access to advanced reporting and analytics features',
    category: 'analytics',
    dependencies: ['analyticsEnabled'],
    availableFor: 'enterprise',
  },
  bulkOperations: {
    name: 'Bulk Operations',
    description: 'Enable bulk operations for properties, tenants, and leases',
    category: 'experimental',
    availableFor: 'admin',
  },
  automations: {
    name: 'Automations',
    description: 'Enable automated workflows and triggers',
    category: 'experimental',
    dependencies: ['betaFeatures'],
    availableFor: 'enterprise',
  },
  apiAccess: {
    name: 'API Access',
    description: 'Enable API access for third-party integrations',
    category: 'integration',
    availableFor: 'enterprise',
  },
  customIntegrations: {
    name: 'Custom Integrations',
    description: 'Enable custom third-party integrations',
    category: 'integration',
    dependencies: ['apiAccess'],
    availableFor: 'enterprise',
  },
  multiLanguage: {
    name: 'Multi-Language Support',
    description: 'Enable multi-language support for the application',
    category: 'accessibility',
    requiresReload: true,
    availableFor: 'all',
  },
  offlineMode: {
    name: 'Offline Mode',
    description: 'Enable offline mode with local data caching',
    category: 'performance',
    availableFor: 'all',
  },
  performanceMonitoring: {
    name: 'Performance Monitoring',
    description: 'Enable performance monitoring and metrics',
    category: 'performance',
    dependencies: ['analyticsEnabled'],
    availableFor: 'admin',
  },
  aiAssistant: {
    name: 'AI Assistant',
    description: 'Enable AI-powered assistant for property management',
    category: 'experimental',
    dependencies: ['betaFeatures'],
    availableFor: 'beta',
  },
  advancedSearch: {
    name: 'Advanced Search',
    description: 'Enable advanced search with filters and full-text search',
    category: 'ui',
    availableFor: 'all',
  },
}

const initialState: FeatureFlagState = {
  flags: {
    betaFeatures: false,
    analyticsEnabled: true,
    debugMode: false,
    experimentalUI: false,
    darkModeEnabled: true,
    advancedReporting: false,
    bulkOperations: false,
    automations: false,
    apiAccess: false,
    customIntegrations: false,
    multiLanguage: false,
    offlineMode: false,
    performanceMonitoring: false,
    aiAssistant: false,
    advancedSearch: true,
  },
  metadata: defaultMetadata,
  remoteConfig: null,
  remoteConfigEnabled: true,
  overrides: {},
  userPreferences: {},
  rolloutPercentages: {},
  abTestGroups: {},
}

// Generate a stable user ID for rollout calculations
const getUserId = () => {
  if (typeof window === 'undefined') return 'server'
  
  let userId = localStorage.getItem('tenantflow-user-id')
  if (!userId) {
    userId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('tenantflow-user-id', userId)
  }
  return userId
}

// Calculate if user is in rollout percentage
const isInRolloutPercentage = (percentage: number): boolean => {
  const userId = getUserId()
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return (hash % 100) < percentage
}

export const useFeatureFlagStore = create<FeatureFlagState & FeatureFlagActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // Flag management
          toggleFeature: (flag) => {
            const canEnable = get().canEnableFeature(flag)
            if (!canEnable.canEnable) {
              console.warn(`Cannot toggle feature ${flag}: ${canEnable.reason}`)
              return
            }
            
            set((state) => {
              state.flags[flag] = !state.flags[flag]
              state.userPreferences[flag] = !state.flags[flag]
            }, false, 'toggleFeature')
          },
          
          setFeature: (flag, enabled) => {
            if (enabled) {
              const canEnable = get().canEnableFeature(flag)
              if (!canEnable.canEnable) {
                console.warn(`Cannot enable feature ${flag}: ${canEnable.reason}`)
                return
              }
            }
            
            set((state) => {
              state.flags[flag] = enabled
              state.userPreferences[flag] = enabled
            }, false, 'setFeature')
          },
          
          setMultipleFeatures: (flags) => {
            set((state) => {
              Object.entries(flags).forEach(([flag, enabled]) => {
                if (enabled !== undefined) {
                  state.flags[flag as FeatureFlag] = enabled
                  state.userPreferences[flag as FeatureFlag] = enabled
                }
              })
            }, false, 'setMultipleFeatures')
          },
          
          // Override management
          setOverride: (flag, enabled) => {
            set((state) => {
              if (enabled === undefined) {
                delete state.overrides[flag]
              } else {
                state.overrides[flag] = enabled
              }
            }, false, 'setOverride')
          },
          
          clearOverrides: () => set((state) => {
            state.overrides = {}
          }, false, 'clearOverrides'),
          
          clearOverride: (flag) => {
            get().setOverride(flag, undefined)
          },
          
          // User preferences
          saveUserPreference: (flag, enabled) => {
            set((state) => {
              state.userPreferences[flag] = enabled
            }, false, 'saveUserPreference')
          },
          
          clearUserPreferences: () => set((state) => {
            state.userPreferences = {}
          }, false, 'clearUserPreferences'),
          
          // Remote configuration
          fetchRemoteConfig: async () => {
            try {
              // In a real app, this would fetch from an API
              // For now, we'll simulate it
              const mockConfig: RemoteConfig = {
                flags: {},
                lastFetched: Date.now(),
                version: '1.0.0',
              }
              
              get().applyRemoteConfig(mockConfig)
            } catch (error) {
              console.error('Failed to fetch remote config:', error)
            }
          },
          
          applyRemoteConfig: (config) => {
            set((state) => {
              state.remoteConfig = config
              
              // Apply remote flags (but don't override user preferences)
              if (config.flags) {
                Object.entries(config.flags).forEach(([flag, enabled]) => {
                  if (enabled !== undefined && !(flag in state.userPreferences)) {
                    state.flags[flag as FeatureFlag] = enabled
                  }
                })
              }
            }, false, 'applyRemoteConfig')
          },
          
          toggleRemoteConfig: (enabled) => {
            set((state) => {
              state.remoteConfigEnabled = enabled
            }, false, 'toggleRemoteConfig')
          },
          
          // Rollout management
          setRolloutPercentage: (flag, percentage) => {
            set((state) => {
              state.rolloutPercentages[flag] = Math.max(0, Math.min(100, percentage))
            }, false, 'setRolloutPercentage')
          },
          
          isInRollout: (flag) => {
            const percentage = get().rolloutPercentages[flag]
            if (percentage === undefined || percentage === 100) return true
            if (percentage === 0) return false
            return isInRolloutPercentage(percentage)
          },
          
          // A/B testing
          assignToABTest: (testId, group) => {
            set((state) => {
              state.abTestGroups[testId] = group
            }, false, 'assignToABTest')
          },
          
          getABTestGroup: (testId) => {
            return get().abTestGroups[testId] || null
          },
          
          // Utility
          isFeatureEnabled: (flag) => {
            const state = get()
            
            // Check overrides first
            if (flag in state.overrides) {
              return state.overrides[flag]!
            }
            
            // Check rollout percentage
            if (!state.isInRollout(flag)) {
              return false
            }
            
            // Check dependencies
            const metadata = state.metadata[flag]
            if (metadata.dependencies) {
              const dependenciesMet = metadata.dependencies.every(dep => 
                state.isFeatureEnabled(dep)
              )
              if (!dependenciesMet) return false
            }
            
            // Return final flag value
            return state.flags[flag]
          },
          
          getEffectiveFlags: () => {
            const state = get()
            const effectiveFlags: Record<FeatureFlag, boolean> = {} as any
            
            Object.keys(state.flags).forEach((flag) => {
              effectiveFlags[flag as FeatureFlag] = state.isFeatureEnabled(flag as FeatureFlag)
            })
            
            return effectiveFlags
          },
          
          canEnableFeature: (flag) => {
            const state = get()
            const metadata = state.metadata[flag]
            
            // Check dependencies
            if (metadata.dependencies) {
              const missingDeps = metadata.dependencies.filter(dep => !state.flags[dep])
              if (missingDeps.length > 0) {
                return {
                  canEnable: false,
                  reason: `Requires ${missingDeps.join(', ')} to be enabled first`,
                }
              }
            }
            
            // Check conflicts
            if (metadata.conflictsWith) {
              const conflicts = metadata.conflictsWith.filter(conflict => state.flags[conflict])
              if (conflicts.length > 0) {
                return {
                  canEnable: false,
                  reason: `Conflicts with ${conflicts.join(', ')}`,
                }
              }
            }
            
            return { canEnable: true }
          },
          
          reset: () => set(initialState, false, 'reset'),
        }))
      ),
      {
        name: 'tenantflow-feature-flags',
        version: 1,
        partialize: (state) => ({
          userPreferences: state.userPreferences,
          overrides: state.overrides,
          abTestGroups: state.abTestGroups,
        }),
      }
    ),
    {
      name: 'TenantFlow Feature Flags',
    }
  )
)

// Selectors
export const selectFeatureFlags = (state: FeatureFlagState & FeatureFlagActions) => state.flags
export const selectEffectiveFlags = (state: FeatureFlagState & FeatureFlagActions) => state.getEffectiveFlags()
export const selectFeatureMetadata = (state: FeatureFlagState & FeatureFlagActions) => state.metadata
export const selectRemoteConfig = (state: FeatureFlagState & FeatureFlagActions) => state.remoteConfig
export const selectOverrides = (state: FeatureFlagState & FeatureFlagActions) => state.overrides

// Feature-specific selectors
export const selectIsFeatureEnabled = (flag: FeatureFlag) => (state: FeatureFlagState & FeatureFlagActions) =>
  state.isFeatureEnabled(flag)

// Hooks
export const useFeatureFlags = () => useFeatureFlagStore((state) => ({
  flags: state.getEffectiveFlags(),
  toggle: state.toggleFeature,
  set: state.setFeature,
  isEnabled: state.isFeatureEnabled,
  canEnable: state.canEnableFeature,
}))

export const useFeature = (flag: FeatureFlag) => {
  return useFeatureFlagStore((state) => state.isFeatureEnabled(flag))
}

export const useFeatureMetadata = (flag: FeatureFlag) => {
  return useFeatureFlagStore((state) => state.metadata[flag])
}

export const useABTest = (testId: string) => {
  return useFeatureFlagStore((state) => state.getABTestGroup(testId))
}

// Debug hook for development
export const useFeatureDebug = () => useFeatureFlagStore((state) => ({
  flags: state.flags,
  effectiveFlags: state.getEffectiveFlags(),
  overrides: state.overrides,
  userPreferences: state.userPreferences,
  rolloutPercentages: state.rolloutPercentages,
  abTestGroups: state.abTestGroups,
  setOverride: state.setOverride,
  clearOverrides: state.clearOverrides,
}))