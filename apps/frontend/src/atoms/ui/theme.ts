import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type Theme = 'light' | 'dark' | 'system'

// Theme atom with persistence
export const themeAtom = atomWithStorage<Theme>('tenantflow-theme', 'system')

// Sidebar state with persistence
export const sidebarOpenAtom = atomWithStorage<boolean>(
	'tenantflow-sidebar-open',
	true
)

// Online status (runtime only, no persistence needed)
export const isOnlineAtom = atom<boolean>(true)

// Actions
export const toggleSidebarAtom = atom(null, (_get, set) => {
	const currentState = _get(sidebarOpenAtom)
	set(sidebarOpenAtom, !currentState)
})
