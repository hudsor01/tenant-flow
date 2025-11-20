/**
 * Loading Store Hooks
 *
 * Provides React hooks for interacting with the loading store.
 * Follows the project's pattern of providing hooks for store interactions.
 */

import { useCallback } from 'react'
import { useLoadingStore } from '#stores/loading-store'

/**
 * Hook to access loading store state and actions
 */
export const useLoading = () => {
	return useLoadingStore()
}

/**
 * Hook for global loading state
 */
export const useGlobalLoading = () => {
	const { isLoading, activeOperationCount, globalProgress } = useLoadingStore()
	return { isLoading, activeOperationCount, globalProgress }
}

/**
 * Hook for loading operations
 */
export const useLoadingOperations = () => {
	const { startLoading, stopLoading, updateProgress, getActiveOperations } =
		useLoadingStore()
	return { startLoading, stopLoading, updateProgress, getActiveOperations }
}

/**
 * Hook for category-based loading
 */
export const useCategoryLoading = (category: string) => {
	const {
		startCategoryLoading,
		stopCategoryLoading,
		isCategoryLoading,
		getOperationsByCategory
	} = useLoadingStore()

	// Use useCallback to prevent unnecessary re-renders
	// and ensure stable function references to prevent infinite loops in useEffect
	const startLoading = useCallback(
		(message?: string) => startCategoryLoading(category, message),
		[category, startCategoryLoading]
	)

	const stopLoading = useCallback(
		() => stopCategoryLoading(category),
		[category, stopCategoryLoading]
	)

	const isLoading = isCategoryLoading(category)
	const operations = getOperationsByCategory(category)

	return { startLoading, stopLoading, isLoading, operations }
}

/**
 * Hook for single loading operation
 */
export const useLoadingOperation = (operationId: string) => {
	const { getOperation, updateProgress, stopLoading } = useLoadingStore()

	return {
		operation: getOperation(operationId),
		updateProgress: (progress: number) => updateProgress(operationId, progress),
		stopLoading: () => stopLoading(operationId)
	}
}
