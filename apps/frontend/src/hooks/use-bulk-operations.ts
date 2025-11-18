/**
 * Bulk Operations Store Hooks
 *
 * Provides React hooks for interacting with the bulk operations store.
 * Enables bulk operations across the application, particularly for property imports.
 */

import { useBulkOperationsStore } from '#stores/bulk-operations-store'

/**
 * Hook to access the complete bulk operations store
 */
export const useBulkOperations = () => {
	return useBulkOperationsStore()
}

/**
 * Hook for managing bulk operations
 */
export const useBulkOperation = () => {
	const { startBulkOperation, updateBulkOperation, completeBulkOperation, cancelBulkOperation } = useBulkOperationsStore()
	return { startBulkOperation, updateBulkOperation, completeBulkOperation, cancelBulkOperation }
}

/**
 * Hook for bulk operation progress
 */
export const useBulkOperationProgress = (operationId?: string) => {
	const store = useBulkOperationsStore()
	const { operations, getOperation, activeOperation } = store

	const operation = operationId ? getOperation(operationId) : activeOperation

	return {
		operation,
		activeOperation,
		operations: Object.values(operations)
	}
}

/**
 * Hook for item selection management
 */
export const useBulkSelection = (entityType: string) => {
	const {
		selectItems,
		deselectItems,
		clearSelection,
		toggleItemSelection,
		getSelectedItems,
		getSelectionCount,
		isItemSelected
	} = useBulkOperationsStore()

	return {
		selectItems: (itemIds: string[]) => selectItems(entityType, itemIds),
		deselectItems: (itemIds: string[]) => deselectItems(entityType, itemIds),
		clearSelection: () => clearSelection(entityType),
		toggleItemSelection: (itemId: string) => toggleItemSelection(entityType, itemId),
		getSelectedItems: () => getSelectedItems(entityType),
		getSelectionCount: () => getSelectionCount(entityType),
		isItemSelected: (itemId: string) => isItemSelected(entityType, itemId)
	}
}

/**
 * Hook for bulk operation history
 */
export const useBulkOperationHistory = () => {
	const { operationHistory, clearOperationHistory, getOperationsByType } = useBulkOperationsStore()
	return { operationHistory, clearHistory: clearOperationHistory, getOperationsByType }
}