import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User } from '@tenantflow/shared'

// Enhanced types for better type safety
export type Theme = 'light' | 'dark' | 'system'

export interface NotificationState {
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    id: string
    timestamp: number
}

interface AppState {
    // User state
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    lastActivity: number
    
    // UI state
    sidebarOpen: boolean
    theme: Theme
    notifications: NotificationState[]
    isOnline: boolean
    
    // Modal state
    modals: {
        propertyForm: boolean
        unitForm: boolean
        leaseForm: boolean
        maintenanceForm: boolean
        editProperty: boolean
        editUnit: boolean
        editLease: boolean
        editMaintenance: boolean
        inviteTenant: boolean
        subscriptionCheckout: boolean
        subscriptionSuccess: boolean
    }
    
    // Feature flags
    features: {
        darkMode: boolean
        betaFeatures: boolean
        analyticsEnabled: boolean
    }
}

interface AppActions {
    // User actions
    setUser: (user: User | null) => void
    setIsLoading: (loading: boolean) => void
    updateLastActivity: () => void
    
    // UI actions
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    setTheme: (theme: Theme) => void
    setOnlineStatus: (isOnline: boolean) => void
    
    // Notification actions
    addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp'>) => void
    removeNotification: (id: string) => void
    clearNotifications: () => void
    
    // Modal actions
    openModal: (modal: keyof AppState['modals']) => void
    closeModal: (modal: keyof AppState['modals']) => void
    closeAllModals: () => void
    
    // Feature flag actions
    toggleFeature: (feature: keyof AppState['features']) => void
    
    // Utility actions
    reset: () => void
}

const initialState: AppState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    lastActivity: Date.now(),
    sidebarOpen: true,
    theme: 'system',
    notifications: [],
    isOnline: navigator.onLine ?? true,
    modals: {
        propertyForm: false,
        unitForm: false,
        leaseForm: false,
        maintenanceForm: false,
        editProperty: false,
        editUnit: false,
        editLease: false,
        editMaintenance: false,
        inviteTenant: false,
        subscriptionCheckout: false,
        subscriptionSuccess: false,
    },
    features: {
        darkMode: true,
        betaFeatures: false,
        analyticsEnabled: true,
    },
}

// Generate unique ID for notifications
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

export const useAppStore = create<AppState & AppActions>()(
    devtools(
        persist(
            subscribeWithSelector(
                immer((set, get) => ({
                    ...initialState,
                    
                    // User actions
                    setUser: (user) => set((state) => {
                        state.user = user
                        state.isAuthenticated = !!user
                        state.lastActivity = Date.now()
                    }, false, 'setUser'),
                    
                    setIsLoading: (loading) => set((state) => {
                        state.isLoading = loading
                    }, false, 'setIsLoading'),
                    
                    updateLastActivity: () => set((state) => {
                        state.lastActivity = Date.now()
                    }, false, 'updateLastActivity'),
                    
                    // UI actions
                    toggleSidebar: () => set((state) => {
                        state.sidebarOpen = !state.sidebarOpen
                    }, false, 'toggleSidebar'),
                    
                    setSidebarOpen: (open) => set((state) => {
                        state.sidebarOpen = open
                    }, false, 'setSidebarOpen'),
                    
                    setTheme: (theme) => set((state) => {
                        state.theme = theme
                        // Auto-enable dark mode feature flag when dark theme is selected
                        if (theme === 'dark') {
                            state.features.darkMode = true
                        }
                    }, false, 'setTheme'),
                    
                    setOnlineStatus: (isOnline) => set((state) => {
                        state.isOnline = isOnline
                    }, false, 'setOnlineStatus'),
                    
                    // Notification actions
                    addNotification: (notification) => set((state) => {
                        const newNotification: NotificationState = {
                            ...notification,
                            id: generateId(),
                            timestamp: Date.now(),
                        }
                        state.notifications.push(newNotification)
                        
                        // Auto-remove after 5 seconds for success/info notifications
                        if (notification.type === 'success' || notification.type === 'info') {
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
                    openModal: (modal) => set((state) => {
                        state.modals[modal] = true
                    }, false, 'openModal'),
                    
                    closeModal: (modal) => set((state) => {
                        state.modals[modal] = false
                    }, false, 'closeModal'),
                    
                    closeAllModals: () => set((state) => {
                        Object.keys(state.modals).forEach(key => {
                            state.modals[key as keyof typeof state.modals] = false
                        })
                    }, false, 'closeAllModals'),
                    
                    // Feature flag actions
                    toggleFeature: (feature) => set((state) => {
                        state.features[feature] = !state.features[feature]
                    }, false, 'toggleFeature'),
                    
                    reset: () => set(initialState, false, 'reset'),
                }))
            ),
            {
                name: 'tenantflow-app-store',
                version: 2, // Increment when changing store structure
                partialize: (state) => ({
                    theme: state.theme,
                    sidebarOpen: state.sidebarOpen,
                    features: state.features,
                }),
                migrate: (persistedState: unknown, version) => {
                  // Handle migration from v1 to v2
                  if (version === 1) {
                    const state = persistedState as Record<string, unknown>
                    return {
                      theme: state.theme || initialState.theme,
                      sidebarOpen: state.sidebarOpen ?? initialState.sidebarOpen,
                      features: state.features || initialState.features,
                    }
                  }
                  return persistedState as { theme: Theme; sidebarOpen: boolean; features: typeof initialState.features }
                },
            }
        )
    )
)

// Enhanced selectors with proper typing
type AppStoreState = AppState & AppActions

export const selectUser = (state: AppStoreState) => state.user
export const selectIsAuthenticated = (state: AppStoreState) => state.isAuthenticated
export const selectIsLoading = (state: AppStoreState) => state.isLoading
export const selectSidebarOpen = (state: AppStoreState) => state.sidebarOpen
export const selectTheme = (state: AppStoreState) => state.theme
export const selectNotifications = (state: AppStoreState) => state.notifications
export const selectIsOnline = (state: AppStoreState) => state.isOnline
export const selectFeatures = (state: AppStoreState) => state.features
export const selectLastActivity = (state: AppStoreState) => state.lastActivity

// Computed selectors
export const selectUnreadNotifications = (state: AppStoreState) => 
    state.notifications.filter(n => n.type === 'error' || n.type === 'warning')

export const selectIsSessionActive = (state: AppStoreState) => {
    const FIVE_MINUTES = 5 * 60 * 1000
    return Date.now() - state.lastActivity < FIVE_MINUTES
}

// Hooks for common patterns
export const useUser = () => useAppStore(selectUser)
export const useIsAuthenticated = () => useAppStore(selectIsAuthenticated)
export const useTheme = () => useAppStore(selectTheme)
export const useNotifications = () => useAppStore(selectNotifications)

// Action hooks
export const useAppActions = () => useAppStore((state) => ({
    setUser: state.setUser,
    setTheme: state.setTheme,
    addNotification: state.addNotification,
    removeNotification: state.removeNotification,
    toggleSidebar: state.toggleSidebar,
    updateLastActivity: state.updateLastActivity,
}))

// Subscribe to online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => useAppStore.getState().setOnlineStatus(true))
    window.addEventListener('offline', () => useAppStore.getState().setOnlineStatus(false))
}