import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Navigation state for breadcrumbs and page context
export interface BreadcrumbItem {
  label: string
  path: string
  isActive?: boolean
}

export interface NavigationState {
  // Breadcrumb navigation
  breadcrumbs: BreadcrumbItem[]
  
  // Page context
  currentPage: {
    title: string
    subtitle?: string
    section: 'dashboard' | 'properties' | 'tenants' | 'leases' | 'maintenance' | 'reports' | 'settings' | 'tools'
    subsection?: string
  }
  
  // Navigation history (for back/forward functionality)
  navigationHistory: {
    path: string
    title: string
    timestamp: Date
  }[]
  
  // Quick actions state
  quickActions: {
    isOpen: boolean
    searchQuery: string
    recentActions: {
      id: string
      label: string
      path: string
      icon?: string
      timestamp: Date
    }[]
  }
}

interface NavigationActions {
  // Breadcrumb management
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
  addBreadcrumb: (breadcrumb: BreadcrumbItem) => void
  updateBreadcrumb: (index: number, breadcrumb: Partial<BreadcrumbItem>) => void
  clearBreadcrumbs: () => void
  
  // Page context
  setCurrentPage: (page: NavigationState['currentPage']) => void
  updatePageTitle: (title: string, subtitle?: string) => void
  
  // Navigation history
  addToHistory: (path: string, title: string) => void
  clearHistory: () => void
  
  // Quick actions
  setQuickActionsOpen: (isOpen: boolean) => void
  setQuickActionsSearch: (query: string) => void
  addRecentAction: (action: Omit<NavigationState['quickActions']['recentActions'][0], 'timestamp'>) => void
  clearRecentActions: () => void
}

const initialState: NavigationState = {
  breadcrumbs: [],
  currentPage: {
    title: 'Dashboard',
    section: 'dashboard',
  },
  navigationHistory: [],
  quickActions: {
    isOpen: false,
    searchQuery: '',
    recentActions: [],
  },
}

export const useNavigationStore = create<NavigationState & NavigationActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,
        
        // Breadcrumb management
        setBreadcrumbs: (breadcrumbs) => set((state) => {
          state.breadcrumbs = breadcrumbs
        }, false, 'setBreadcrumbs'),
        
        addBreadcrumb: (breadcrumb) => set((state) => {
          state.breadcrumbs.push(breadcrumb)
        }, false, 'addBreadcrumb'),
        
        updateBreadcrumb: (index, breadcrumb) => set((state) => {
          if (state.breadcrumbs[index]) {
            state.breadcrumbs[index] = { ...state.breadcrumbs[index], ...breadcrumb }
          }
        }, false, 'updateBreadcrumb'),
        
        clearBreadcrumbs: () => set((state) => {
          state.breadcrumbs = []
        }, false, 'clearBreadcrumbs'),
        
        // Page context
        setCurrentPage: (page) => set((state) => {
          state.currentPage = page
        }, false, 'setCurrentPage'),
        
        updatePageTitle: (title, subtitle) => set((state) => {
          state.currentPage.title = title
          if (subtitle !== undefined) {
            state.currentPage.subtitle = subtitle
          }
        }, false, 'updatePageTitle'),
        
        // Navigation history
        addToHistory: (path, title) => set((state) => {
          // Avoid duplicate consecutive entries
          const lastEntry = state.navigationHistory[state.navigationHistory.length - 1]
          if (lastEntry?.path === path) return
          
          state.navigationHistory.push({
            path,
            title,
            timestamp: new Date(),
          })
          
          // Keep only last 50 entries
          if (state.navigationHistory.length > 50) {
            state.navigationHistory = state.navigationHistory.slice(-50)
          }
        }, false, 'addToHistory'),
        
        clearHistory: () => set((state) => {
          state.navigationHistory = []
        }, false, 'clearHistory'),
        
        // Quick actions
        setQuickActionsOpen: (isOpen) => set((state) => {
          state.quickActions.isOpen = isOpen
          if (!isOpen) {
            state.quickActions.searchQuery = ''
          }
        }, false, 'setQuickActionsOpen'),
        
        setQuickActionsSearch: (query) => set((state) => {
          state.quickActions.searchQuery = query
        }, false, 'setQuickActionsSearch'),
        
        addRecentAction: (action) => set((state) => {
          // Remove duplicate if exists
          state.quickActions.recentActions = state.quickActions.recentActions.filter(
            (existing) => existing.id !== action.id
          )
          
          // Add to beginning
          state.quickActions.recentActions.unshift({
            ...action,
            timestamp: new Date(),
          })
          
          // Keep only last 10 actions
          if (state.quickActions.recentActions.length > 10) {
            state.quickActions.recentActions = state.quickActions.recentActions.slice(0, 10)
          }
        }, false, 'addRecentAction'),
        
        clearRecentActions: () => set((state) => {
          state.quickActions.recentActions = []
        }, false, 'clearRecentActions'),
      }))
    ),
    {
      name: 'tenantflow-navigation-store',
    }
  )
)

// Selectors for optimized subscriptions
export const selectBreadcrumbs = (state: NavigationState & NavigationActions) => state.breadcrumbs
export const selectCurrentPage = (state: NavigationState & NavigationActions) => state.currentPage
export const selectNavigationHistory = (state: NavigationState & NavigationActions) => state.navigationHistory
export const selectQuickActions = (state: NavigationState & NavigationActions) => state.quickActions

// Computed selectors
export const selectPageTitle = (state: NavigationState & NavigationActions) => {
  const { title, subtitle } = state.currentPage
  return subtitle ? `${title} - ${subtitle}` : title
}

export const selectCanGoBack = (state: NavigationState & NavigationActions) => {
  return state.navigationHistory.length > 1
}

export const selectRecentPaths = (state: NavigationState & NavigationActions) => {
  return state.navigationHistory
    .slice(-5) // Last 5 entries
    .reverse() // Most recent first
    .filter((entry, index, arr) => 
      // Remove duplicates while preserving order
      arr.findIndex(item => item.path === entry.path) === index
    )
}

// Action hooks for common patterns
export const useBreadcrumbs = () => useNavigationStore((state) => ({
  breadcrumbs: state.breadcrumbs,
  setBreadcrumbs: state.setBreadcrumbs,
  addBreadcrumb: state.addBreadcrumb,
  clearBreadcrumbs: state.clearBreadcrumbs,
}))

export const usePageContext = () => useNavigationStore((state) => ({
  currentPage: state.currentPage,
  setCurrentPage: state.setCurrentPage,
  updatePageTitle: state.updatePageTitle,
  pageTitle: selectPageTitle(state),
}))

export const useQuickActions = () => useNavigationStore((state) => ({
  quickActions: state.quickActions,
  setOpen: state.setQuickActionsOpen,
  setSearch: state.setQuickActionsSearch,
  addRecentAction: state.addRecentAction,
  clearRecentActions: state.clearRecentActions,
}))

export const useNavigationHistory = () => useNavigationStore((state) => ({
  history: state.navigationHistory,
  addToHistory: state.addToHistory,
  clearHistory: state.clearHistory,
  canGoBack: selectCanGoBack(state),
  recentPaths: selectRecentPaths(state),
}))