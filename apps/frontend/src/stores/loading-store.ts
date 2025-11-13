/**
 * Loading Store - Global Loading State Management
 *
 * Follows Zustand best practices and CLAUDE.md guidelines:
 * - Manages global loading states across the application
 * - Supports multiple concurrent loading operations
 * - Provides loading indicators and progress tracking
 * - Prevents UI conflicts during loading states
 */

import { create } from 'zustand'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'LoadingStore' })

export interface LoadingOperation {
	id: string
	message?: string
	progress?: number // 0-100
	startTime: Date
	category?: string
	modalId?: string
}

export interface LoadingStoreState {
	// Active loading operations
	operations: Record<string, LoadingOperation>

	// Global loading state
	isLoading: boolean

	// Actions
	startLoading: (id: string, message?: string, category?: string) => void
	stopLoading: (id: string) => void
	updateProgress: (id: string, progress: number) => void
	clearAllLoading: () => void

	// Category-based operations
	startCategoryLoading: (category: string, message?: string) => string
	stopCategoryLoading: (category: string) => void
	isCategoryLoading: (category: string) => boolean

	// Modal-specific operations
	startModalLoading: (modalId: string, message?: string) => string
	stopModalLoading: (modalId: string) => void
	isModalLoading: (modalId: string) => boolean

	// Queries
	getOperationsByCategory: (category: string) => LoadingOperation[]
	getOperation: (id: string) => LoadingOperation | null
	getActiveOperations: () => LoadingOperation[]
	getModalOperations: (modalId: string) => LoadingOperation[]

	// Computed properties
	activeOperationCount: number
	hasOperations: boolean
	globalProgress: number
}

const generateOperationId = (category?: string): string => {
	const prefix = category ? `${category}_` : ''
	return `${prefix}loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const computeLoadingMetrics = (
	operations: Record<string, LoadingOperation>
) => {
	const activeOperations = Object.values(operations)
	const activeOperationCount = activeOperations.length
	if (activeOperationCount === 0) {
		return {
			isLoading: false,
			activeOperationCount: 0,
			hasOperations: false,
			globalProgress: 100
		}
	}

	const totalProgress = activeOperations.reduce(
		(sum, op) => sum + (op.progress ?? 0),
		0
	)
	const averageProgress = Math.round(totalProgress / activeOperationCount)

	return {
		isLoading: true,
		activeOperationCount,
		hasOperations: true,
		globalProgress: averageProgress
	}
}

export const useLoadingStore = create<LoadingStoreState>((set, get) => ({
	operations: {},
	isLoading: false,
	activeOperationCount: 0,
	hasOperations: false,
	globalProgress: 100,

	startLoading: (id, message, category) => {
		const operation: LoadingOperation = {
			id,
			progress: 0,
			startTime: new Date()
		}

		if (message) {
			operation.message = message
		}

		if (category) {
			operation.category = category
		}

		set(state => {
			const nextOperations = {
				...state.operations,
				[id]: operation
			}
			return {
				operations: nextOperations,
				...computeLoadingMetrics(nextOperations)
			}
		})

		logger.info('Loading started', {
			action: 'loading_started',
			metadata: { operationId: id, category, message }
		})
	},

	stopLoading: id => {
		set(state => {
			const operation = state.operations[id]
			if (operation) {
				const duration = Date.now() - operation.startTime.getTime()

				logger.info('Loading stopped', {
					action: 'loading_stopped',
					metadata: {
						operationId: id,
						category: operation.category,
						duration
					}
				})

				const { [id]: _, ...remaining } = state.operations
				return {
					operations: remaining,
					...computeLoadingMetrics(remaining)
				}
			}
			return state
		})
	},

	updateProgress: (id, progress) => {
		set(state => {
			const operation = state.operations[id]
			if (operation) {
				const updatedOperations = {
					...state.operations,
					[id]: {
						...operation,
						progress: Math.max(0, Math.min(100, progress))
					}
				}
				return {
					operations: updatedOperations,
					...computeLoadingMetrics(updatedOperations)
				}
			}
			return state
		})
	},

	clearAllLoading: () => {
		set(state => {
			const operationCount = Object.keys(state.operations).length
			if (operationCount > 0) {
				logger.info('All loading cleared', {
					action: 'all_loading_cleared',
					metadata: { clearedCount: operationCount }
				})
			}
			return {
				operations: {},
				...computeLoadingMetrics({})
			}
		})
	},

	startCategoryLoading: (category, message) => {
		const id = generateOperationId(category)
		get().startLoading(id, message, category)
		return id
	},

	stopCategoryLoading: category => {
		const operations = get().operations
		const categoryOperations = Object.keys(operations).filter(
			id => operations[id]?.category === category
		)
		categoryOperations.forEach(id => get().stopLoading(id))
	},

	isCategoryLoading: category => {
		return get().getOperationsByCategory(category).length > 0
	},

	startModalLoading: (modalId, message) => {
		const id = generateOperationId()
		const operation: LoadingOperation = {
			id,
			...(message ? { message } : {}),
			progress: 0,
			startTime: new Date(),
			modalId
		}
		set(state => {
			const nextOperations = {
				...state.operations,
				[id]: operation
			}
			return {
				operations: nextOperations,
				...computeLoadingMetrics(nextOperations)
			}
		})
		logger.info('Modal loading started', {
			action: 'modal_loading_started',
			metadata: { operationId: id, modalId, message }
		})
		return id
	},

	stopModalLoading: modalId => {
		const operations = get().operations
		const modalOperations = Object.keys(operations).filter(
			id => operations[id]?.modalId === modalId
		)
		modalOperations.forEach(id => get().stopLoading(id))
	},

	isModalLoading: modalId => {
		return get().getModalOperations(modalId).length > 0
	},

	getOperationsByCategory: category => {
		const operations = get().operations
		return Object.values(operations).filter(op => op.category === category)
	},

	getOperation: id => {
		return get().operations[id] || null
	},

	getActiveOperations: () => {
		return Object.values(get().operations)
	},

	getModalOperations: modalId => {
		const operations = get().operations
		return Object.values(operations).filter(op => op.modalId === modalId)
	}
}))
