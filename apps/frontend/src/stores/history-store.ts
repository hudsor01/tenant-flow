/**
 * History Store - Undo/Redo Functionality
 *
 * Provides global undo/redo capabilities across the application
 * Tracks user actions and allows reverting changes
 * Follows Zustand best practices and CLAUDE.md guidelines
 */

import { create } from 'zustand'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'HistoryStore' })

export type HistoryActionType =
	| 'create'
	| 'update'
	| 'delete'
	| 'bulk_create'
	| 'bulk_update'
	| 'bulk_delete'
	| 'status_change'
	| 'assignment'

export interface HistoryAction {
	id: string
	type: HistoryActionType
	entityType: string // 'property', 'tenant', 'lease', etc.
	entityId: string | string[] // Single ID or array for bulk operations
	timestamp: Date
	userId?: string
	description: string

	// Action data
	before?: Record<string, unknown>
	after?: Record<string, unknown>

	// Undo/redo metadata
	canUndo: boolean
	canRedo: boolean
	undoAction?: () => Promise<void> | void
	redoAction?: () => Promise<void> | void

	// Grouping for related actions
	groupId?: string
	isPartOfGroup?: boolean
}

export interface HistoryState {
	// Action stacks
	undoStack: HistoryAction[]
	redoStack: HistoryAction[]

	// Configuration
	maxHistorySize: number
	groupTimeout: number // ms to wait before creating new group

	// Current group tracking
	currentGroupId: string | null
	lastActionTime: number

	// UI state
	isUndoInProgress: boolean
	isRedoInProgress: boolean

	// Actions
	pushAction: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void
	undo: () => Promise<void>
	redo: () => Promise<void>
	clearHistory: () => void

	// Grouping
	startGroup: (groupId?: string) => void
	endGroup: () => void

	// Queries
	getActionsByEntity: (entityType: string, entityId?: string) => HistoryAction[]
	getRecentActions: (limit?: number) => HistoryAction[]
	getActionsByType: (type: HistoryActionType) => HistoryAction[]
}

const generateActionId = (): string => {
	return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const generateGroupId = (): string => {
	return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
	undoStack: [],
	redoStack: [],
	maxHistorySize: 100,
	groupTimeout: 1000, // 1 second
	currentGroupId: null,
	lastActionTime: 0,
	isUndoInProgress: false,
	isRedoInProgress: false,

	get canUndo() {
		return get().undoStack.length > 0 && !get().isUndoInProgress
	},

	get canRedo() {
		return get().redoStack.length > 0 && !get().isRedoInProgress
	},

	get nextUndoAction() {
		const stack = get().undoStack
		return stack.length > 0 ? stack[stack.length - 1] : null
	},

	get nextRedoAction() {
		const stack = get().redoStack
		return stack.length > 0 ? stack[0] : null
	},

	pushAction: (actionData) => {
		const state = get()
		const now = Date.now()
		const action: HistoryAction = {
			...actionData,
			id: generateActionId(),
			timestamp: new Date(),
			canUndo: true,
			canRedo: true
		}

		// Check if this action should be grouped
		let groupId = actionData.groupId
		if (!groupId && state.currentGroupId && (now - state.lastActionTime) < state.groupTimeout) {
			groupId = state.currentGroupId
			action.isPartOfGroup = true
		}

		if (groupId) {
			action.groupId = groupId
		}

		// Clear redo stack when new action is performed
		set({
			undoStack: [...state.undoStack.slice(-state.maxHistorySize + 1), action],
			redoStack: [],
			lastActionTime: now
		})

		logger.debug('Action pushed to history', {
			action: 'history_action_pushed',
			metadata: {
				actionId: action.id,
				type: action.type,
				entityType: action.entityType,
				groupId: action.groupId
			}
		})
	},

	undo: async () => {
		const state = get()
		if (state.undoStack.length === 0 || state.isUndoInProgress) return

		const action = state.undoStack[state.undoStack.length - 1]
		if (!action || !action.undoAction) return

		set({ isUndoInProgress: true })

		try {
			await action.undoAction()

			set({
				undoStack: state.undoStack.slice(0, -1),
				redoStack: [action, ...state.redoStack],
				isUndoInProgress: false
			})

			logger.info('Action undone', {
				action: 'history_action_undone',
				metadata: {
					actionId: action.id,
					type: action.type,
					entityType: action.entityType
				}
			})
		} catch (error) {
			set({ isUndoInProgress: false })
			logger.error('Failed to undo action', {
				action: 'history_undo_failed',
				metadata: {
					actionId: action.id,
					error: error instanceof Error ? error.message : String(error)
				}
			})
			throw error
		}
	},

	redo: async () => {
		const state = get()
		if (state.redoStack.length === 0 || state.isRedoInProgress) return

		const action = state.redoStack[0]
		if (!action || !action.redoAction) return

		set({ isRedoInProgress: true })

		try {
			await action.redoAction()

			set({
				redoStack: state.redoStack.slice(1),
				undoStack: [...state.undoStack, action],
				isRedoInProgress: false
			})

			logger.info('Action redone', {
				action: 'history_action_redone',
				metadata: {
					actionId: action.id,
					type: action.type,
					entityType: action.entityType
				}
			})
		} catch (error) {
			set({ isRedoInProgress: false })
			logger.error('Failed to redo action', {
				action: 'history_redo_failed',
				metadata: {
					actionId: action.id,
					error: error instanceof Error ? error.message : String(error)
				}
			})
			throw error
		}
	},

	clearHistory: () => set({ undoStack: [], redoStack: [] }),

	startGroup: (groupId) => {
		const newGroupId = groupId || generateGroupId()
		set({
			currentGroupId: newGroupId,
			lastActionTime: Date.now()
		})
	},

	endGroup: () => set({ currentGroupId: null }),

	getActionsByEntity: (entityType, entityId) => {
		const allActions = [...get().undoStack, ...get().redoStack]
		return allActions.filter(action =>
			action.entityType === entityType &&
			(!entityId || (Array.isArray(action.entityId) ? action.entityId.includes(entityId) : action.entityId === entityId))
		)
	},

	getRecentActions: (limit = 10) => {
		return get().undoStack.slice(-limit).reverse()
	},

	getActionsByType: (type) => {
		const allActions = [...get().undoStack, ...get().redoStack]
		return allActions.filter(action => action.type === type)
	}
}))