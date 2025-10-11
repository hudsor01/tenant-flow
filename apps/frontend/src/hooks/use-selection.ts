/**
 * Colocated UI State Hook - Selection Pattern
 * Manages multi-select state for tables and lists
 */

import { useCallback, useMemo, useState } from 'react'

interface UseSelectionReturn<T> {
	selectedItems: Set<T>
	isSelected: (item: T) => boolean
	toggleItem: (item: T) => void
	selectItem: (item: T) => void
	deselectItem: (item: T) => void
	selectAll: (items: T[]) => void
	deselectAll: () => void
	toggleAll: (items: T[]) => void
	selectedCount: number
	hasSelection: boolean
}

/**
 * Hook for managing multi-select state
 * Common use cases: table row selection, multi-select lists, bulk actions
 *
 * Example:
 * const selection = useSelection<string>()
 * <Checkbox
 *   checked={selection.isSelected(item.id)}
 *   onCheckedChange={() => selection.toggleItem(item.id)}
 * />
 */
export function useSelection<T>(): UseSelectionReturn<T> {
	const [selectedItems, setSelectedItems] = useState<Set<T>>(new Set())

	const isSelected = useCallback(
		(item: T) => {
			return selectedItems.has(item)
		},
		[selectedItems]
	)

	const toggleItem = useCallback((item: T) => {
		setSelectedItems(prev => {
			const next = new Set(prev)
			if (next.has(item)) {
				next.delete(item)
			} else {
				next.add(item)
			}
			return next
		})
	}, [])

	const selectItem = useCallback((item: T) => {
		setSelectedItems(prev => {
			const next = new Set(prev)
			next.add(item)
			return next
		})
	}, [])

	const deselectItem = useCallback((item: T) => {
		setSelectedItems(prev => {
			const next = new Set(prev)
			next.delete(item)
			return next
		})
	}, [])

	const selectAll = useCallback((items: T[]) => {
		setSelectedItems(new Set(items))
	}, [])

	const deselectAll = useCallback(() => {
		setSelectedItems(new Set())
	}, [])

	const toggleAll = useCallback(
		(items: T[]) => {
			const allSelected = items.every(item => selectedItems.has(item))
			if (allSelected) {
				deselectAll()
			} else {
				selectAll(items)
			}
		},
		[selectedItems, deselectAll, selectAll]
	)

	const selectedCount = useMemo(() => {
		return selectedItems.size
	}, [selectedItems])

	const hasSelection = useMemo(() => {
		return selectedItems.size > 0
	}, [selectedItems])

	return {
		selectedItems,
		isSelected,
		toggleItem,
		selectItem,
		deselectItem,
		selectAll,
		deselectAll,
		toggleAll,
		selectedCount,
		hasSelection
	}
}
