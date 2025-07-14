import { useState, useCallback } from 'react'

/**
 * 🔥 ENHANCED STATE HOOKS - React 19 Native Hooks
 *
 * Specialized state management with built-in React hooks
 */

// 🎯 Boolean state with rich operations
export function useEnhancedBoolean(defaultValue = false) {
	const [value, setValue] = useState(defaultValue)

	const setTrue = useCallback(() => setValue(true), [])
	const setFalse = useCallback(() => setValue(false), [])
	const toggle = useCallback(() => setValue(prev => !prev), [])
	const set = useCallback((newValue: boolean) => setValue(newValue), [])

	return {
		value,
		setTrue,
		setFalse,
		toggle,
		set,
		// Semantic aliases for better DX
		enable: setTrue,
		disable: setFalse,
		switch: toggle
	}
}

// 🎯 Modal/Dialog state management
export function useModal() {
	const modal = useEnhancedBoolean()

	// Memoized functions prevent child re-renders
	const open = useCallback(() => modal.setTrue(), [modal.setTrue])
	const close = useCallback(() => modal.setFalse(), [modal.setFalse])

	return {
		isOpen: modal.value,
		open,
		close,
		toggle: modal.toggle
	}
}

// 🎯 Loading state with automatic timeouts
export function useLoading(timeout = 30000) {
	const { value: loading, setTrue: start, setFalse: stop } = useEnhancedBoolean()

	const startLoading = useCallback(() => {
		start()
		// Auto-stop loading after timeout (prevent stuck states)
		setTimeout(stop, timeout)
	}, [start, stop, timeout])

	return {
		loading,
		start: startLoading,
		stop: useCallback(stop, [stop])
	}
}

// 🎯 Enhanced counter with bounds and steps
export function useEnhancedCounter(
	initialValue = 0,
	options: { min?: number; max?: number; step?: number } = {}
) {
	const { min = -Infinity, max = Infinity, step = 1 } = options
	const [count, setCount] = useState(initialValue)

	const inc = useCallback((amount = step) => {
		setCount(prev => Math.min(prev + amount, max))
	}, [step, max])

	const dec = useCallback((amount = step) => {
		setCount(prev => Math.max(prev - amount, min))
	}, [step, min])

	const set = useCallback((value: number) => {
		setCount(Math.max(min, Math.min(value, max)))
	}, [min, max])

	const reset = useCallback(() => setCount(initialValue), [initialValue])

	return {
		count,
		increment: inc,
		decrement: dec,
		set,
		reset,
		// Utility methods
		isAtMin: count === min,
		isAtMax: count === max,
		canIncrement: count < max,
		canDecrement: count > min
	}
}

// 🎯 Multi-value toggle (theme switcher, etc.)
export function useThemeToggle<T>(values: T[], defaultValue?: T) {
	const [current, setCurrent] = useState(defaultValue ?? values[0])

	const toggle = useCallback(() => {
		setCurrent(prev => {
			const currentIndex = values.indexOf(prev)
			const nextIndex = (currentIndex + 1) % values.length
			return values[nextIndex]
		})
	}, [values])

	const is = useCallback((value: T) => current === value, [current])

	return {
		current,
		toggle,
		next: toggle,
		is,
		values
	}
}

// 🎯 Object state (like class components)
export function useObjectState<T extends Record<string, unknown>>(
	initialState: T
) {
	const [state, setState] = useState(initialState)

	const updateState = useCallback((updates: Partial<T>) => {
		setState(prev => ({ ...prev, ...updates }))
	}, [])

	const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
		setState(prev => ({ ...prev, [key]: value }))
	}, [])

	const reset = useCallback(() => setState(initialState), [initialState])
	const clear = useCallback(() => setState({} as T), [])

	return {
		state: state as T,
		setState: updateState,
		updateField,
		reset,
		clear
	}
}

// 🎯 Form state management
export function useFormState<T extends Record<string, unknown>>(
	initialState: T
) {
	const { state, updateField, reset } = useObjectState(initialState)
	const { loading, start: startSubmitting, stop: stopSubmitting } = useLoading()
	const { value: isDirty, setTrue: markDirty, setFalse: markClean } = useEnhancedBoolean()

	const handleFieldChange = useCallback(
		<K extends keyof T>(key: K, value: T[K]) => {
			updateField(key, value)
			markDirty()
		},
		[updateField, markDirty]
	)

	const handleSubmit = useCallback(
		async (onSubmit: (data: T) => Promise<void>) => {
			startSubmitting()
			try {
				await onSubmit(state)
				markClean()
			} finally {
				stopSubmitting()
			}
		},
		[startSubmitting, stopSubmitting, state, markClean]
	)

	const handleReset = useCallback(() => {
		reset()
		markClean()
	}, [reset, markClean])

	return {
		// Form data
		data: state,

		// Field management
		updateField: handleFieldChange,

		// Form actions
		submit: handleSubmit,
		reset: handleReset,

		// Status
		submitting: loading,
		isDirty,
		isClean: !isDirty
	}
}

// 🎯 Async operation state
export function useAsyncOperation<T = unknown>() {
	const { loading, start, stop } = useLoading()
	const [error, setError] = useState<Error | null>(null)
	const [data, setData] = useState<T | null>(null)

	const execute = useCallback(async (operation: () => Promise<T>) => {
		start()
		setError(null)

		try {
			const result = await operation()
			setData(result)
			return result
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err))
			setError(error)
			throw error
		} finally {
			stop()
		}
	}, [start, stop])

	const reset = useCallback(() => {
		setError(null)
		setData(null)
	}, [])

	return {
		loading,
		error,
		data,
		execute,
		reset,
		// Convenience flags
		hasError: !!error,
		hasData: !!data,
		isSuccess: !loading && !error && data !== null
	}
}
