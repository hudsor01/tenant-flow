/**
 * Toast Store - Global Toast Notification Management
 *
 * Follows Zustand best practices and CLAUDE.md guidelines:
 * - Manages toast notifications globally with enhanced features
 * - Supports persistent toasts, toast queues, and advanced interactions
 * - Integrates with sonner for rendering while providing additional state management
 * - Supports toast history, dismissal tracking, and bulk operations
 */

import { create } from 'zustand'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { ToastT } from 'sonner'

const logger = createLogger({ component: 'ToastStore' })

const computeToastMetrics = (toasts: EnhancedToast[]) => {
	const toastCount = toasts.length
	const hasErrors = toasts.some(t => t.type === 'error')
	const hasWarnings = toasts.some(t => t.type === 'warning')

	return {
		hasToasts: toastCount > 0,
		toastCount,
		hasErrors,
		hasWarnings
	}
}

export interface EnhancedToast extends Omit<ToastT, 'id'> {
	id: string | number
	timestamp: Date
	category?: string
	priority?: 'low' | 'normal' | 'high'
	persistent?: boolean
	metadata?: Record<string, unknown>
}

export interface ToastStoreState {
	// Active toasts
	toasts: EnhancedToast[]

	// Toast history (for debugging/analytics)
	toastHistory: EnhancedToast[]

	// Actions
	addToast: (toast: Omit<EnhancedToast, 'id' | 'timestamp'>) => string
	removeToast: (id: string | number) => void
	clearToasts: (category?: string) => void
	clearAllToasts: () => void
	updateToast: (id: string | number, updates: Partial<EnhancedToast>) => void

	// Bulk operations
	dismissCategory: (category: string) => void
	dismissPriority: (priority: 'low' | 'normal' | 'high') => void

	// Queries
	getToastsByCategory: (category: string) => EnhancedToast[]
	getToastsByPriority: (priority: 'low' | 'normal' | 'high') => EnhancedToast[]
	getPersistentToasts: () => EnhancedToast[]

	// Modal-aware toast operations
	addModalToast: (
		modalId: string,
		toast: Omit<EnhancedToast, 'id' | 'timestamp'>
	) => string
	clearModalToasts: (modalId: string) => void
	getModalToasts: (modalId: string) => EnhancedToast[]

	// Computed properties
	hasToasts: boolean
	toastCount: number
	hasErrors: boolean
	hasWarnings: boolean
}

const generateToastId = (): string => {
	return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useToastStore = create<ToastStoreState>((set, get) => ({
	toasts: [],
	toastHistory: [],
	...computeToastMetrics([]),

	addToast: toastData => {
		const id = generateToastId()
		const toast: EnhancedToast = {
			...toastData,
			id,
			timestamp: new Date(),
			priority: toastData.priority || 'normal'
		}

		set(state => {
			const nextToasts = [...state.toasts, toast]
			return {
				toasts: nextToasts,
				toastHistory: [...state.toastHistory, toast],
				...computeToastMetrics(nextToasts)
			}
		})

		logger.info('Toast added', {
			action: 'toast_added',
			metadata: {
				toastId: id,
				type: toastData.type,
				category: toastData.category,
				priority: toast.priority
			}
		})

		return id
	},

	removeToast: id => {
		set(state => {
			const toastToRemove = state.toasts.find(t => t.id === id)
			if (toastToRemove) {
				logger.info('Toast removed', {
					action: 'toast_removed',
					metadata: { toastId: id, type: toastToRemove.type }
				})
			}

			const remaining = state.toasts.filter(t => t.id !== id)

			return {
				toasts: remaining,
				...computeToastMetrics(remaining)
			}
		})
	},

	clearToasts: category => {
		set(state => {
			const toastsToClear = category
				? state.toasts.filter(t => t.category === category)
				: state.toasts

			if (toastsToClear.length > 0) {
				logger.info('Toasts cleared', {
					action: 'toasts_cleared',
					metadata: {
						clearedCount: toastsToClear.length,
						category: category || 'all'
					}
				})
			}

			const remaining = category
				? state.toasts.filter(t => t.category !== category)
				: []

			return {
				toasts: remaining,
				...computeToastMetrics(remaining)
			}
		})
	},

	clearAllToasts: () => {
		get().clearToasts()
	},

	updateToast: (id, updates) => {
		set(state => {
			const updatedToasts = state.toasts.map(toast =>
				toast.id === id ? { ...toast, ...updates } : toast
			)
			return {
				toasts: updatedToasts,
				...computeToastMetrics(updatedToasts)
			}
		})
	},

	dismissCategory: category => {
		get().clearToasts(category)
	},

	dismissPriority: priority => {
		set(state => {
			const toastsToDismiss = state.toasts.filter(t => t.priority === priority)

			if (toastsToDismiss.length > 0) {
				logger.info('Priority toasts dismissed', {
					action: 'priority_toasts_dismissed',
					metadata: { priority, dismissedCount: toastsToDismiss.length }
				})
			}

			const remaining = state.toasts.filter(t => t.priority !== priority)

			return {
				toasts: remaining,
				...computeToastMetrics(remaining)
			}
		})
	},

	getToastsByCategory: category => {
		return get().toasts.filter(t => t.category === category)
	},

	getToastsByPriority: priority => {
		return get().toasts.filter(t => t.priority === priority)
	},

	getPersistentToasts: () => {
		return get().toasts.filter(t => t.persistent)
	},

	addModalToast: (modalId, toastData) => {
		const id = generateToastId()
		const toast: EnhancedToast = {
			...toastData,
			id,
			timestamp: new Date(),
			priority: toastData.priority || 'normal'
		}

		set(state => {
				// Filter toasts for this modal (used for potential cleanup)
			state.toasts.filter(t => t.metadata?.modalId === modalId)
			const nextToasts = [...state.toasts, toast]
			return {
				toasts: nextToasts,
				toastHistory: [...state.toastHistory, toast],
				...computeToastMetrics(nextToasts)
			}
		})

		logger.info('Modal toast added', {
			action: 'modal_toast_added',
			metadata: {
				toastId: id,
				type: toastData.type,
				category: toastData.category,
				priority: toast.priority,
				modalId
			}
		})

		return id
	},

	clearModalToasts: modalId => {
		set(state => {
			const toastsToClear = state.toasts.filter(
				t => t.metadata?.modalId === modalId
			)

			if (toastsToClear.length > 0) {
				logger.info('Modal toasts cleared', {
					action: 'modal_toasts_cleared',
					metadata: {
						clearedCount: toastsToClear.length,
						modalId
					}
				})
			}

			const remaining = state.toasts.filter(
				t => t.metadata?.modalId !== modalId
			)

			return {
				toasts: remaining,
				...computeToastMetrics(remaining)
			}
		})
	},

	getModalToasts: modalId => {
		return get().toasts.filter(t => t.metadata?.modalId === modalId)
	}
}))
