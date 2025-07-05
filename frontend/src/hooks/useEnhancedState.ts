import {
	useBoolean,
	useToggle,
	useCounter,
	useSetState,
	useMemoizedFn
} from 'ahooks'

/**
 * 🔥 ENHANCED STATE HOOKS - React 19 + ahooks Power Combo!
 *
 * Replaces primitive useState with specialized, feature-rich alternatives
 */

// 🎯 Boolean state with rich operations
export function useEnhancedBoolean(defaultValue = false) {
	const [value, { setTrue, setFalse, toggle, set }] = useBoolean(defaultValue)

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
	const open = useMemoizedFn(() => modal.setTrue())
	const close = useMemoizedFn(() => modal.setFalse())

	return {
		isOpen: modal.value,
		open,
		close,
		toggle: modal.toggle
	}
}

// 🎯 Loading state with automatic timeouts
export function useLoading(timeout = 30000) {
	const [loading, { setTrue: start, setFalse: stop }] = useBoolean()

	const startLoading = useMemoizedFn(() => {
		start()
		// Auto-stop loading after timeout (prevent stuck states)
		setTimeout(stop, timeout)
	})

	return {
		loading,
		start: startLoading,
		stop: useMemoizedFn(stop)
	}
}

// 🎯 Enhanced counter with bounds and steps
export function useEnhancedCounter(
	initialValue = 0,
	options: { min?: number; max?: number; step?: number } = {}
) {
	const { min = -Infinity, max = Infinity, step = 1 } = options
	const [count, { inc, dec, set, reset }] = useCounter(initialValue, {
		min,
		max
	})

	return {
		count,
		increment: useMemoizedFn(() => inc(step)),
		decrement: useMemoizedFn(() => dec(step)),
		set: useMemoizedFn(set),
		reset: useMemoizedFn(reset),
		// Utility methods
		isAtMin: count === min,
		isAtMax: count === max,
		canIncrement: count < max,
		canDecrement: count > min
	}
}

// 🎯 Multi-value toggle (theme switcher, etc.)
export function useThemeToggle<T>(values: T[], defaultValue?: T) {
	const [current, { toggle }] = useToggle(values, defaultValue)

	return {
		current,
		toggle: useMemoizedFn(toggle),
		next: useMemoizedFn(() => toggle()),
		is: useMemoizedFn((value: T) => current === value),
		values
	}
}

// 🎯 Object state (like class components)
export function useObjectState<T extends Record<string, unknown>>(
	initialState: T
) {
	const [state, setState] = useSetState(initialState)

	return {
		state: state as T,
		setState: useMemoizedFn(setState),
		updateField: useMemoizedFn(<K extends keyof T>(key: K, value: T[K]) =>
			setState({ [key]: value } as Partial<T>)
		),
		reset: useMemoizedFn(() => setState(initialState)),
		clear: useMemoizedFn(() => setState({} as T))
	}
}

// 🎯 Form state management
export function useFormState<T extends Record<string, unknown>>(
	initialState: T
) {
	const { state, updateField, reset } = useObjectState(initialState)
	const {
		loading,
		start: startSubmitting,
		stop: stopSubmitting
	} = useLoading()
	const {
		value: isDirty,
		setTrue: markDirty,
		setFalse: markClean
	} = useBoolean()

	const handleFieldChange = useMemoizedFn(
		<K extends keyof T>(key: K, value: T[K]) => {
			updateField(key, value)
			markDirty()
		}
	)

	const handleSubmit = useMemoizedFn(
		async (onSubmit: (data: T) => Promise<void>) => {
			startSubmitting()
			try {
				await onSubmit(state)
				markClean()
			} finally {
				stopSubmitting()
			}
		}
	)

	const handleReset = useMemoizedFn(() => {
		reset()
		markClean()
	})

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
	const [error, setError] = useSetState<Error | null>(null)
	const [data, setData] = useSetState<T | null>(null)

	const execute = useMemoizedFn(async (operation: () => Promise<T>) => {
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
	})

	const reset = useMemoizedFn(() => {
		setError(null)
		setData(null)
	})

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
