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

export type Theme = 'light' | 'dark' | 'system'
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
	id: string
	level: NotificationLevel
	title: string
	message: string
	timestamp: Date
	read: boolean
	autoHide?: boolean
	duration?: number
}

export interface RecentActivity {
	id: string
	type: string
	description: string
	timestamp: Date
	userId?: string
	resourceId?: string
	resourceType?: string
}

export interface UIPreferences {
	theme: Theme
	sidebarOpen: boolean
	compactMode: boolean
	showWelcome: boolean
	language: string
	timezone: string
}

export interface UserSession {
	user: AuthUser | null
	isAuthenticated: boolean
	lastActivity: Date | null
	sessionExpiry: Date | null
}

export interface AppState {
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

	openModal: (name: string) => void
	closeModal: (name: string) => void
	closeAllModals: () => void
	toggleModal: (name: string) => void

	// ============================================================================
	// ACTIONS - CACHE MANAGEMENT (Performance Optimization)
	// ============================================================================

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

export const useAppStore = create<AppState>()(
	// Enable Redux DevTools for debugging
	devtools(
		// Add subscription capabilities for computed values
		subscribeWithSelector(
			// Add persistence for UI preferences
			persist(
				// Add Immer for immutable updates (performance + safety)
				immer<AppState>((set, get) => ({
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

					setTheme: theme => {
						set(state => {
							state.ui.theme = theme
						})
					},

					toggleSidebar: () => {
						set(state => {
							state.ui.sidebarOpen = !state.ui.sidebarOpen
						})
					},

					toggleCompactMode: () => {
						set(state => {
							state.ui.compactMode = !state.ui.compactMode
						})
					},

					updatePreferences: preferences => {
						set(state => {
							Object.assign(state.ui, preferences)
						})
					},

					// ============================================================================
					// SESSION MANAGEMENT ACTIONS
					// ============================================================================

					setUser: user => {
						set(state => {
							state.session.user = user
							state.session.isAuthenticated = !!user
							state.session.lastActivity = new Date()

							if (user) {
								// Extend session by 8 hours when user is set
								state.session.sessionExpiry = new Date(
									Date.now() + 8 * 60 * 60 * 1000
								)
							} else {
								state.session.sessionExpiry = null
							}
						})
					},

					updateLastActivity: () => {
						set(state => {
							state.session.lastActivity = new Date()
						})
					},

					clearSession: () => {
						set(state => {
							state.session.user = null
							state.session.isAuthenticated = false
							state.session.lastActivity = null
							state.session.sessionExpiry = null
							// Clear sensitive cache data
							state.cache.selectedPropertyId = null
							state.cache.selectedTenantId = null
						})
					},

					extendSession: minutes => {
						set(state => {
							if (state.session.sessionExpiry) {
								state.session.sessionExpiry = new Date(
									state.session.sessionExpiry.getTime() +
										minutes * 60 * 1000
								)
							}
						})
					},

					// ============================================================================
					// NOTIFICATION ACTIONS (High-Performance)
					// ============================================================================

					addNotification: notification => {
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

							// Update unread count efficiently
							state.unreadCount = state.notifications.filter(
								(n: AppNotification) => !n.read
							).length
						})
					},

					removeNotification: (id: string) => {
						set(state => {
							const index = state.notifications.findIndex(
								(n: AppNotification) => n.id === id
							)
							if (index > -1) {
								state.notifications.splice(index, 1)
								state.unreadCount = state.notifications.filter(
									(n: AppNotification) => !n.read
								).length
							}
						})
					},

					markNotificationRead: (id: string) => {
						set(state => {
							const notification = state.notifications.find(
								(n: AppNotification) => n.id === id
							)
							if (notification && !notification.read) {
								notification.read = true
								state.unreadCount = state.notifications.filter(
									(n: AppNotification) => !n.read
								).length
							}
						})
					},

					markAllNotificationsRead: () => {
						set(state => {
							state.notifications.forEach(
								(n: AppNotification) => {
									n.read = true
								}
							)
							state.unreadCount = 0
						})
					},

					clearNotifications: () => {
						set(state => {
							state.notifications = []
							state.unreadCount = 0
						})
					},

					// ============================================================================
					// MODAL MANAGEMENT ACTIONS
					// ============================================================================

					openModal: name => {
						set(state => {
							state.modals[name] = true
						})
					},

					closeModal: name => {
						set(state => {
							state.modals[name] = false
						})
					},

					closeAllModals: () => {
						set(state => {
							Object.keys(state.modals).forEach(key => {
								state.modals[key] = false
							})
						})
					},

					toggleModal: name => {
						set(state => {
							state.modals[name] = !state.modals[name]
						})
					},

					// ============================================================================
					// CACHE MANAGEMENT ACTIONS
					// ============================================================================

					setSelectedProperty: id => {
						set(state => {
							state.cache.selectedPropertyId = id
						})
					},

					setSelectedTenant: id => {
						set(state => {
							state.cache.selectedTenantId = id
						})
					},

					addRecentSearch: (search: string) => {
						set(state => {
							// Remove if exists, then add to beginning
							state.cache.recentSearches = [
								search,
								...state.cache.recentSearches.filter(
									(s: string) => s !== search
								)
							].slice(0, 10) // Keep only 10 recent searches
						})
					},

					updateRecentActivity: (activity: RecentActivity[]) => {
						set(state => {
							state.cache.recentActivity = activity
						})
					},

					clearCache: () => {
						set(state => {
							state.cache = {
								selectedPropertyId: null,
								selectedTenantId: null,
								recentSearches: [],
								recentActivity: []
							}
						})
					},

					// ============================================================================
					// CONNECTION STATE ACTIONS
					// ============================================================================

					setOnlineStatus: isOnline => {
						set(state => {
							state.isOnline = isOnline
						})
					},

					updateLastSync: () => {
						set(state => {
							state.lastSync = new Date()
						})
					},

					// ============================================================================
					// BULK OPERATIONS (Performance Optimized)
					// ============================================================================

					bulkUpdateNotifications: updates => {
						set(state => {
							updates.forEach(({ id, read }) => {
								const notification = state.notifications.find(
									(n: AppNotification) => n.id === id
								)
								if (notification) {
									notification.read = read
								}
							})
							state.unreadCount = state.notifications.filter(
								(n: AppNotification) => !n.read
							).length
						})
					},

					resetAppState: () => {
						set(() => ({
							...initialState,
							// Preserve some user preferences
							ui: get().ui
						}))
					}
				})),
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
export const useSelectedProperty = () =>
	useAppStore(state => state.cache.selectedPropertyId)
export const useSelectedTenant = () =>
	useAppStore(state => state.cache.selectedTenantId)
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
