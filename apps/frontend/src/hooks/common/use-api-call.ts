/**
 * Common API call hook to eliminate DRY violations
 * Provides consistent API call handling with loading and error states
 */
import { useState, useCallback } from 'react'
<<<<<<< HEAD
import { logger } from '@/lib/logger/logger'
=======
import { logger } from '@/lib/logger'
>>>>>>> origin/main
import { toast } from 'sonner'

export interface UseApiCallOptions<TData = unknown> {
	onSuccess?: (data: TData) => void
	onError?: (error: Error) => void
	successMessage?: string
	errorMessage?: string
	showToast?: boolean
}

export function useApiCall<TData = unknown, TParams = unknown>(
	apiFunction: (params: TParams) => Promise<TData>,
	options: UseApiCallOptions<TData> = {}
) {
	const {
		onSuccess,
		onError,
		successMessage,
		errorMessage,
		showToast = true
	} = options

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const [data, setData] = useState<TData | null>(null)

	const execute = useCallback(
		async (params: TParams): Promise<TData | null> => {
			setIsLoading(true)
			setError(null)

			try {
				const result = await apiFunction(params)
				setData(result)

				if (showToast && successMessage) {
					toast.success(successMessage)
				}

				if (onSuccess) {
					onSuccess(result)
				}

				return result
			} catch (err) {
<<<<<<< HEAD
				const error =
					err instanceof Error ? err : new Error(String(err))
=======
				const error = err instanceof Error ? err : new Error(String(err))
>>>>>>> origin/main
				setError(error)

				logger.error('API call failed:', error)

				if (showToast) {
					toast.error(errorMessage || error.message)
				}

				if (onError) {
					onError(error)
				}

				return null
			} finally {
				setIsLoading(false)
			}
		},
<<<<<<< HEAD
		[
			apiFunction,
			onSuccess,
			onError,
			successMessage,
			errorMessage,
			showToast
		]
=======
		[apiFunction, onSuccess, onError, successMessage, errorMessage, showToast]
>>>>>>> origin/main
	)

	const reset = useCallback(() => {
		setIsLoading(false)
		setError(null)
		setData(null)
	}, [])

	return {
		execute,
		isLoading,
		error,
		data,
		reset
	}
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
