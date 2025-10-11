/**
 * Colocated UI State Hook - Sort Pattern
 * Manages sorting state for data tables and lists
 */

import { useCallback, useState } from 'react'

type SortDirection = 'asc' | 'desc'

interface UseSortReturn<T> {
	sortKey: keyof T | null
	sortDirection: SortDirection
	setSortKey: (key: keyof T) => void
	toggleSort: (key: keyof T) => void
	clearSort: () => void
	isSorted: (key: keyof T) => boolean
	getSortDirection: (key: keyof T) => SortDirection | null
}

/**
 * Hook for managing sort state
 * Common use cases: table sorting, list ordering
 *
 * Example:
 * const sort = useSort<User>()
 * <Button onClick={() => sort.toggleSort('name')}>
 *   Name {sort.getSortDirection('name')}
 * </Button>
 */
export function useSort<T>(): UseSortReturn<T> {
	const [sortKey, setSortKeyState] = useState<keyof T | null>(null)
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

	const setSortKey = useCallback((key: keyof T) => {
		setSortKeyState(key)
		setSortDirection('asc')
	}, [])

	const toggleSort = useCallback((key: keyof T) => {
		setSortKeyState(prevKey => {
			if (prevKey === key) {
				setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
				return key
			} else {
				setSortDirection('asc')
				return key
			}
		})
	}, [])

	const clearSort = useCallback(() => {
		setSortKeyState(null)
		setSortDirection('asc')
	}, [])

	const isSorted = useCallback(
		(key: keyof T) => {
			return sortKey === key
		},
		[sortKey]
	)

	const getSortDirection = useCallback(
		(key: keyof T): SortDirection | null => {
			return sortKey === key ? sortDirection : null
		},
		[sortKey, sortDirection]
	)

	return {
		sortKey,
		sortDirection,
		setSortKey,
		toggleSort,
		clearSort,
		isSorted,
		getSortDirection
	}
}

/**
 * Helper function to sort array based on sort state
 * Use with useSort hook
 */
export function applySorting<T>(
	data: T[],
	sortKey: keyof T | null,
	sortDirection: SortDirection
): T[] {
	if (!sortKey) return data

	return [...data].sort((a, b) => {
		const aValue = a[sortKey]
		const bValue = b[sortKey]

		if (aValue === bValue) return 0

		const comparison = aValue < bValue ? -1 : 1
		return sortDirection === 'asc' ? comparison : -comparison
	})
}
