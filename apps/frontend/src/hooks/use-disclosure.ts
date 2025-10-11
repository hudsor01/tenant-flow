/**
 * Colocated UI State Hook - Disclosure Pattern
 * Manages open/close state for modals, dropdowns, accordions
 */

import { useCallback, useState } from 'react'

interface UseDisclosureReturn {
	isOpen: boolean
	open: () => void
	close: () => void
	toggle: () => void
}

/**
 * Hook for managing disclosure state (open/close)
 * Common use cases: modals, dropdowns, popovers, accordions
 *
 * Example:
 * const dialog = useDisclosure()
 * <Dialog open={dialog.isOpen} onOpenChange={dialog.toggle}>
 */
export function useDisclosure(defaultOpen = false): UseDisclosureReturn {
	const [isOpen, setIsOpen] = useState(defaultOpen)

	const open = useCallback(() => {
		setIsOpen(true)
	}, [])

	const close = useCallback(() => {
		setIsOpen(false)
	}, [])

	const toggle = useCallback(() => {
		setIsOpen(prev => !prev)
	}, [])

	return { isOpen, open, close, toggle }
}
