/**
 * Colocated UI State Hook - Filter Pattern
 * Manages filter state for data tables and lists
 */

import { useCallback, useMemo, useState } from 'react'

interface UseFilterReturn<T extends Record<string, unknown>> {
	filters: Partial<T>
	setFilter: <K extends keyof T>(key: K, value: T[K] | undefined) => void
	clearFilter: <K extends keyof T>(key: K) => void
	clearAllFilters: () => void
	hasFilters: boolean
	activeFilterCount: number
}

/**
 * Hook for managing filter state
 * Common use cases: table filtering, search, advanced filters
 *
 * Example:
 * const { filters, setFilter, clearAllFilters } = useFilter<{ status: string; search: string }>()
 * <Input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
 */
export function useFilter<
	T extends Record<string, unknown>
>(): UseFilterReturn<T> {
	const [filters, setFilters] = useState<Partial<T>>({})

	const setFilter = useCallback(
		<K extends keyof T>(key: K, value: T[K] | undefined) => {
			setFilters(prev => {
				if (value === undefined) {
					const next = { ...prev }
					delete next[key]
					return next
				}
				return { ...prev, [key]: value }
			})
		},
		[]
	)

	const clearFilter = useCallback(<K extends keyof T>(key: K) => {
		setFilters(prev => {
			const next = { ...prev }
			delete next[key]
			return next
		})
	}, [])

	const clearAllFilters = useCallback(() => {
		setFilters({})
	}, [])

	const hasFilters = useMemo(() => {
		return Object.keys(filters).length > 0
	}, [filters])

	const activeFilterCount = useMemo(() => {
		return Object.keys(filters).length
	}, [filters])

	return {
		filters,
		setFilter,
		clearFilter,
		clearAllFilters,
		hasFilters,
		activeFilterCount
	}
}
