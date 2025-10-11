/**
 * Colocated UI State Hook - Toggle Pattern
 * Manages boolean state with convenient helpers
 */

import { useCallback, useState } from 'react'

interface UseToggleReturn {
	value: boolean
	toggle: () => void
	setTrue: () => void
	setFalse: () => void
	setValue: (value: boolean) => void
}

/**
 * Hook for managing boolean toggle state
 * Common use cases: checkboxes, switches, feature flags
 *
 * Example:
 * const { value, toggle } = useToggle(false)
 * <Switch checked={value} onCheckedChange={toggle} />
 */
export function useToggle(defaultValue = false): UseToggleReturn {
	const [value, setValue] = useState(defaultValue)

	const toggle = useCallback(() => {
		setValue(prev => !prev)
	}, [])

	const setTrue = useCallback(() => {
		setValue(true)
	}, [])

	const setFalse = useCallback(() => {
		setValue(false)
	}, [])

	return { value, toggle, setTrue, setFalse, setValue }
}
