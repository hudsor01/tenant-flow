/**
 * Navigation Store - Global Navigation State Management
 *
 * Manages navigation state globally (mobile menu, breadcrumbs, active routes)
 * Provides consistent navigation behavior across the app
 * Supports navigation history and deep linking
 * Integrates with Next.js routing
 */

import { create } from 'zustand'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'NavigationStore' })

const computeCanGoBack = (navigationHistory: string[]) =>
	navigationHistory.length > 1

export interface BreadcrumbItem {
	label: string
	href?: string
	icon?: string
}

export interface NavigationState {
	// Mobile menu state
	isMobileMenuOpen: boolean

	// Breadcrumbs
	breadcrumbs: BreadcrumbItem[]

	// Navigation history
	navigationHistory: string[]

	// Active route information
	activeRoute: string | null
	activeSection: string | null

	// Actions
	toggleMobileMenu: () => void
	openMobileMenu: () => void
	closeMobileMenu: () => void

	setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
	addBreadcrumb: (breadcrumb: BreadcrumbItem) => void
	clearBreadcrumbs: () => void

	setActiveRoute: (route: string, section?: string) => void
	addToHistory: (route: string) => void
	clearHistory: () => void

	// Navigation helpers
	goBack: () => string | null
	canGoBack: boolean
}

const initialState = {
	isMobileMenuOpen: false,
	breadcrumbs: [],
	navigationHistory: [],
	activeRoute: null,
	activeSection: null,
	canGoBack: false
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
	...initialState,

	toggleMobileMenu: () => {
		set(state => {
			const newState = !state.isMobileMenuOpen
			logger.info('Mobile menu toggled', {
				action: 'mobile_menu_toggled',
				metadata: { isOpen: newState }
			})
			return { isMobileMenuOpen: newState }
		})
	},

	openMobileMenu: () => {
		set({ isMobileMenuOpen: true })
		logger.info('Mobile menu opened', { action: 'mobile_menu_opened' })
	},

	closeMobileMenu: () => {
		set({ isMobileMenuOpen: false })
		logger.info('Mobile menu closed', { action: 'mobile_menu_closed' })
	},

	setBreadcrumbs: breadcrumbs => {
		set({ breadcrumbs })
		logger.info('Breadcrumbs set', {
			action: 'breadcrumbs_set',
			metadata: { count: breadcrumbs.length }
		})
	},

	addBreadcrumb: breadcrumb => {
		set(state => ({
			breadcrumbs: [...state.breadcrumbs, breadcrumb]
		}))
	},

	clearBreadcrumbs: () => {
		set({ breadcrumbs: [] })
		logger.info('Breadcrumbs cleared', { action: 'breadcrumbs_cleared' })
	},

	setActiveRoute: (route, section) => {
		set(state => {
			const updates: Partial<NavigationState> = {
				activeRoute: route,
				activeSection: section || state.activeSection
			}

			// Add to history if route changed
			if (route !== state.activeRoute) {
				const nextHistory = [
					...state.navigationHistory.filter(r => r !== route),
					route
				]
				updates.navigationHistory = nextHistory
			}

			logger.info('Active route set', {
				action: 'active_route_set',
				metadata: { route, section }
			})

			const historyForComputation =
				updates.navigationHistory ?? state.navigationHistory

			return {
				...updates,
				canGoBack: computeCanGoBack(historyForComputation)
			}
		})
	},

	addToHistory: route => {
		set(state => ({
			navigationHistory: [
				...state.navigationHistory.filter(r => r !== route),
				route
			],
			canGoBack: computeCanGoBack([
				...state.navigationHistory.filter(r => r !== route),
				route
			])
		}))
	},

	clearHistory: () => {
		set({ navigationHistory: [], canGoBack: false })
		logger.info('Navigation history cleared', {
			action: 'navigation_history_cleared'
		})
	},

	goBack: () => {
		const { navigationHistory } = get()
		if (navigationHistory.length > 1) {
			const currentRoute = navigationHistory[navigationHistory.length - 1]
			const previousRoute = navigationHistory[navigationHistory.length - 2]

			if (previousRoute) {
				set(state => ({
					navigationHistory: state.navigationHistory.slice(0, -1),
					activeRoute: previousRoute,
					canGoBack: computeCanGoBack(state.navigationHistory.slice(0, -1))
				}))

				logger.info('Navigation back', {
					action: 'navigation_back',
					metadata: { from: currentRoute, to: previousRoute }
				})

				return previousRoute
			}
		}
		return null
	}
}))
