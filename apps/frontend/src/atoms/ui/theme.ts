import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type Theme = 'light' | 'dark' | 'system'

// Theme atom with persistence (now actually using localStorage)
export const themeAtom = atomWithStorage<Theme>('tenantflow-theme', 'system')

// Sidebar state with persistence
export const sidebarOpenAtom = atomWithStorage<boolean>('tenantflow-sidebar-open', true)

// Online status (runtime only, no persistence needed)
export const isOnlineAtom = atom<boolean>(true)

// Feature flags with persistence
export const featureFlagsAtom = atomWithStorage('tenantflow-feature-flags', {
  darkMode: true,
  betaFeatures: false,
  analyticsEnabled: true,
})

// Actions
export const toggleSidebarAtom = atom(
  null,
  (get, set) => {
    const currentState = get(sidebarOpenAtom)
    set(sidebarOpenAtom, !currentState)
  }
)

export const toggleFeatureAtom = atom(
  null,
  (get, set, feature: 'darkMode' | 'betaFeatures' | 'analyticsEnabled') => {
    const currentFeatures = get(featureFlagsAtom)
    set(featureFlagsAtom, {
      ...currentFeatures,
      [feature]: !currentFeatures[feature]
    })
  }
)