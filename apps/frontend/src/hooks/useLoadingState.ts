import { useState, useCallback } from 'react'

/**
 * Unified loading state hook to eliminate duplicate loading state patterns
 */
export function useLoadingState(initialState = false) {
	const [isLoading, setIsLoading] = useState(initialState)

	const startLoading = useCallback(() => {
		setIsLoading(true)
	}, [])

	const stopLoading = useCallback(() => {
		setIsLoading(false)
	}, [])

	const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
		try {
			setIsLoading(true)
			return await asyncFn()
		} finally {
			setIsLoading(false)
		}
	}, [])

	return {
		isLoading,
		startLoading,
		stopLoading,
		withLoading,
		setIsLoading
	}
}

/**
 * Multiple loading states hook for components that need to track several operations
 */
export function useMultipleLoadingStates<T extends string>(keys: readonly T[]) {
	const [loadingStates, setLoadingStates] = useState<Record<T, boolean>>(
		keys.reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<T, boolean>)
	)

	const setLoading = useCallback((key: T, loading: boolean) => {
		setLoadingStates(prev => ({ ...prev, [key]: loading }))
	}, [])

	const startLoading = useCallback((key: T) => {
		setLoading(key, true)
	}, [setLoading])

	const stopLoading = useCallback((key: T) => {
		setLoading(key, false)
	}, [setLoading])

	const withLoading = useCallback(async <R>(key: T, asyncFn: () => Promise<R>): Promise<R> => {
		try {
			setLoading(key, true)
			return await asyncFn()
		} finally {
			setLoading(key, false)
		}
	}, [setLoading])

	const isAnyLoading = Object.values(loadingStates).some(Boolean)

	return {
		loadingStates,
		isLoading: (key: T) => loadingStates[key],
		setLoading,
		startLoading,
		stopLoading,
		withLoading,
		isAnyLoading
	}
}

/**
 * Error state hook to pair with loading states
 */
export function useErrorState<T = string>(initialError: T | null = null) {
	const [error, setError] = useState<T | null>(initialError)

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const setErrorWithLogging = useCallback((error: T) => {
		setError(error)
		if (error && typeof error === 'string') {
			console.error('Component error:', error)
		}
	}, [])

	return {
		error,
		setError: setErrorWithLogging,
		clearError,
		hasError: error !== null
	}
}

/**
 * Combined loading and error state hook
 */
export function useAsyncState<T = string>(initialLoading = false, initialError: T | null = null) {
	const { isLoading, startLoading, stopLoading, withLoading } = useLoadingState(initialLoading)
	const { error, setError, clearError, hasError } = useErrorState<T>(initialError)

	const execute = useCallback(async <R>(asyncFn: () => Promise<R>): Promise<R | null> => {
		try {
			clearError()
			return await withLoading(asyncFn)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message as T : String(err) as T
			setError(errorMessage)
			return null
		}
	}, [withLoading, clearError, setError])

	return {
		isLoading,
		error,
		hasError,
		startLoading,
		stopLoading,
		setError,
		clearError,
		execute
	}
}