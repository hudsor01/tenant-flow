/**
 * React Hook for Server Actions
 * Provides form state management for server actions with useActionState
 */

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

export interface ServerActionState {
	success: boolean
	error?: string
	message?: string
}

export interface UseServerActionOptions<T extends ServerActionState> {
	onSuccess?: (state: T) => void
	onError?: (error: string) => void
	showToast?: boolean
}

/**
 * Hook for managing server actions with form state
 * Compatible with React 19's useActionState signature
 */
export function useServerAction<T extends ServerActionState>(
	action: (prevState: T, formData: FormData) => Promise<T>,
	initialState: T,
	options: UseServerActionOptions<T> = {}
) {
	const { onSuccess, onError, showToast = true } = options

	// React 19's useActionState expects (state: Awaited<T>, payload: FormData) => T | Promise<T>
	// We need to cast both the action and initial state to match this signature
	const [state, formAction, isPending] = useActionState(
		action as (state: Awaited<T>, payload: FormData) => Promise<T>,
		initialState as Awaited<T>
	)

	useEffect(() => {
		if (state.success && showToast && state.message) {
			toast.success(state.message)
			onSuccess?.(state)
		}

		if (!state.success && state.error) {
			if (showToast) {
				toast.error(state.error)
			}
			onError?.(state.error)
		}
	}, [state, onSuccess, onError, showToast])

	return {
		state,
		formAction,
		isPending,
		reset: () => {
			// Reset to initial state - this would need implementation
			// depending on how the action handles resets
		}
	}
}
