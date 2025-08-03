/**
 * Pure Zustand Global State Architecture
 * Following React 19 + Zustand best practices for clean separation of concerns
 */
import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User } from '@tenantflow/shared'

// =====================================================
// 1. GLOBAL APPLICATION STATE (Zustand's sweet spot)
// =====================================================

export type Theme = 'light' | 'dark' | 'system'
export type AppModal = 
  | 'property-form' 
  | 'unit-form' 
  | 'lease-form' 
  | 'maintenance-form'
  | 'checkout'
  | 'upgrade-prompt'

export interface NotificationState {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timestamp: number
  persistent?: boolean
}

// Core global state interface
interface GlobalState {
  // User & Auth (cross-component state)
  user: User | null
  isAuthenticated: boolean
  sessionExpiry: number | null
  
  // UI State (persisted across sessions)
  theme: Theme
  sidebarCollapsed: boolean
  compactMode: boolean
  
  // App State (cross-component communication)
  isOnline: boolean
  notifications: NotificationState[]
  activeModal: AppModal | null
  modalData: Record<string, unknown>
  
  // Feature Flags (global configuration)
  features: {
    betaFeatures: boolean
    analyticsEnabled: boolean
    debugMode: boolean
  }
}

// Actions interface
interface GlobalActions {
  // Auth actions
  setUser: (user: User | null) => void
  setSessionExpiry: (expiry: number | null) => void
  clearAuth: () => void
  
  // UI actions
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCompactMode: (compact: boolean) => void
  
  // App actions
  setOnlineStatus: (online: boolean) => void
  
  // Notification actions
  addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Modal actions
  openModal: (modal: AppModal, data?: Record<string, unknown>) => void
  closeModal: () => void
  
  // Feature flag actions
  toggleFeature: (feature: keyof GlobalState['features']) => void
  
  // Reset
  reset: () => void
}

// Initial state
const initialState: GlobalState = {
  user: null,
  isAuthenticated: false,
  sessionExpiry: null,
  
  theme: 'system',
  sidebarCollapsed: false,
  compactMode: false,
  
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  notifications: [],
  activeModal: null,
  modalData: {},
  
  features: {
    betaFeatures: false,
    analyticsEnabled: true,
    debugMode: false,
  },
}

// Generate unique notification ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2)}`

// =====================================================
// 2. STORE CREATION WITH MIDDLEWARE STACK
// =====================================================

export const useGlobalStore = create<GlobalState & GlobalActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // Auth actions
          setUser: (user) => set((state) => {
            state.user = user
            state.isAuthenticated = !!user
          }, false, 'setUser'),
          
          setSessionExpiry: (expiry) => set((state) => {
            state.sessionExpiry = expiry
          }, false, 'setSessionExpiry'),
          
          clearAuth: () => set((state) => {
            state.user = null
            state.isAuthenticated = false
            state.sessionExpiry = null
          }, false, 'clearAuth'),
          
          // UI actions
          setTheme: (theme) => set((state) => {
            state.theme = theme
          }, false, 'setTheme'),
          
          toggleSidebar: () => set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed
          }, false, 'toggleSidebar'),
          
          setSidebarCollapsed: (collapsed) => set((state) => {
            state.sidebarCollapsed = collapsed
          }, false, 'setSidebarCollapsed'),
          
          setCompactMode: (compact) => set((state) => {
            state.compactMode = compact
          }, false, 'setCompactMode'),
          
          // App actions
          setOnlineStatus: (online) => set((state) => {
            state.isOnline = online
          }, false, 'setOnlineStatus'),
          
          // Notification actions
          addNotification: (notification) => set((state) => {
            const newNotification: NotificationState = {
              ...notification,
              id: generateId(),
              timestamp: Date.now(),
            }
            state.notifications.push(newNotification)
            
            // Auto-remove non-persistent notifications
            if (!notification.persistent && (notification.type === 'success' || notification.type === 'info')) {
              setTimeout(() => {
                get().removeNotification(newNotification.id)
              }, 5000)
            }
          }, false, 'addNotification'),
          
          removeNotification: (id) => set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== id)
          }, false, 'removeNotification'),
          
          clearNotifications: () => set((state) => {
            state.notifications = []
          }, false, 'clearNotifications'),
          
          // Modal actions
          openModal: (modal, data = {}) => set((state) => {
            state.activeModal = modal
            state.modalData = data
          }, false, 'openModal'),
          
          closeModal: () => set((state) => {
            state.activeModal = null
            state.modalData = {}
          }, false, 'closeModal'),
          
          // Feature flag actions
          toggleFeature: (feature) => set((state) => {
            state.features[feature] = !state.features[feature]
          }, false, 'toggleFeature'),
          
          reset: () => set(initialState, false, 'reset'),
        }))
      ),
      {
        name: 'tenantflow-global-store',
        version: 1,
        // Only persist UI preferences and feature flags
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          compactMode: state.compactMode,
          features: state.features,
        }),
      }
    ),
    {
      name: 'TenantFlow Global Store',
    }
  )
)

// =====================================================
// 3. SELECTORS (Performance optimized)
// =====================================================

// User selectors
export const selectUser = (state: GlobalState & GlobalActions) => state.user
export const selectIsAuthenticated = (state: GlobalState & GlobalActions) => state.isAuthenticated
export const selectSessionExpiry = (state: GlobalState & GlobalActions) => state.sessionExpiry

// UI selectors
export const selectTheme = (state: GlobalState & GlobalActions) => state.theme
export const selectSidebarCollapsed = (state: GlobalState & GlobalActions) => state.sidebarCollapsed
export const selectCompactMode = (state: GlobalState & GlobalActions) => state.compactMode

// App selectors
export const selectIsOnline = (state: GlobalState & GlobalActions) => state.isOnline
export const selectNotifications = (state: GlobalState & GlobalActions) => state.notifications
export const selectActiveModal = (state: GlobalState & GlobalActions) => state.activeModal
export const selectModalData = (state: GlobalState & GlobalActions) => state.modalData
export const selectFeatures = (state: GlobalState & GlobalActions) => state.features

// Computed selectors
export const selectUnreadNotifications = (state: GlobalState & GlobalActions) =>
  state.notifications.filter(n => n.type === 'error' || n.type === 'warning')

export const selectIsSessionExpired = (state: GlobalState & GlobalActions) =>
  state.sessionExpiry ? Date.now() > state.sessionExpiry : false

// =====================================================
// 4. HOOKS (Clean React 19 Integration)
// =====================================================

// Granular hooks for specific state slices
export const useAuth = () => useGlobalStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  sessionExpiry: state.sessionExpiry,
  isExpired: selectIsSessionExpired(state),
  setUser: state.setUser,
  clearAuth: state.clearAuth,
}))

export const useTheme = () => useGlobalStore((state) => ({
  theme: state.theme,
  setTheme: state.setTheme,
}))

export const useSidebar = () => useGlobalStore((state) => ({
  collapsed: state.sidebarCollapsed,
  toggle: state.toggleSidebar,
  setCollapsed: state.setSidebarCollapsed,
}))

export const useNotifications = () => useGlobalStore((state) => ({
  notifications: state.notifications,
  unread: selectUnreadNotifications(state),
  add: state.addNotification,
  remove: state.removeNotification,
  clear: state.clearNotifications,
}))

export const useModal = () => useGlobalStore((state) => ({
  activeModal: state.activeModal,
  modalData: state.modalData,
  open: state.openModal,
  close: state.closeModal,
}))

export const useFeatures = () => useGlobalStore((state) => ({
  features: state.features,
  toggle: state.toggleFeature,
}))

// =====================================================
// 5. SIDE EFFECTS (Browser Integration)
// =====================================================

// Online/offline detection
if (typeof window !== 'undefined') {
  const store = useGlobalStore.getState()
  
  window.addEventListener('online', () => store.setOnlineStatus(true))
  window.addEventListener('offline', () => store.setOnlineStatus(false))
}