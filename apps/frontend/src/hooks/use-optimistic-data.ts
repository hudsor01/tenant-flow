/**
 * React Hook for Optimistic Data Updates
 * Provides optimistic updates for better user experience
 */

import { useOptimistic, useCallback } from 'react'

export interface OptimisticAction<T> {
	type: string
	data?: Partial<T>
	id?: string
}

/**
 * Hook for optimistic data updates
 */
export function useOptimisticData<T>(
	initialData: T[],
	reducer: (state: T[], action: OptimisticAction<T>) => T[]
) {
	const [optimisticData, addOptimistic] = useOptimistic(initialData, reducer)

	const optimisticCreate = useCallback(
		(newItem: Partial<T>) => {
			addOptimistic({
				type: 'CREATE',
				data: newItem
			})
		},
		[addOptimistic]
	)

	const optimisticUpdate = useCallback(
		(id: string, updates: Partial<T>) => {
			addOptimistic({
				type: 'UPDATE',
				data: updates,
				id
			})
		},
		[addOptimistic]
	)

	const optimisticDelete = useCallback(
		(id: string) => {
			addOptimistic({
				type: 'DELETE',
				data: {} as Partial<T>,
				id
			})
		},
		[addOptimistic]
	)

	return {
		data: optimisticData,
		optimisticCreate,
		optimisticUpdate,
		optimisticDelete,
		addOptimistic
	}
}

/**
 * Common reducer for optimistic updates
 */
export function createOptimisticReducer<T extends { id: string }>() {
	return (state: T[], action: OptimisticAction<T>): T[] => {
		switch (action.type) {
			case 'CREATE':
				if (!action.data) return state
				return [
					...state,
					{
						...action.data,
						id: action.data.id || `temp-${Date.now()}`
					} as T
				]

			case 'UPDATE':
				return state.map(item =>
					item.id === action.id ? { ...item, ...action.data } : item
				)

			case 'DELETE':
				return state.filter(item => item.id !== action.id)

			default:
				return state
		}
	}
}
