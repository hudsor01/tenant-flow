/**
 * Layout & Grid Preferences Store - Global Layout State Management
 *
 * Manages user layout preferences, grid configurations, and responsive behavior
 * Follows Zustand best practices and CLAUDE.md guidelines
 */

import { create } from 'zustand'

export type GridLayout = {
	id: string
	name: string
	columns: number
	rows: number
	gap: number
	areas?: string[][]
}

export type PanelSize = {
	width: number
	height: number
	minWidth?: number
	minHeight?: number
}

export interface LayoutState {
	// Sidebar state
	sidebarCollapsed: boolean
	sidebarWidth: number

	// Panel sizes
	panelSizes: Record<string, PanelSize>

	// Grid layouts
	gridLayouts: Record<string, GridLayout>
	activeGridLayout: string | null

	// View preferences
	viewPreferences: {
		dashboard: 'grid' | 'list'
		properties: 'grid' | 'table' | 'cards'
		tenants: 'table' | 'cards'
		maintenance: 'kanban' | 'table' | 'timeline'
		leases: 'table' | 'calendar'
	}

	// Responsive breakpoints
	breakpoints: {
		mobile: number
		tablet: number
		desktop: number
	}

	// Actions
	toggleSidebar: () => void
	setSidebarCollapsed: (collapsed: boolean) => void
	setSidebarWidth: (width: number) => void

	updatePanelSize: (panelId: string, size: PanelSize) => void
	resetPanelSizes: () => void

	saveGridLayout: (layout: GridLayout) => void
	setActiveGridLayout: (layoutId: string | null) => void
	deleteGridLayout: (layoutId: string) => void

	setViewPreference: <K extends keyof LayoutState['viewPreferences']>(
		view: K,
		preference: LayoutState['viewPreferences'][K]
	) => void

	resetToDefaults: () => void
}

// Default layouts
const DEFAULT_GRID_LAYOUTS: Record<string, GridLayout> = {
	dashboard: {
		id: 'dashboard',
		name: 'Dashboard Layout',
		columns: 3,
		rows: 2,
		gap: 16,
		areas: [
			['metrics', 'metrics', 'activity'],
			['charts', 'charts', 'activity']
		]
	},
	properties: {
		id: 'properties',
		name: 'Properties Grid',
		columns: 4,
		rows: 3,
		gap: 12
	}
}

const DEFAULT_VIEW_PREFERENCES: LayoutState['viewPreferences'] = {
	dashboard: 'grid',
	properties: 'grid',
	tenants: 'table',
	maintenance: 'kanban',
	leases: 'table'
}

const DEFAULT_PANEL_SIZES: Record<string, PanelSize> = {
	sidebar: { width: 280, height: 0, minWidth: 200, minHeight: 0 },
	main: { width: 0, height: 0 }, // Flexible
	activity: { width: 320, height: 0, minWidth: 280 }
}

export const useLayoutStore = create<LayoutState>((set, _get) => ({
	sidebarCollapsed: false,
	sidebarWidth: 280,
	panelSizes: DEFAULT_PANEL_SIZES,
	gridLayouts: DEFAULT_GRID_LAYOUTS,
	activeGridLayout: null,
	viewPreferences: DEFAULT_VIEW_PREFERENCES,
	breakpoints: {
		mobile: 768,
		tablet: 1024,
		desktop: 1280
	},

	toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

	setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

	setSidebarWidth: (width) => set({ sidebarWidth: width }),

	updatePanelSize: (panelId, size) =>
		set(state => ({
			panelSizes: {
				...state.panelSizes,
				[panelId]: { ...state.panelSizes[panelId], ...size }
			}
		})),

	resetPanelSizes: () => set({ panelSizes: DEFAULT_PANEL_SIZES }),

	saveGridLayout: (layout) =>
		set(state => ({
			gridLayouts: {
				...state.gridLayouts,
				[layout.id]: layout
			}
		})),

	setActiveGridLayout: (layoutId) => set({ activeGridLayout: layoutId }),

	deleteGridLayout: (layoutId) =>
		set(state => {
			const newLayouts = { ...state.gridLayouts }
			delete newLayouts[layoutId]
			return {
				gridLayouts: newLayouts,
				activeGridLayout: state.activeGridLayout === layoutId ? null : state.activeGridLayout
			}
		}),

	setViewPreference: (view, preference) =>
		set(state => ({
			viewPreferences: {
				...state.viewPreferences,
				[view]: preference
			}
		})),

	resetToDefaults: () =>
		set({
			sidebarCollapsed: false,
			sidebarWidth: 280,
			panelSizes: DEFAULT_PANEL_SIZES,
			gridLayouts: DEFAULT_GRID_LAYOUTS,
			activeGridLayout: null,
			viewPreferences: DEFAULT_VIEW_PREFERENCES
		})
}))