/**
 * Atom Factory
 * Provides consistent patterns for creating atoms to reduce code duplication
 */

import { atom, type WritableAtom } from 'jotai'

/**
 * Creates a nullable atom with initial null value
 */
export function createNullableAtom<T>(initialValue: T | null = null) {
	return atom<T | null>(initialValue)
}

/**
 * Creates a loading state atom
 */
export function createLoadingAtom(initialValue = false) {
	return atom<boolean>(initialValue)
}

/**
 * Creates an error state atom
 */
export function createErrorAtom<T = Error>() {
	return atom<T | null>(null)
}

/**
 * Creates a derived boolean atom based on a condition
 */
export function createDerivedBooleanAtom<T>(
	sourceAtom: WritableAtom<T, [T], void>,
	predicate: (value: T) => boolean
) {
	return atom(get => predicate(get(sourceAtom)))
}

/**
 * Creates a set of CRUD atoms for a resource
 */
export function createResourceAtoms<T extends { id: string }>(
	resourceName: string
) {
	// Core data
	const itemsAtom = atom<T[]>([])
	const selectedItemAtom = createNullableAtom<T>()
	const loadingAtom = createLoadingAtom()
	const errorAtom = createErrorAtom()

	// Derived states
	const hasItemsAtom = atom(get => get(itemsAtom).length > 0)
	const selectedItemIdAtom = atom(get => get(selectedItemAtom)?.id || null)
	const itemByIdAtom = (id: string) =>
		atom(get => get(itemsAtom).find(item => item.id === id) || null)

	// Actions
	const setItemsAtom = atom(null, (_get, set, items: T[]) => {
		set(itemsAtom, items)
		set(errorAtom, null)
		set(loadingAtom, false)
	})

	const addItemAtom = atom(null, (get, set, item: T) => {
		const currentItems = get(itemsAtom)
		set(itemsAtom, [...currentItems, item])
	})

	const updateItemAtom = atom(null, (get, set, item: T) => {
		const currentItems = get(itemsAtom)
		const updatedItems = currentItems.map(i =>
			i.id === item.id ? item : i
		)
		set(itemsAtom, updatedItems)

		// Update selected if it's the same item
		const selected = get(selectedItemAtom)
		if (selected?.id === item.id) {
			set(selectedItemAtom, item)
		}
	})

	const deleteItemAtom = atom(null, (get, set, id: string) => {
		const currentItems = get(itemsAtom)
		set(
			itemsAtom,
			currentItems.filter(item => item.id !== id)
		)

		// Clear selection if deleted
		const selected = get(selectedItemAtom)
		if (selected?.id === id) {
			set(selectedItemAtom, null)
		}
	})

	const selectItemAtom = atom(null, (get, set, id: string | null) => {
		if (!id) {
			set(selectedItemAtom, null)
			return
		}

		const item = get(itemsAtom).find(i => i.id === id)
		set(selectedItemAtom, item || null)
	})

	const clearItemsAtom = atom(null, (_get, set) => {
		set(itemsAtom, [])
		set(selectedItemAtom, null)
		set(errorAtom, null)
		set(loadingAtom, false)
	})

	return {
		// State atoms
		[`${resourceName}sAtom`]: itemsAtom,
		[`selected${capitalize(resourceName)}Atom`]: selectedItemAtom,
		[`${resourceName}sLoadingAtom`]: loadingAtom,
		[`${resourceName}sErrorAtom`]: errorAtom,

		// Derived atoms
		[`has${capitalize(resourceName)}sAtom`]: hasItemsAtom,
		[`selected${capitalize(resourceName)}IdAtom`]: selectedItemIdAtom,
		[`${resourceName}ByIdAtom`]: itemByIdAtom,

		// Action atoms
		[`set${capitalize(resourceName)}sAtom`]: setItemsAtom,
		[`add${capitalize(resourceName)}Atom`]: addItemAtom,
		[`update${capitalize(resourceName)}Atom`]: updateItemAtom,
		[`delete${capitalize(resourceName)}Atom`]: deleteItemAtom,
		[`select${capitalize(resourceName)}Atom`]: selectItemAtom,
		[`clear${capitalize(resourceName)}sAtom`]: clearItemsAtom
	}
}

/**
 * Creates a filter atom set for a resource
 */
export function createFilterAtoms<T extends Record<string, unknown>>() {
	const filtersAtom = atom<Partial<T>>({})

	const setFiltersAtom = atom(null, (_get, set, filters: Partial<T>) => {
		set(filtersAtom, filters)
	})

	const updateFiltersAtom = atom(null, (get, set, updates: Partial<T>) => {
		const current = get(filtersAtom)
		set(filtersAtom, { ...current, ...updates })
	})

	const clearFiltersAtom = atom(null, (_get, set) => {
		set(filtersAtom, {})
	})

	const hasActiveFiltersAtom = atom(get => {
		const filters = get(filtersAtom)
		return Object.values(filters).some(
			value => value !== undefined && value !== ''
		)
	})

	return {
		filtersAtom,
		setFiltersAtom,
		updateFiltersAtom,
		clearFiltersAtom,
		hasActiveFiltersAtom
	}
}

/**
 * Creates a paginated resource atom set
 */
export function createPaginatedAtoms() {
	const pageAtom = atom(1)
	const pageSizeAtom = atom(10)
	const totalCountAtom = atom(0)
	const hasMoreAtom = atom(get => {
		const page = get(pageAtom)
		const pageSize = get(pageSizeAtom)
		const total = get(totalCountAtom)
		return page * pageSize < total
	})

	const totalPagesAtom = atom(get => {
		const pageSize = get(pageSizeAtom)
		const total = get(totalCountAtom)
		return Math.ceil(total / pageSize)
	})

	const nextPageAtom = atom(null, (get, set) => {
		const hasMore = get(hasMoreAtom)
		if (hasMore) {
			set(pageAtom, get(pageAtom) + 1)
		}
	})

	const previousPageAtom = atom(null, (get, set) => {
		const page = get(pageAtom)
		if (page > 1) {
			set(pageAtom, page - 1)
		}
	})

	const goToPageAtom = atom(null, (get, set, page: number) => {
		const totalPages = get(totalPagesAtom)
		if (page >= 1 && page <= totalPages) {
			set(pageAtom, page)
		}
	})

	const resetPaginationAtom = atom(null, (_get, set) => {
		set(pageAtom, 1)
		set(totalCountAtom, 0)
	})

	return {
		pageAtom,
		pageSizeAtom,
		totalCountAtom,
		hasMoreAtom,
		totalPagesAtom,
		nextPageAtom,
		previousPageAtom,
		goToPageAtom,
		resetPaginationAtom
	}
}

/**
 * Helper to capitalize first letter
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1)
}
