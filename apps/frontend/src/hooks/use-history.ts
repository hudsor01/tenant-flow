/**
 * History Store Hooks
 *
 * Provides React hooks for interacting with the history store.
 * Enables undo/redo functionality across the application.
 */

import { useHistoryStore } from '#stores/history-store'
import type { HistoryActionType } from '#stores/history-store'

/**
 * Hook to access the complete history store
 */
export const useHistory = () => {
	return useHistoryStore()
}

/**
 * Hook for undo/redo operations
 */
export const useUndoRedo = () => {
	const store = useHistoryStore()
	const { undo, redo, undoStack, redoStack, isUndoInProgress, isRedoInProgress } = store

	const canUndo = undoStack.length > 0 && !isUndoInProgress
	const canRedo = redoStack.length > 0 && !isRedoInProgress
	const nextUndoAction = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null
	const nextRedoAction = redoStack.length > 0 ? redoStack[0] : null

	return { undo, redo, canUndo, canRedo, nextUndoAction, nextRedoAction }
}

/**
 * Hook for managing history actions
 */
export const useHistoryActions = () => {
	const { pushAction, clearHistory, startGroup, endGroup } = useHistoryStore()
	return { pushAction, clearHistory, startGroup, endGroup }
}

/**
 * Hook for querying history
 */
export const useHistoryQueries = () => {
	const { getActionsByEntity, getRecentActions, getActionsByType } = useHistoryStore()
	return { getActionsByEntity, getRecentActions, getActionsByType }
}

/**
 * Hook for entity-specific history tracking
 */
export const useEntityHistory = (entityType: string, entityId?: string) => {
	const { getActionsByEntity } = useHistoryStore()
	const actions = getActionsByEntity(entityType, entityId)

	return {
		actions,
		hasHistory: actions.length > 0,
		lastAction: actions[actions.length - 1] || null
	}
}

/**
 * Hook for action type filtering
 */
export const useActionTypeHistory = (actionType: HistoryActionType) => {
	const { getActionsByType } = useHistoryStore()
	const actions = getActionsByType(actionType)

	return {
		actions,
		hasActions: actions.length > 0,
		count: actions.length
	}
}