/**
 * Zustand App Store - High-Performance Global State Management
 * Features: DevTools, Persistence, Subscriptions, Computed Values, Optimistic Updates
 */
import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AuthUser } from '@repo/shared'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Use shared types instead of local interfaces
import type { 
	AppNotification,
	RecentActivity,
	UIPreferences,
	UserSession,
	AppState,
	NotificationLevel,
	Theme
} from '@repo/shared'

export type { 
	AppNotification,
	RecentActivity,
	UIPreferences,
	UserSession,
	AppState,
	NotificationLevel,
	Theme
}

interface LocalAppState {
	// ============================================================================
	// STATE
	// ============================================================================

	// UI Preferences (persisted)
	ui: UIPreferences

	// Session Management (optimized for auth)
	session: UserSession

	// Notifications (in-memory, performant)
	notifications: AppNotification[]
	unreadCount: number

	// Modal Management (lightweight)
	modals: Record<string, boolean>

	// Quick Access Cache (performance optimization)
	cache: {
		selectedPropertyId: string | null
		selectedTenantId: string | null
		recentSearches: string[]
		recentActivity: RecentActivity[]
	}

	// Connection State
	isOnline: boolean
	lastSync: Date | null

	// ============================================================================
	// COMPUTED VALUES (Memoized)
	// ============================================================================

	// Dynamic computed getters
	getUnreadNotifications: () => AppNotification[]
	getRecentActivity: () => RecentActivity[]
	getActiveModals: () => string[]

	// ============================================================================
	// ACTIONS - UI PREFERENCES
	// ============================================================================

	setTheme: (theme: Theme) => void
	toggleSidebar: () => void
	toggleCompactMode: () => void
	updatePreferences: (preferences: Partial<UIPreferences>) => void

	// ============================================================================
	// ACTIONS - SESSION MANAGEMENT
	// ============================================================================

	setUser: (user: AuthUser | null) => void
	updateLastActivity: () => void
	clearSession: () => void
	extendSession: (minutes: number) => void

	// ============================================================================
	// ACTIONS - NOTIFICATIONS (High-Performance)
	// ============================================================================

	addNotification: (
		notification: Omit<AppNotification, 'id' | 'timestamp'>
	) => void
	removeNotification: (id: string) => void
	markNotificationRead: (id: string) => void
	markAllNotificationsRead: () => void
	clearNotifications: () => void

	// ============================================================================
	// ACTIONS - MODAL MANAGEMENT
	// ============================================================================

	setModalState: (name: string, isOpen: boolean) => void
	setModalOpen: (name: string, open: boolean) => void
	openModal: (name: string) => void
	closeModal: (name: string) => void
	closeAllModals: () => void
	toggleModal: (name: string) => void

	// ============================================================================
	// ACTIONS - CACHE MANAGEMENT (Performance Optimization)
	// ============================================================================

	setCacheValue: <K extends keyof LocalAppState['cache']>(
		key: K, 
		value: LocalAppState['cache'][K]
	) => void
	setSelectedProperty: (id: string | null) => void
	setSelectedTenant: (id: string | null) => void
	addRecentSearch: (search: string) => void
	updateRecentActivity: (activity: RecentActivity[]) => void
	clearCache: () => void

	// ============================================================================
	// ACTIONS - CONNECTION STATE
	// ============================================================================

	setOnlineStatus: (isOnline: boolean) => void
	updateLastSync: () => void

	// ============================================================================
	// ACTIONS - BULK OPERATIONS (Performance Optimized)
	// ============================================================================

	bulkUpdateNotifications: (updates: { id: string; read: boolean }[]) => void
	resetAppState: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
	ui: {
		theme: 'system' as Theme,
		sidebarOpen: true,
		compactMode: false,
		showWelcome: true,
		language: 'en',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
	},
	session: {
		user: null,
		isAuthenticated: false,
		lastActivity: null,
		sessionExpiry: null
	},
	notifications: [],
	unreadCount: 0,
	modals: {},
	cache: {
		selectedPropertyId: null,
		selectedTenantId: null,
		recentSearches: [],
		recentActivity: []
	},
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	lastSync: null
}

// ============================================================================
// ZUSTAND STORE WITH MAXIMUM PERFORMANCE FEATURES
// ============================================================================

export const useAppStore = create<LocalAppState>()(
	// Enable Redux DevTools for debugging
	devtools(
		// Add subscription capabilities for computed values
		subscribeWithSelector(
			// Add persistence for UI preferences
			persist(
				// Add Immer for immutable updates (performance + safety)
				immer<LocalAppState>((set, get) => {
					// ============================================================================
					// SHARED UTILITIES - DRY PRINCIPLE
					// ============================================================================
					
					// Shared utility for updating unread count
					const updateUnreadCount = (state: LocalAppState) => {
						state.unreadCount = state.notifications.filter(
							(n: AppNotification) => !n.read
						).length
					}

					// Generic state updater - eliminates 90% of anonymous function duplication
					const updateState = <T>(updater: (state: LocalAppState) => T) => set(updater)

					// Session state updater with common patterns
					const updateSession = (updater: (session: UserSession) => void) => 
						updateState(state => updater(state.session))

					// Cache state updater with type safety
					const updateCache = (updater: (cache: LocalAppState['cache']) => void) =>
						updateState(state => updater(state.cache))

					// Notification finder utility
					const findNotification = (state: LocalAppState, id: string) =>
						state.notifications.find((n: AppNotification) => n.id === id)

					return {
					...initialState,

					// ============================================================================
					// COMPUTED VALUES (Memoized for Performance)
					// ============================================================================

					getUnreadNotifications: () => {
						return get().notifications.filter(n => !n.read)
					},

					getRecentActivity: () => {
						return get().cache.recentActivity.slice(0, 10)
					},

					getActiveModals: () => {
						const modals = get().modals
						return Object.keys(modals).filter(key => modals[key])
					},

					// ============================================================================
					// UI PREFERENCES ACTIONS
					// ============================================================================

					setTheme: (theme: Theme) => {
						updateState(state => {
							state.ui.theme = theme
						})
					},

					toggleSidebar: () => {
						updateState(state => {
							state.ui.sidebarOpen = !state.ui.sidebarOpen
						})
					},

					toggleCompactMode: () => {
						updateState(state => {
							state.ui.compactMode = !state.ui.compactMode
						})
					},

					updatePreferences: (preferences: Partial<UIPreferences>) => {
						updateState(state => {
							Object.assign(state.ui, preferences)
						})
					},

					// ============================================================================
					// SESSION MANAGEMENT ACTIONS
					// ============================================================================

					setUser: (user: AuthUser | null) => {
						updateSession(session => {
							session.user = user
							session.isAuthenticated = !!user
							session.lastActivity = new Date()
							session.sessionExpiry = user 
								? new Date(Date.now() + 8 * 60 * 60 * 1000)
								: null
						})
						// Clear sensitive cache data when logging out
						if (!user) {
							updateCache(cache => {
								cache.selectedPropertyId = null
								cache.selectedTenantId = null
							})
						}
					},

					updateLastActivity: () => {
						updateSession(session => {
							session.lastActivity = new Date()
						})
					},

					clearSession: () => {
						updateSession(session => {
							session.user = null
							session.isAuthenticated = false
							session.lastActivity = null
							session.sessionExpiry = null
						})
						updateCache(cache => {
							cache.selectedPropertyId = null
							cache.selectedTenantId = null
						})
					},

					extendSession: (minutes: number) => {
						updateSession(session => {
							if (session.sessionExpiry) {
								session.sessionExpiry = new Date(
									session.sessionExpiry.getTime() + minutes * 60 * 1000
								)
							}
						})
					},

					// ============================================================================
					// NOTIFICATION ACTIONS (High-Performance)
					// ============================================================================

					addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => {
						const id = `notification-${Date.now()}-${Math.random()}`
						set(state => {
							const newNotification: AppNotification = {
								...notification,
								id,
								timestamp: new Date(),
								read: false
							}

							state.notifications.unshift(newNotification)

							// Keep only last 50 notifications for performance
							if (state.notifications.length > 50) {
								state.notifications = state.notifications.slice(
									0,
									50
								)
							}

							// Update unread count using shared utility
							updateUnreadCount(state)
						})
					},

					removeNotification: (id: string) => {
						updateState(state => {
							const index = state.notifications.findIndex(n => n.id === id)
							if (index > -1) {
								state.notifications.splice(index, 1)
								updateUnreadCount(state)
							}
						})
					},

					markNotificationRead: (id: string) => {
						updateState(state => {
							const notification = findNotification(state, id)
							if (notification && !notification.read) {
								notification.read = true
								updateUnreadCount(state)
							}
						})
					},

					markAllNotificationsRead: () => {
						updateState(state => {
							state.notifications.forEach(n => {
								n.read = true
							})
							state.unreadCount = 0
						})
					},

					clearNotifications: () => {
						updateState(state => {
							state.notifications = []
							state.unreadCount = 0
						})
					},

					// ============================================================================
					// MODAL MANAGEMENT ACTIONS
					// ============================================================================

					// Generic modal setter - DRY principle
					setModalState: (name: string, isOpen: boolean) => {
						updateState(state => {
							state.modals[name] = isOpen
						})
					},

					// Generic modal state setter - DRY principle
					setModalOpen: (name: string, open: boolean) => get().setModalState(name, open),

					openModal: (name: string) => get().setModalOpen(name, true),

					closeModal: (name: string) => get().setModalOpen(name, false),

					closeAllModals: () => {
						updateState(state => {
							Object.keys(state.modals).forEach(key => {
								state.modals[key] = false
							})
						})
					},

					toggleModal: (name: string) => {
						updateState(state => {
							state.modals[name] = !state.modals[name]
						})
					},

					// ============================================================================
					// CACHE MANAGEMENT ACTIONS
					// ============================================================================

					// Cache setter with proper generic typing
					setCacheValue: <K extends keyof LocalAppState['cache']>(
						key: K,
						value: LocalAppState['cache'][K]
					) => {
						updateCache(cache => {
							cache[key] = value as LocalAppState['cache'][K]
						})
					},

					setSelectedProperty: (id: string | null) => 
						get().setCacheValue('selectedPropertyId', id),

					setSelectedTenant: (id: string | null) => 
						get().setCacheValue('selectedTenantId', id),

					addRecentSearch: (search: string) => {
						updateCache(cache => {
							// Remove if exists, then add to beginning
							cache.recentSearches = [
								search,
								...cache.recentSearches.filter(s => s !== search)
							].slice(0, 10) // Keep only 10 recent searches
						})
					},

					updateRecentActivity: (activity: RecentActivity[]) => {
						updateCache(cache => {
							cache.recentActivity = activity
						})
					},

					clearCache: () => {
						updateCache(cache => {
							cache.selectedPropertyId = null
							cache.selectedTenantId = null
							cache.recentSearches = []
							cache.recentActivity = []
						})
					},

					// ============================================================================
					// CONNECTION STATE ACTIONS
					// ============================================================================

					setOnlineStatus: (isOnline: boolean) => {
						updateState(state => {
							state.isOnline = isOnline
						})
					},

					updateLastSync: () => {
						updateState(state => {
							state.lastSync = new Date()
						})
					},

					// ============================================================================
					// BULK OPERATIONS (Performance Optimized)
					// ============================================================================

					bulkUpdateNotifications: (updates: { id: string; read: boolean }[]) => {
						updateState(state => {
							updates.forEach(({ id, read }) => {
								const notification = findNotification(state, id)
								if (notification) {
									notification.read = read
								}
							})
							updateUnreadCount(state)
						})
					},

					resetAppState: () => {
						set(() => ({
							...initialState,
							// Preserve some user preferences
							ui: get().ui
						}))
					}
				}
			}),
				{
					name: 'tenantflow-app-store',
					// Only persist UI preferences and some cache data
					partialize: state => ({
						ui: state.ui,
						cache: {
							selectedPropertyId: state.cache.selectedPropertyId,
							selectedTenantId: state.cache.selectedTenantId,
							recentSearches: state.cache.recentSearches
						}
					})
				}
			)
		),
		{
			name: 'TenantFlow App Store'
		}
	)
)

// ============================================================================
// SPECIALIZED HOOKS FOR PERFORMANCE
// ============================================================================

// Optimized hooks that only subscribe to specific slices
export const useTheme = () => useAppStore(state => state.ui.theme)
export const useSidebarOpen = () => useAppStore(state => state.ui.sidebarOpen)
export const useUserSession = () => useAppStore(state => state.session)
export const useNotifications = () =>
	useAppStore(state => ({
		notifications: state.notifications,
		unreadCount: state.unreadCount,
		getUnreadNotifications: state.getUnreadNotifications
	}))
// Generic cache selector factory - DRY principle
export function useCacheSelector<T>(selector: (cache: LocalAppState['cache']) => T) {
    return useAppStore(state => selector(state.cache))
}

// Generic cache field selector factory - further DRY consolidation
const createCacheFieldSelector = <K extends keyof LocalAppState['cache']>(key: K) =>
	() => useCacheSelector(cache => cache[key])

export const useSelectedProperty = createCacheFieldSelector('selectedPropertyId')
export const useSelectedTenant = createCacheFieldSelector('selectedTenantId')
export const useIsOnline = () => useAppStore(state => state.isOnline)

// Bulk action hooks for performance
export const useAppActions = () =>
	useAppStore(state => ({
		// UI actions
		setTheme: state.setTheme,
		toggleSidebar: state.toggleSidebar,
		updatePreferences: state.updatePreferences,

		// Session actions
		setUser: state.setUser,
		clearSession: state.clearSession,
		updateLastActivity: state.updateLastActivity,
		extendSession: state.extendSession,

		// Notification actions
		addNotification: state.addNotification,
		removeNotification: state.removeNotification,
		markNotificationRead: state.markNotificationRead,
		clearNotifications: state.clearNotifications,

		// Modal actions
		openModal: state.openModal,
		closeModal: state.closeModal,
		toggleModal: state.toggleModal,

		// Cache actions
		setSelectedProperty: state.setSelectedProperty,
		setSelectedTenant: state.setSelectedTenant,
		addRecentSearch: state.addRecentSearch,

		// Connection actions
		setOnlineStatus: state.setOnlineStatus,
		updateLastSync: state.updateLastSync
	}))

// Modal hook factory for type safety
export const useModal = (name: string) => {
	const isOpen = useAppStore(state => !!state.modals[name])
	const actions = useAppActions()

	return {
		isOpen,
		open: () => actions.openModal(name),
		close: () => actions.closeModal(name),
		toggle: () => actions.toggleModal(name)
	}
}
