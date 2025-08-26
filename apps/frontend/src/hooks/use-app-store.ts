/**
 * High-Performance App Store Hooks
 * Optimized for React 19 + Next.js 15 with minimal re-renders
 */
'use client'

import { useEffect, useCallback } from 'react'
import {
	useAppStore,
	useAppActions,
	useTheme,
	useNotifications
} from '@/stores/app-store'
import { toast } from 'sonner'

// ============================================================================
// ENHANCED UI HOOKS
// ============================================================================

/**
 * Complete theme management with system preference detection
 */
export function useThemeManager() {
	const theme = useTheme()
	const { setTheme } = useAppActions()

	// Auto-detect system preference
	const detectSystemTheme = useCallback((): 'light' | 'dark' => {
		if (typeof window !== 'undefined' && window.matchMedia) {
			const darkMode = window.matchMedia('(prefers-color-scheme: dark)')
			return darkMode.matches ? 'dark' : 'light'
		}
		return 'light'
	}, [])

	// Set up system theme listener
	useEffect(() => {
		if (theme === 'system' && typeof window !== 'undefined') {
			const darkMode = window.matchMedia('(prefers-color-scheme: dark)')

			const handleChange = (e: MediaQueryListEvent) => {
<<<<<<< HEAD
=======
				const systemTheme = e.matches ? 'dark' : 'light'
>>>>>>> origin/main
				document.documentElement.classList.toggle('dark', e.matches)
			}

			// Set initial theme
			document.documentElement.classList.toggle('dark', darkMode.matches)

			darkMode.addEventListener('change', handleChange)
			return () => darkMode.removeEventListener('change', handleChange)
		} else if (theme !== 'system') {
			document.documentElement.classList.toggle('dark', theme === 'dark')
		}
		return undefined
	}, [theme])

	const toggleTheme = useCallback(() => {
		const currentEffectiveTheme =
			theme === 'system' ? detectSystemTheme() : theme
		const newTheme = currentEffectiveTheme === 'dark' ? 'light' : 'dark'
		setTheme(newTheme)
	}, [theme, setTheme, detectSystemTheme])

	const effectiveTheme = theme === 'system' ? detectSystemTheme() : theme

	return {
		theme,
		effectiveTheme,
		setTheme,
		toggleTheme,
		isSystemMode: theme === 'system'
	}
}

// ============================================================================
// NOTIFICATION SYSTEM HOOKS
// ============================================================================

/**
 * Enhanced notification system with toast integration
 */
export function useNotificationSystem() {
	const { notifications, unreadCount, getUnreadNotifications } =
		useNotifications()
	const {
		addNotification,
		removeNotification,
		markNotificationRead,
		clearNotifications
	} = useAppActions()

	// Enhanced notification with toast integration
	const notify = useCallback(
		(
			level: 'info' | 'success' | 'warning' | 'error',
			title: string,
			message: string,
			options?: { duration?: number; autoHide?: boolean }
		) => {
			// Add to store
			addNotification({
				level,
				title,
				message,
				read: false,
				autoHide: options?.autoHide ?? true,
				duration: options?.duration ?? 4000
			})

			// Show toast
			const toastFn = {
				info: toast.info,
				success: toast.success,
				warning: toast.warning,
				error: toast.error
			}[level]

			toastFn(title, {
				description: message,
				duration: options?.duration
			})
		},
		[addNotification]
	)

	// Quick notification methods
	const notifySuccess = useCallback(
		(title: string, message?: string) => {
			notify('success', title, message || '', { duration: 3000 })
		},
		[notify]
	)

	const notifyError = useCallback(
		(title: string, message?: string) => {
			notify('error', title, message || '', {
				duration: 5000,
				autoHide: false
			})
		},
		[notify]
	)

	const notifyInfo = useCallback(
		(title: string, message?: string) => {
			notify('info', title, message || '', { duration: 4000 })
		},
		[notify]
	)

	const notifyWarning = useCallback(
		(title: string, message?: string) => {
			notify('warning', title, message || '', { duration: 4000 })
		},
		[notify]
	)

	return {
		notifications,
		unreadCount,
		unreadNotifications: getUnreadNotifications(),

		// Actions
		notify,
		notifySuccess,
		notifyError,
		notifyInfo,
		notifyWarning,
		removeNotification,
		markAsRead: markNotificationRead,
		clearAll: clearNotifications
	}
}

// ============================================================================
// SESSION MANAGEMENT HOOKS
// ============================================================================

/**
 * Enhanced session management with activity tracking
 */
export function useSessionManager() {
	const session = useAppStore(state => state.session)
	const { setUser, clearSession, updateLastActivity, extendSession } =
		useAppActions()

	// Auto-update activity on user interactions
	useEffect(() => {
		const events = ['click', 'keypress', 'scroll', 'mousemove']
		let timeout: NodeJS.Timeout

		const handleActivity = () => {
			// Throttle activity updates to once per minute
			clearTimeout(timeout)
			timeout = setTimeout(() => {
				updateLastActivity()
			}, 60000) // 1 minute
		}

		if (session.isAuthenticated) {
			events.forEach(event => {
				document.addEventListener(event, handleActivity, {
					passive: true
				})
			})
		}

		return () => {
			events.forEach(event => {
				document.removeEventListener(event, handleActivity)
			})
			clearTimeout(timeout)
		}
	}, [session.isAuthenticated, updateLastActivity])

	// Session expiry warning
	useEffect(() => {
<<<<<<< HEAD
		if (!session.sessionExpiry) {
			return
		}
=======
		if (!session.sessionExpiry) return
>>>>>>> origin/main

		const checkExpiry = () => {
			const now = new Date()
			const expiry = new Date(session.sessionExpiry!)
			const timeLeft = expiry.getTime() - now.getTime()
			const minutesLeft = Math.floor(timeLeft / (1000 * 60))

			// Warn 5 minutes before expiry
			if (minutesLeft === 5) {
				toast.warning('Session Expiring Soon', {
					description:
						'Your session will expire in 5 minutes. Extend it to continue working.',
					action: {
						label: 'Extend Session',
						onClick: () => extendSession(60) // Extend by 1 hour
					}
				})
			}

			// Auto-logout on expiry
			if (timeLeft <= 0) {
				clearSession()
				toast.error('Session Expired', {
					description: 'You have been logged out due to inactivity.'
				})
			}
		}

		const interval = setInterval(checkExpiry, 60000) // Check every minute
		return () => clearInterval(interval)
	}, [session.sessionExpiry, extendSession, clearSession])

	const isSessionExpiringSoon = useCallback(() => {
<<<<<<< HEAD
		if (!session.sessionExpiry) {
			return false
		}
=======
		if (!session.sessionExpiry) return false
>>>>>>> origin/main
		const now = new Date()
		const expiry = new Date(session.sessionExpiry)
		const minutesLeft = Math.floor(
			(expiry.getTime() - now.getTime()) / (1000 * 60)
		)
		return minutesLeft <= 10
	}, [session.sessionExpiry])

	return {
		...session,
		setUser,
		clearSession,
		extendSession,
		isSessionExpiringSoon: isSessionExpiringSoon()
	}
}

// ============================================================================
// SELECTION HOOKS (Property/Tenant Management)
// ============================================================================

/**
 * Property selection with persistence and recent activity
 */
export function usePropertySelection() {
	const selectedPropertyId = useAppStore(
		state => state.cache.selectedPropertyId
	)
	const { setSelectedProperty, addRecentSearch } = useAppActions()

	const selectProperty = useCallback(
		(id: string | null, name?: string) => {
			setSelectedProperty(id)
			if (name) {
				addRecentSearch(`Property: ${name}`)
			}
		},
		[setSelectedProperty, addRecentSearch]
	)

	return {
		selectedPropertyId,
		selectProperty,
		clearSelection: () => setSelectedProperty(null)
	}
}

/**
 * Tenant selection with persistence and recent activity
 */
export function useTenantSelection() {
	const selectedTenantId = useAppStore(state => state.cache.selectedTenantId)
	const { setSelectedTenant, addRecentSearch } = useAppActions()

	const selectTenant = useCallback(
		(id: string | null, name?: string) => {
			setSelectedTenant(id)
			if (name) {
				addRecentSearch(`Tenant: ${name}`)
			}
		},
		[setSelectedTenant, addRecentSearch]
	)

	return {
		selectedTenantId,
		selectTenant,
		clearSelection: () => setSelectedTenant(null)
	}
}

// ============================================================================
// CONNECTION & SYNC HOOKS
// ============================================================================

/**
 * Connection status with online/offline detection and sync management
 */
export function useConnectionManager() {
	const isOnline = useAppStore(state => state.isOnline)
	const lastSync = useAppStore(state => state.lastSync)
	const { setOnlineStatus, updateLastSync } = useAppActions()
	const { notifyWarning, notifySuccess } = useNotificationSystem()

	// Monitor online/offline status
	useEffect(() => {
		const handleOnline = () => {
			setOnlineStatus(true)
			notifySuccess('Connection Restored', 'You are back online.')
		}

		const handleOffline = () => {
			setOnlineStatus(false)
			notifyWarning(
				'Connection Lost',
				'You are currently offline. Changes will sync when connection is restored.'
			)
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('online', handleOnline)
			window.addEventListener('offline', handleOffline)

			return () => {
				window.removeEventListener('online', handleOnline)
				window.removeEventListener('offline', handleOffline)
			}
		}
		return undefined
	}, [setOnlineStatus, notifyWarning, notifySuccess])

	const forceSync = useCallback(async (): Promise<boolean> => {
		if (!isOnline) {
			notifyWarning('Sync Failed', 'No internet connection available.')
			return false
		}

		try {
			// Trigger sync logic here (would integrate with your API)
			updateLastSync()
			notifySuccess('Sync Complete', 'All data has been synchronized.')
			return true
<<<<<<< HEAD
		} catch {
=======
		} catch (error) {
>>>>>>> origin/main
			notifyWarning(
				'Sync Failed',
				'Unable to synchronize data. Please try again.'
			)
			return false
		}
	}, [isOnline, updateLastSync, notifySuccess, notifyWarning])

	return {
		isOnline,
		isOffline: !isOnline,
		lastSync,
		forceSync,
		needsSync: lastSync
			? Date.now() - lastSync.getTime() > 5 * 60 * 1000
			: true // 5 minutes
	}
}

// ============================================================================
// BULK OPERATIONS HOOK
// ============================================================================

/**
 * Bulk operations for performance-critical updates
 */
export function useBulkOperations() {
	const actions = useAppActions()
	const bulkUpdateNotifications = useAppStore(
		state => state.bulkUpdateNotifications
	)
	const resetAppState = useAppStore(state => state.resetAppState)

	return {
		bulkUpdateNotifications,
		resetAppState,

		// Bulk selection updates
		bulkUpdateSelections: useCallback(
			(updates: {
				propertyId?: string | null
				tenantId?: string | null
			}) => {
				if (updates.propertyId !== undefined) {
					actions.setSelectedProperty(updates.propertyId)
				}
				if (updates.tenantId !== undefined) {
					actions.setSelectedTenant(updates.tenantId)
				}
			},
			[actions]
		)
	}
}

// ============================================================================
// DEBUGGING HOOKS (Development Only)
// ============================================================================

/**
 * Development debugging hook (removed in production builds)
 */
export function useStoreDebugger() {
	const store = useAppStore()

	if (process.env.NODE_ENV !== 'development') {
		return null
	}

	return {
		store,
<<<<<<< HEAD
		logState: () => {
			if (typeof window !== 'undefined' && 'console' in window) {
				console.info('Current Store State:', store)
			}
		},
=======
		logState: () => console.log('Current Store State:', store),
>>>>>>> origin/main
		clearStore: () => store.resetAppState()
	}
}
