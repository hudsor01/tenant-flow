/**
 * Unified Atom Factory for Consistent State Management
 * Eliminates DRY violations by providing reusable patterns
 */

import { atom } from 'jotai'
import { atomWithQuery, atomWithMutation } from 'jotai-tanstack-query'
import { atomWithReset, RESET } from 'jotai/utils'

// Base types for entities
export interface BaseEntity {
	id: string
	createdAt?: string | Date
	updatedAt?: string | Date
}

// Filter interface
export interface BaseFilters {
	searchQuery?: string
	[key: string]: string | number | boolean | null | undefined
}

// CRUD operations interface
export interface CrudOperations<T> {
	getAll: () => Promise<T[]>
	getById: (id: string) => Promise<T>
	create: (data: Omit<T, 'id'>) => Promise<T>
	update: (id: string, data: Partial<T>) => Promise<T>
	delete: (id: string) => Promise<void>
}

// Query options
export interface QueryOptions {
	staleTime?: number
	gcTime?: number
	refetchInterval?: number
}

// Factory options
export interface EntityAtomsOptions<
	T extends BaseEntity,
	F extends BaseFilters
> {
	name: string
	api: CrudOperations<T>
	defaultFilters?: F
	queryOptions?: QueryOptions
	filterFn?: (item: T, filters: F) => boolean
}

/**
 * Creates a complete set of atoms for entity management
 * Includes: query, mutations, filters, selection, and derived state
 */
export function createEntityAtoms<
	T extends BaseEntity,
	F extends BaseFilters = BaseFilters
>(options: EntityAtomsOptions<T, F>) {
	const {
		name,
		api,
		defaultFilters = {} as F,
		queryOptions = {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000 // 10 minutes
		},
		filterFn
	} = options

	// Query keys factory
	const queryKeys = {
		all: [name] as const,
		lists: () => [...queryKeys.all, 'list'] as const,
		list: (filters: F) => [...queryKeys.lists(), { filters }] as const,
		details: () => [...queryKeys.all, 'detail'] as const,
		detail: (id: string) => [...queryKeys.details(), id] as const
	}

	// Core query atom
	const queryAtom = atomWithQuery(() => ({
		queryKey: queryKeys.all,
		queryFn: api.getAll,
		...queryOptions
	}))

	// Data atom (derived from query)
	const dataAtom = atom(get => get(queryAtom).data || [])

	// Loading state
	const loadingAtom = atom(get => get(queryAtom).isLoading)

	// Error state
	const errorAtom = atom(get => get(queryAtom).error)

	// Selection atom
	const selectedAtom = atom<T | null>(null)

	// Filters atom
	const filtersAtom = atomWithReset<F>(defaultFilters)

	// Filtered data atom
	const filteredDataAtom = atom(get => {
		const data = get(dataAtom)
		const filters = get(filtersAtom)

		if (!filterFn) return data

		return data.filter(item => filterFn(item, filters))
	})

	// Count atom
	const countAtom = atom(get => get(dataAtom).length)

	// Filtered count atom
	const filteredCountAtom = atom(get => get(filteredDataAtom).length)

	// By ID lookup atom
	const byIdAtom = atom(get => {
		const data = get(dataAtom)
		return data.reduce(
			(acc, item) => {
				acc[item.id] = item
				return acc
			},
			{} as Record<string, T>
		)
	})

	// Detail query factory
	const detailQueryAtom = (id: string) =>
		atomWithQuery(() => ({
			queryKey: queryKeys.detail(id),
			queryFn: () => api.getById(id),
			enabled: !!id,
			...queryOptions
		}))

	// Mutations
	const createMutation = atomWithMutation(() => ({
		mutationFn: api.create,
		onSuccess: () => {
			// Invalidate queries on success
			return {
				invalidateQueries: queryKeys.all
			}
		}
	}))

	const updateMutation = atomWithMutation(() => ({
		mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
			api.update(id, data),
		onSuccess: () => {
			return {
				invalidateQueries: queryKeys.all
			}
		}
	}))

	const deleteMutation = atomWithMutation(() => ({
		mutationFn: (id: string) => api.delete(id),
		onSuccess: () => {
			return {
				invalidateQueries: queryKeys.all
			}
		}
	}))

	// Action atoms
	const selectAtom = atom(null, (_get, set, item: T | null) => {
		set(selectedAtom, item)
	})

	const setFiltersAtom = atom(null, (get, set, filters: Partial<F>) => {
		const currentFilters = get(filtersAtom)
		set(filtersAtom, { ...currentFilters, ...filters } as F)
	})

	const clearFiltersAtom = atom(null, (_get, set) => {
		set(filtersAtom, RESET)
	})

	const clearSelectionAtom = atom(null, (_get, set) => {
		set(selectedAtom, null)
	})

	// Refetch action
	const refetchAtom = atom(null, async get => {
		const query = get(queryAtom)
		await query.refetch?.()
	})

	return {
		// Query atoms
		queryAtom,
		dataAtom,
		loadingAtom,
		errorAtom,

		// Selection
		selectedAtom,
		selectAtom,
		clearSelectionAtom,

		// Filters
		filtersAtom,
		filteredDataAtom,
		setFiltersAtom,
		clearFiltersAtom,

		// Counts
		countAtom,
		filteredCountAtom,

		// Lookups
		byIdAtom,
		detailQueryAtom,

		// Mutations
		createMutation,
		updateMutation,
		deleteMutation,

		// Actions
		refetchAtom,

		// Query keys for manual invalidation
		queryKeys
	}
}

/**
 * Creates a simple value atom with setter
 */
export function createValueAtom<T>(initialValue: T) {
	const valueAtom = atom(initialValue)
	const setValueAtom = atom(null, (_get, set, value: T) => {
		set(valueAtom, value)
	})

	return [valueAtom, setValueAtom] as const
}

/**
 * Creates a toggle atom
 */
export function createToggleAtom(initialValue = false) {
	const valueAtom = atom(initialValue)
	const toggleAtom = atom(null, (get, set) => {
		set(valueAtom, !get(valueAtom))
	})
	const setAtom = atom(null, (_get, set, value: boolean) => {
		set(valueAtom, value)
	})

	return {
		valueAtom,
		toggleAtom,
		setAtom
	}
}

/**
 * Creates a collection atom with CRUD operations
 */
export function createCollectionAtom<T extends BaseEntity>(
	initialValue: T[] = []
) {
	const itemsAtom = atom(initialValue)

	const addItemAtom = atom(null, (get, set, item: T) => {
		set(itemsAtom, [item, ...get(itemsAtom)])
	})

	const updateItemAtom = atom(
		null,
		(get, set, updatedItem: Partial<T> & { id: string }) => {
			set(
				itemsAtom,
				get(itemsAtom).map(item =>
					item.id === updatedItem.id
						? { ...item, ...updatedItem }
						: item
				)
			)
		}
	)

	const removeItemAtom = atom(null, (get, set, id: string) => {
		set(
			itemsAtom,
			get(itemsAtom).filter(item => item.id !== id)
		)
	})

	const clearAtom = atom(null, (_get, set) => {
		set(itemsAtom, [])
	})

	return {
		itemsAtom,
		addItemAtom,
		updateItemAtom,
		removeItemAtom,
		clearAtom
	}
}

/**
 * Creates async state atoms for manual async operations
 */
export function createAsyncAtom<T, E = Error>(asyncFn: () => Promise<T>) {
	const dataAtom = atom<T | null>(null)
	const loadingAtom = atom(false)
	const errorAtom = atom<E | null>(null)

	const executeAtom = atom(null, async (_get, set) => {
		set(loadingAtom, true)
		set(errorAtom, null)

		try {
			const result = await asyncFn()
			set(dataAtom, result)
			return result
		} catch (error) {
			set(errorAtom, error as E)
			throw error
		} finally {
			set(loadingAtom, false)
		}
	})

	return {
		dataAtom,
		loadingAtom,
		errorAtom,
		executeAtom
	}
}
