/**
 * Common loading state hook to eliminate DRY violations
 * Provides consistent loading state management across components
 */
import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

export interface UseLoadingStateOptions {
	initialLoading?: boolean
	onError?: (error: Error) => void
	logErrors?: boolean
}

export function useLoadingState(options: UseLoadingStateOptions = {}) {
	const { initialLoading = false, onError, logErrors = true } = options
	const [isLoading, setIsLoading] = useState(initialLoading)
	const [error, setError] = useState<Error | null>(null)

	const execute = useCallback(
		async <T>(asyncFunction: () => Promise<T>): Promise<T | null> => {
			setIsLoading(true)
			setError(null)

			try {
				const result = await asyncFunction()
				return result
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err))
				setError(error)
				
				if (logErrors) {
					logger.error('Operation failed:', error)
				}
				
				if (onError) {
					onError(error)
				}
				
				return null
			} finally {
				setIsLoading(false)
			}
		},
		[onError, logErrors]
	)

	const reset = useCallback(() => {
		setIsLoading(false)
		setError(null)
	}, [])

	return {
		isLoading,
		error,
		execute,
		reset,
		setIsLoading,
		setError
	}
}