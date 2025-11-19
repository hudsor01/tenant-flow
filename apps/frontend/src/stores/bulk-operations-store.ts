/**
 * Bulk Operations Store - Global Bulk Operation State Management
 *
 * Manages bulk operations across the application, particularly for property imports
 * Tracks operation progress, results, and provides undo/redo capabilities
 * Follows Zustand best practices and CLAUDE.md guidelines
 */

import { create } from 'zustand'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'BulkOperationsStore' })

export type BulkOperationType =
	| 'property_import'
	| 'tenant_import'
	| 'maintenance_import'
	| 'lease_import'
	| 'payment_import'

export type BulkOperationStatus =
	| 'pending'
	| 'processing'
	| 'completed'
	| 'failed'
	| 'cancelled'

export interface BulkOperationItem {
	id: string
	data: Record<string, unknown>
	status: 'pending' | 'processing' | 'success' | 'error'
	error?: string
	result?: Record<string, unknown>
}

export interface BulkOperation {
	id: string
	type: BulkOperationType
	status: BulkOperationStatus
	totalItems: number
	processedItems: number
	successfulItems: number
	failedItems: number
	items: BulkOperationItem[]
	startTime: Date
	endTime?: Date
	metadata: {
		source?: string
		userId?: string
		fileName?: string
		fileSize?: number
	}
}

export interface BulkOperationResult {
	operationId: string
	success: boolean
	message: string
	data?: Record<string, unknown>
	errors?: Array<{ itemId: string; error: string }>
}

export interface BulkOperationsState {
	// Active operations
	operations: Record<string, BulkOperation>
	activeOperation: BulkOperation | null

	// Operation history
	operationHistory: BulkOperation[]
	maxHistorySize: number

	// Selected items for bulk operations
	selectedItems: Record<string, Set<string>> // entityType -> Set<itemIds>

	// UI state
	isBulkModeActive: Record<string, boolean> // entityType -> isActive

	// Actions
	startBulkOperation: (operation: Omit<BulkOperation, 'id' | 'startTime'>) => string
	updateBulkOperation: (operationId: string, updates: Partial<BulkOperation>) => void
	completeBulkOperation: (operationId: string, result: BulkOperationResult) => void
	cancelBulkOperation: (operationId: string) => void
	clearOperationHistory: () => void

	// Selection management
	selectItems: (entityType: string, itemIds: string[]) => void
	deselectItems: (entityType: string, itemIds: string[]) => void
	clearSelection: (entityType: string) => void
	toggleItemSelection: (entityType: string, itemId: string) => void

	// Bulk mode
	enableBulkMode: (entityType: string) => void
	disableBulkMode: (entityType: string) => void

	// Queries
	getOperation: (operationId: string) => BulkOperation | null
	getOperationsByType: (type: BulkOperationType) => BulkOperation[]
	getSelectedItems: (entityType: string) => string[]
	getSelectionCount: (entityType: string) => number
	isItemSelected: (entityType: string, itemId: string) => boolean
}

// Property import specific types
export interface PropertyImportData {
	name: string
	address: string
	city: string
	state: string
	postal_code: string
	property_type: 'APARTMENT' | 'HOUSE' | 'CONDO' | 'TOWNHOUSE' | 'COMMERCIAL'
	description?: string
	units?: number
	square_feet?: number
	year_built?: number
}

const generateOperationId = (): string => {
	return `bulk_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useBulkOperationsStore = create<BulkOperationsState>((set, get) => ({
	operations: {},
	activeOperation: null,
	operationHistory: [],
	maxHistorySize: 50,
	selectedItems: {},
	isBulkModeActive: {},

	startBulkOperation: (operationData) => {
		const operationId = generateOperationId()
		const operation: BulkOperation = {
			...operationData,
			id: operationId,
			startTime: new Date(),
			status: 'pending',
			processedItems: 0,
			successfulItems: 0,
			failedItems: 0
		}

		set(state => ({
			operations: {
				...state.operations,
				[operationId]: operation
			},
			activeOperation: operation
		}))

		logger.info('Bulk operation started', {
			action: 'bulk_operation_started',
			metadata: {
				operationId,
				type: operation.type,
				totalItems: operation.totalItems
			}
		})

		return operationId
	},

	updateBulkOperation: (operationId, updates) =>
		set(state => {
			const operation = state.operations[operationId]
			if (!operation) return state

			const updatedOperation = { ...operation, ...updates }
			const newOperations = {
				...state.operations,
				[operationId]: updatedOperation
			}

			return {
				operations: newOperations,
				activeOperation: state.activeOperation?.id === operationId ? updatedOperation : state.activeOperation
			}
		}),

	completeBulkOperation: (operationId, result) =>
		set(state => {
			const operation = state.operations[operationId]
			if (!operation) return state

			const completedOperation: BulkOperation = {
				...operation,
				status: result.success ? 'completed' : 'failed',
				endTime: new Date()
			}

			// Add to history and maintain max size
			const newHistory = [completedOperation, ...state.operationHistory].slice(0, state.maxHistorySize)

			const newOperations = { ...state.operations }
			delete newOperations[operationId]

			logger.info('Bulk operation completed', {
				action: 'bulk_operation_completed',
				metadata: {
					operationId,
					type: operation.type,
					success: result.success,
					totalItems: operation.totalItems,
					successfulItems: operation.successfulItems,
					failedItems: operation.failedItems
				}
			})

			return {
				operations: newOperations,
				activeOperation: state.activeOperation?.id === operationId ? null : state.activeOperation,
				operationHistory: newHistory
			}
		}),

	cancelBulkOperation: (operationId) =>
		set(state => {
			const operation = state.operations[operationId]
			if (!operation) return state

			const cancelledOperation: BulkOperation = {
				...operation,
				status: 'cancelled',
				endTime: new Date()
			}

			// Add to history and maintain max size
			const newHistory = [cancelledOperation, ...state.operationHistory].slice(0, state.maxHistorySize)

			const newOperations = { ...state.operations }
			delete newOperations[operationId]

			logger.info('Bulk operation cancelled', {
				action: 'bulk_operation_cancelled',
				metadata: { operationId, type: operation.type }
			})

			return {
				operations: newOperations,
				activeOperation: state.activeOperation?.id === operationId ? null : state.activeOperation,
				operationHistory: newHistory
			}
		}),

	clearOperationHistory: () => set({ operationHistory: [] }),

	selectItems: (entityType, itemIds) =>
		set(state => ({
			selectedItems: {
				...state.selectedItems,
				[entityType]: new Set([...(state.selectedItems[entityType] || []), ...itemIds])
			}
		})),

	deselectItems: (entityType, itemIds) =>
		set(state => {
			const currentSelection = state.selectedItems[entityType]
			if (!currentSelection) return state

			const newSelection = new Set(currentSelection)
			itemIds.forEach(id => newSelection.delete(id))

			return {
				selectedItems: {
					...state.selectedItems,
					[entityType]: newSelection
				}
			}
		}),

	clearSelection: (entityType) =>
		set(state => ({
			selectedItems: {
				...state.selectedItems,
				[entityType]: new Set()
			}
		})),

	toggleItemSelection: (entityType, itemId) =>
		set(state => {
			const currentSelection = state.selectedItems[entityType] || new Set()
			const newSelection = new Set(currentSelection)

			if (newSelection.has(itemId)) {
				newSelection.delete(itemId)
			} else {
				newSelection.add(itemId)
			}

			return {
				selectedItems: {
					...state.selectedItems,
					[entityType]: newSelection
				}
			}
		}),

	enableBulkMode: (entityType) =>
		set(state => ({
			isBulkModeActive: {
				...state.isBulkModeActive,
				[entityType]: true
			}
		})),

	disableBulkMode: (entityType) =>
		set(state => ({
			isBulkModeActive: {
				...state.isBulkModeActive,
				[entityType]: false
			},
			selectedItems: {
				...state.selectedItems,
				[entityType]: new Set()
			}
		})),

	getOperation: (operationId) => get().operations[operationId] || null,

	getOperationsByType: (type) =>
		Object.values(get().operations).filter(op => op.type === type),

	getSelectedItems: (entityType) => Array.from(get().selectedItems[entityType] || []),

	getSelectionCount: (entityType) => (get().selectedItems[entityType] || new Set()).size,

	isItemSelected: (entityType, itemId) => (get().selectedItems[entityType] || new Set()).has(itemId)
}))