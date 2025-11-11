/**
 * Modal/Dialog Store - Global Modal State Management
 *
 * Follows Zustand best practices and CLAUDE.md guidelines:
 * - Manages multiple modal/dialog states globally
 * - Prevents modal conflicts and provides consistent behavior
 * - Supports nested modals and modal stacks
 * - React Spring animations for smooth transitions
 * - Auto-close behaviors and modal types
 */

import { create } from 'zustand'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { MutationKey, QueryClient } from '@tanstack/react-query'

const logger = createLogger({ component: 'ModalStore' })

type TenantFlowWindow = Window & {
	__TENANTFLOW_QUERY_CLIENT__?: QueryClient
}

const resolveQueryClient = (client?: QueryClient): QueryClient | undefined => {
	if (client) {
		return client
	}

	if (typeof window !== 'undefined') {
		return (window as TenantFlowWindow).__TENANTFLOW_QUERY_CLIENT__
	}

	return undefined
}

const containsStringValue = (value: unknown, target: string): boolean => {
	if (typeof value === 'string') {
		return value === target
	}

	if (Array.isArray(value)) {
		return value.some(item => containsStringValue(item, target))
	}

	return false
}

const extractMetaTrackingKey = (meta: unknown): string | undefined => {
	if (!meta || typeof meta !== 'object') {
		return undefined
	}

	const metaObject = meta as Record<string, unknown>
	const possibleKeys = [
		metaObject.modalTrackingKey,
		metaObject.trackMutationKey,
		metaObject.mutationKey,
		metaObject.key
	]

	for (const possibleKey of possibleKeys) {
		if (typeof possibleKey === 'string') {
			return possibleKey
		}
	}

	return undefined
}

const mutationMatchesTrackedKey = (
	mutationKey: MutationKey | undefined,
	trackedKey: string,
	meta: unknown
) => {
	const metaKey = extractMetaTrackingKey(meta)
	if (metaKey && metaKey === trackedKey) {
		return true
	}

	if (!mutationKey) {
		return false
	}

	return mutationKey.some(value => containsStringValue(value, trackedKey))
}

const normalizeError = (error: unknown): Error | undefined => {
	if (!error) {
		return undefined
	}

	if (error instanceof Error) {
		return error
	}

	return new Error(
		typeof error === 'string' ? error : 'Mutation failed with an unknown error'
	)
}

export type ModalType =
	| 'dialog'
	| 'alert'
	| 'confirm'
	| 'drawer'
	| 'tooltip'
	| 'fullscreen'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'

export type ModalPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'

export interface ModalState {
	id: string
	isOpen: boolean
	data?: Record<string, unknown>
	zIndex?: number

	// Modal configuration
	type?: ModalType
	size?: ModalSize
	position?: ModalPosition
	animationVariant?: 'fade' | 'slide' | 'scale' | 'bounce'
	transitionDuration?: number
	closeOnOutsideClick?: boolean
	closeOnEscape?: boolean
	autoCloseDelay?: number
	persistThroughNavigation?: boolean
	lazyLoad?: boolean
	isLoaded?: boolean
	trackMutation?: string

	// Accessibility
	autoFocus?: boolean
	restoreFocus?: boolean
	ariaLabel?: string
	ariaDescribedBy?: string
}

export interface MutationOptions {
	key?: string
	onSuccess?: () => void
	onError?: (error: Error) => void
	autoCloseModal?: boolean
}

export interface MutationState {
	id: string
	key: string
	status: 'pending' | 'success' | 'error'
	startTime: number
	endTime?: number
	error?: Error
	options?: MutationOptions
}

export interface LazyContentState {
	id: string
	isLoaded: boolean
}

export interface ModalStoreState {
	// Modal registry - all registered modals
	modals: Record<string, ModalState>

	// Mutation registry - for tracking mutation states
	mutations: Record<string, MutationState>

	// Lazy content registry
	lazyContent: Record<string, LazyContentState>

	// Modal stack for z-index management
	modalStack: string[]

	// Highest z-index used
	highestZIndex: number

	// Active modal stack for navigation
	activeModalStack: string[]

	// Default settings
	defaultCloseOnOutsideClick: boolean
	defaultCloseOnEscape: boolean
	defaultAutoFocus: boolean

	// Actions
	openModal: (
		id: string,
		data?: Record<string, unknown>,
		config?: Partial<ModalState>
	) => void
	closeModal: (id: string) => void
	closeAllModals: () => void
	toggleModal: (
		id: string,
		data?: Record<string, unknown>,
		config?: Partial<ModalState>
	) => void
	isModalOpen: (id: string) => boolean
	getModalData: (id: string) => Record<string, unknown> | undefined
	getActiveModal: () => ModalState | null
	getModalStack: () => ModalState[]

	// Modal types & presets
	openConfirmModal: (config: ConfirmModalConfig) => Promise<boolean>
	openAlertModal: (config: AlertModalConfig) => Promise<void>
	openDrawer: (config: DrawerConfig) => void

	// Auto-close & API integration
	trackMutation: (
		modalId: string,
		mutationKey: string,
		client?: QueryClient
	) => void
	closeOnMutationSuccess: (mutationKey: string) => void

	// Lazy loading
	loadModalContent: (id: string) => Promise<void>

	// Navigation integration
	handleNavigation: (newRoute: string) => void

	// Settings
	setDefaults: (
		settings: Partial<
			Pick<
				ModalStoreState,
				| 'defaultCloseOnOutsideClick'
				| 'defaultCloseOnEscape'
				| 'defaultAutoFocus'
			>
		>
	) => void

	// Computed properties
	hasOpenModals: boolean
	activeModalCount: number
	isAnimating: (id: string) => boolean
}

interface ConfirmModalConfig {
	title: string
	message: string
	confirmText?: string
	cancelText?: string
	type?: 'primary' | 'destructive'
	size?: ModalSize
}

interface AlertModalConfig {
	title: string
	message: string
	confirmText?: string
	type?: 'info' | 'success' | 'warning' | 'error'
	size?: ModalSize
}

interface DrawerConfig {
	title: string
	content: React.ReactNode
	position?: 'left' | 'right' | 'top' | 'bottom'
	size?: ModalSize
}

const computeModalMetrics = (modalStack: string[]) => ({
	hasOpenModals: modalStack.length > 0,
	activeModalCount: modalStack.length
})

const initialState = {
	modals: {},
	mutations: {},
	lazyContent: {},
	modalStack: [],
	highestZIndex: 1000,
	activeModalStack: [],
	defaultCloseOnOutsideClick: true,
	defaultCloseOnEscape: true,
	defaultAutoFocus: true,
	hasOpenModals: false,
	activeModalCount: 0
}

export const useModalStore = create<ModalStoreState>((set, get) => ({
	...initialState,

	openModal: (
		id: string,
		data?: Record<string, unknown>,
		config?: Partial<ModalState>
	) => {
		set(state => {
			const existingModal = state.modals[id]
			const newModal: ModalState = {
				id,
				isOpen: true,
				zIndex: state.modalStack.length + 1000,
				// Apply defaults
				closeOnOutsideClick: state.defaultCloseOnOutsideClick,
				closeOnEscape: state.defaultCloseOnEscape,
				autoFocus: state.defaultAutoFocus,
				// Merge with existing and new config
				...existingModal,
				...config
			}

			if (data) {
				newModal.data = data
			} else if (existingModal?.data) {
				newModal.data = existingModal.data
			}

			logger.info('Modal opened', {
				action: 'modal_opened',
				metadata: {
					modalId: id,
					type: newModal.type,
					size: newModal.size,
					hasData: !!data
				}
			})

			const updatedStack = [
				...state.modalStack.filter(modalId => modalId !== id),
				id
			]

			return {
				modals: {
					...state.modals,
					[id]: newModal
				},
				modalStack: updatedStack,
				...computeModalMetrics(updatedStack)
			}
		})
	},

	closeModal: (id: string) => {
		set(state => {
			if (!state.modals[id]?.isOpen) return state

			logger.info('Modal closed', {
				action: 'modal_closed',
				metadata: { modalId: id }
			})

			const updatedStack = state.modalStack.filter(modalId => modalId !== id)

			return {
				modals: {
					...state.modals,
					[id]: {
						...state.modals[id],
						isOpen: false
					}
				},
				modalStack: updatedStack,
				...computeModalMetrics(updatedStack)
			}
		})
	},

	closeAllModals: () => {
		set(state => {
			const openModalIds = Object.keys(state.modals).filter(
				id => state.modals[id]?.isOpen
			)

			if (openModalIds.length > 0) {
				logger.info('All modals closed', {
					action: 'all_modals_closed',
					metadata: { closedCount: openModalIds.length }
				})
			}

			const updatedModals = { ...state.modals }
			openModalIds.forEach(id => {
				if (updatedModals[id]) {
					updatedModals[id] = {
						...updatedModals[id],
						isOpen: false
					}
				}
			})

			return {
				modals: updatedModals,
				modalStack: [],
				...computeModalMetrics([])
			}
		})
	},

	toggleModal: (
		id: string,
		data?: Record<string, unknown>,
		config?: Partial<ModalState>
	) => {
		const { isModalOpen, openModal, closeModal } = get()
		if (isModalOpen(id)) {
			closeModal(id)
		} else {
			openModal(id, data, config)
		}
	},

	isModalOpen: (id: string) => {
		return get().modals[id]?.isOpen ?? false
	},

	getModalData: (id: string) => {
		return get().modals[id]?.data
	},

	getActiveModal: () => {
		const { modalStack, modals } = get()
		const activeModalId = modalStack[modalStack.length - 1]
		return activeModalId ? modals[activeModalId] || null : null
	},

	getModalStack: () => {
		const { modalStack, modals } = get()
		return modalStack
			.map(id => modals[id])
			.filter((modal): modal is ModalState => modal !== undefined)
	},

	// Modal types & presets
	openConfirmModal: async (config: ConfirmModalConfig): Promise<boolean> => {
		return new Promise(resolve => {
			const modalId = `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

			const handleConfirm = () => {
				get().closeModal(modalId)
				resolve(true)
			}

			const handleCancel = () => {
				get().closeModal(modalId)
				resolve(false)
			}

			get().openModal(
				modalId,
				{
					...config,
					onConfirm: handleConfirm,
					onCancel: handleCancel
				},
				{
					type: 'confirm',
					size: config.size || 'sm',
					closeOnOutsideClick: false,
					closeOnEscape: true
				}
			)
		})
	},

	openAlertModal: async (config: AlertModalConfig): Promise<void> => {
		return new Promise(resolve => {
			const modalId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

			const handleConfirm = () => {
				get().closeModal(modalId)
				resolve()
			}

			get().openModal(
				modalId,
				{
					...config,
					onConfirm: handleConfirm
				},
				{
					type: 'alert',
					size: config.size || 'sm',
					closeOnOutsideClick: true,
					closeOnEscape: true
				}
			)
		})
	},

	openDrawer: (config: DrawerConfig) => {
		const modalId = `drawer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		get().openModal(
			modalId,
			{ content: config.content },
			{
				type: 'drawer',
				size: config.size || 'md',
				position: config.position || 'right',
				closeOnOutsideClick: true,
				closeOnEscape: true,
				animationVariant: 'slide',
				ariaLabel: config.title
			}
		)
	},

	// API integration
	trackMutation: (
		modalId: string,
		mutationKey: string,
		client?: QueryClient
	) => {
		const mutationId = `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
		const startTime = Date.now()

		set(state => ({
			mutations: {
				...state.mutations,
				[mutationId]: {
					id: mutationId,
					key: mutationKey,
					status: 'pending',
					startTime
				}
			}
		}))

		const queryClient = resolveQueryClient(client)
		const mutationCache = queryClient?.getMutationCache()

		if (!mutationCache) {
			return
		}

		let cleanupTimeout: ReturnType<typeof setTimeout> | undefined
		let unsubscribed = false
		const unsubscribe = mutationCache.subscribe(event => {
			if (event?.type !== 'updated') {
				return
			}

			const { mutation } = event
			if (
				!mutationMatchesTrackedKey(
					mutation.options.mutationKey,
					mutationKey,
					mutation.options.meta
				)
			) {
				return
			}

			const status = mutation.state.status as MutationState['status']
			if (status === 'pending') {
				return
			}

			set(state => {
				const trackedMutation = state.mutations[mutationId]
				if (!trackedMutation) {
					return state
				}

				let updatedMutation: MutationState
				if (status === 'error') {
					const error = normalizeError(mutation.state.error)
					updatedMutation = {
						...trackedMutation,
						status,
						endTime: Date.now(),
						...(error ? { error } : {})
					}
				} else {
					updatedMutation = {
						...trackedMutation,
						status,
						endTime: Date.now()
					}
				}

				return {
					mutations: {
						...state.mutations,
						[mutationId]: updatedMutation
					}
				}
			})

			if (status === 'success') {
				get().closeOnMutationSuccess(mutationKey)
			} else if (status === 'error') {
				logger.error('Tracked mutation failed', {
					action: 'modal_mutation_failed',
					metadata: { modalId, mutationKey }
				})
			}

			if (!unsubscribed) {
				unsubscribed = true
				if (cleanupTimeout) {
					clearTimeout(cleanupTimeout)
					cleanupTimeout = undefined
				}
				unsubscribe()
			}
		})

		cleanupTimeout = setTimeout(() => {
			if (unsubscribed) {
				return
			}

			unsubscribed = true
			logger.warn('Mutation tracking timed out; cleaning up subscription', {
				action: 'modal_mutation_tracking_timeout',
				metadata: { modalId, mutationKey }
			})
			unsubscribe()
		}, 60_000)
	},

	closeOnMutationSuccess: (mutationKey: string) => {
		set(state => {
			const modalsToClose = Object.keys(state.modals).filter(
				id =>
					state.modals[id]?.trackMutation === mutationKey &&
					state.modals[id]?.isOpen
			)

			if (modalsToClose.length > 0) {
				logger.info('Modals closed after mutation success', {
					action: 'modals_closed_mutation_success',
					metadata: { mutationKey, closedCount: modalsToClose.length }
				})

				const updatedModals = { ...state.modals }
				modalsToClose.forEach(id => {
					if (updatedModals[id]) {
						updatedModals[id] = {
							...updatedModals[id],
							isOpen: false
						}
					}
				})

				return {
					modals: updatedModals,
					modalStack: state.modalStack.filter(
						id => !modalsToClose.includes(id)
					),
					...computeModalMetrics(
						state.modalStack.filter(id => !modalsToClose.includes(id))
					)
				}
			}

			return state
		})
	},

	// Lazy loading
	loadModalContent: async (id: string) => {
		const modal = get().modals[id]
		if (!modal || modal.isLoaded) return

		set(state => ({
			modals: {
				...state.modals,
				[id]: {
					...state.modals[id]!,
					isLoaded: true
				}
			}
		}))
	},

	// Navigation integration
	handleNavigation: (newRoute: string) => {
		set(state => {
			// Close modals that don't persist through navigation
			const modalsToClose = Object.keys(state.modals).filter(
				id =>
					state.modals[id]?.isOpen &&
					!state.modals[id]?.persistThroughNavigation
			)

			if (modalsToClose.length > 0) {
				logger.info('Modals closed due to navigation', {
					action: 'modals_closed_navigation',
					metadata: { newRoute, closedCount: modalsToClose.length }
				})

				const updatedModals = { ...state.modals }
				modalsToClose.forEach(id => {
					if (updatedModals[id]) {
						updatedModals[id] = {
							...updatedModals[id],
							isOpen: false
						}
					}
				})

				return {
					modals: updatedModals,
					modalStack: state.modalStack.filter(
						id => !modalsToClose.includes(id)
					),
					...computeModalMetrics(
						state.modalStack.filter(id => !modalsToClose.includes(id))
					)
				}
			}

			return state
		})
	},

	setDefaults: settings => {
		set(settings)
	},

	isAnimating: (id: string) => {
		// Check if modal is in transition (basic implementation)
		const modal = get().modals[id]
		return modal?.isOpen === false && get().modalStack.includes(id)
	}
}))
