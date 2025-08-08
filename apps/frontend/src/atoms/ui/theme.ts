import { atom } from 'jotai'

export type Theme = 'light' | 'dark' | 'system'

// Theme atom with persistence
export const themeAtom = atom<Theme>('system')

// Sidebar state
export const sidebarOpenAtom = atom<boolean>(true)

// Online status
export const isOnlineAtom = atom<boolean>(true)

// Feature flags
export const featureFlagsAtom = atom({
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