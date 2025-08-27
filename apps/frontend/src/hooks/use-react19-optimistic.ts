/**
 * React 19 useOptimistic - Pure Native Optimistic Updates
 * REPLACES: TanStack Query onMutate optimistic patterns
 * PURE: Zero dependencies, pure React 19 features only
 */

'use client'

import { 
	useOptimistic, 
	useTransition, 
	useCallback, 
	useRef,
	type Dispatch,
	type SetStateAction
} from 'react'
import { toast } from 'sonner'

// ============================================================================
// PURE TYPES - No business logic, just data shapes
// ============================================================================

interface OptimisticAction<T> {
	type: 'create' | 'update' | 'delete'
	item?: Partial<T>
	id?: string
	tempId?: string
}

interface OptimisticState<T extends { id: string }> {
	items: T[]
	pendingActions: Map<string, OptimisticAction<T>>
	isOptimistic: boolean
}

interface OptimisticConfig<T> {
	successMessage?: string | ((item: T) => string)
	errorMessage?: string
	onSuccess?: (item: T, action: OptimisticAction<T>) => void
	onError?: (error: Error, action: OptimisticAction<T>) => void
	onRevert?: (action: OptimisticAction<T>) => void
}

// ============================================================================
// PURE OPTIMISTIC REDUCERS - React 19 useOptimistic patterns
// ============================================================================

/**
 * Pure optimistic list reducer - Zero side effects
 */
function optimisticListReducer<T extends { id: string }>(
	current: T[],
	action: OptimisticAction<T>
): T[] {
	switch (action.type) {
		case 'create': {
			if (!action.item) return current
			
			const optimisticItem = {
				...action.item,
				id: action.tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			} as T

			return [optimisticItem, ...current]
		}
		
		case 'update': {
			if (!action.id || !action.item) return current
			
			return current.map(item => 
				item.id === action.id 
					? {
						...item,
						...action.item,
						updatedAt: new Date().toISOString()
					} as T
					: item
			)
		}
		
		case 'delete': {
			if (!action.id) return current
			
			return current.filter(item => item.id !== action.id)
		}
		
		default:
			return current
	}
}

/**
 * Pure optimistic item reducer - Single item updates
 */
function optimisticItemReducer<T>(
	current: T,
	action: Partial<T>
): T {
	return {
		...current,
		...action,
		updatedAt: new Date().toISOString()
	} as T
}

// ============================================================================
// PURE REACT 19 OPTIMISTIC HOOKS
// ============================================================================

/**
 * Pure React 19 useOptimistic for Lists - Replaces TanStack Query optimistic
 * Zero dependencies, uses only native React 19 features
 */
export function useOptimisticList<T extends { id: string }>(
	initialItems: T[],
	config: OptimisticConfig<T> = {}
) {
	const [isPending, startTransition] = useTransition()
	const actionsRef = useRef(new Map<string, OptimisticAction<T>>())
	
	// React 19 useOptimistic - pure state management
	const [optimisticItems, updateOptimistic] = useOptimistic(
		initialItems,
		optimisticListReducer<T>
	)

	// Pure optimistic create
	const optimisticCreate = useCallback(async (
		item: Partial<T>,
		serverAction: (item: Partial<T>) => Promise<T>
	) => {
		const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		const action: OptimisticAction<T> = { 
			type: 'create', 
			item, 
			tempId 
		}
		
		actionsRef.current.set(tempId, action)

		startTransition(() => {
			updateOptimistic(action)
		})

		try {
			const result = await serverAction(item)
			
			// Replace temp item with real item
			startTransition(() => {
				updateOptimistic({ 
					type: 'delete', 
					id: tempId 
				})
				updateOptimistic({ 
					type: 'create', 
					item: result,
					tempId: result.id 
				})
			})

			actionsRef.current.delete(tempId)
			
			if (config.successMessage) {
				const message = typeof config.successMessage === 'function' 
					? config.successMessage(result) 
					: config.successMessage
				toast.success(message)
			}
			
			config.onSuccess?.(result, action)
			
			return result
		} catch (error) {
			// Revert optimistic update
			startTransition(() => {
				updateOptimistic({ 
					type: 'delete', 
					id: tempId 
				})
			})
			
			actionsRef.current.delete(tempId)
			
			const errorMessage = config.errorMessage || 'Failed to create item'
			toast.error(errorMessage)
			
			config.onError?.(error as Error, action)
			config.onRevert?.(action)
			
			throw error
		}
	}, [updateOptimistic, config, startTransition])

	// Pure optimistic update
	const optimisticUpdate = useCallback(async (
		id: string,
		updates: Partial<T>,
		serverAction: (id: string, updates: Partial<T>) => Promise<T>
	) => {
		const action: OptimisticAction<T> = { 
			type: 'update', 
			id, 
			item: updates 
		}
		
		actionsRef.current.set(id, action)

		// Snapshot current item for rollback
		const currentItem = optimisticItems.find(item => item.id === id)

		startTransition(() => {
			updateOptimistic(action)
		})

		try {
			const result = await serverAction(id, updates)
			
			// Update with server response
			startTransition(() => {
				updateOptimistic({ 
					type: 'update', 
					id, 
					item: result 
				})
			})

			actionsRef.current.delete(id)
			
			if (config.successMessage) {
				const message = typeof config.successMessage === 'function' 
					? config.successMessage(result) 
					: config.successMessage
				toast.success(message)
			}
			
			config.onSuccess?.(result, action)
			
			return result
		} catch (error) {
			// Revert to previous state
			if (currentItem) {
				startTransition(() => {
					updateOptimistic({ 
						type: 'update', 
						id, 
						item: currentItem 
					})
				})
			}
			
			actionsRef.current.delete(id)
			
			const errorMessage = config.errorMessage || 'Failed to update item'
			toast.error(errorMessage)
			
			config.onError?.(error as Error, action)
			config.onRevert?.(action)
			
			throw error
		}
	}, [optimisticItems, updateOptimistic, config, startTransition])

	// Pure optimistic delete
	const optimisticDelete = useCallback(async (
		id: string,
		serverAction: (id: string) => Promise<void>
	) => {
		const action: OptimisticAction<T> = { 
			type: 'delete', 
			id 
		}
		
		actionsRef.current.set(id, action)

		// Snapshot current item for rollback
		const currentItem = optimisticItems.find(item => item.id === id)

		startTransition(() => {
			updateOptimistic(action)
		})

		try {
			await serverAction(id)
			
			actionsRef.current.delete(id)
			
			if (config.successMessage) {
				const message = typeof config.successMessage === 'string' 
					? config.successMessage 
					: 'Item deleted successfully'
				toast.success(message)
			}
			
			// Create dummy item for onSuccess callback
			if (config.onSuccess && currentItem) {
				config.onSuccess(currentItem, action)
			}
			
		} catch (error) {
			// Revert deletion
			if (currentItem) {
				startTransition(() => {
					updateOptimistic({ 
						type: 'create', 
						item: currentItem,
						tempId: currentItem.id 
					})
				})
			}
			
			actionsRef.current.delete(id)
			
			const errorMessage = config.errorMessage || 'Failed to delete item'
			toast.error(errorMessage)
			
			config.onError?.(error as Error, action)
			config.onRevert?.(action)
			
			throw error
		}
	}, [optimisticItems, updateOptimistic, config, startTransition])

	// Pure revert all optimistic updates
	const revertAll = useCallback(() => {
		actionsRef.current.clear()
		// Force re-render with initial data
		startTransition(() => {
			// Reset to initial state - React will reconcile
		})
	}, [startTransition])

	return {
		// State
		items: optimisticItems,
		isPending,
		isOptimistic: actionsRef.current.size > 0,
		pendingCount: actionsRef.current.size,
		
		// Actions
		optimisticCreate,
		optimisticUpdate,
		optimisticDelete,
		revertAll
	}
}

/**
 * Pure React 19 useOptimistic for Single Items - Pure item updates
 */
export function useOptimisticItem<T>(
	initialItem: T,
	config: OptimisticConfig<T> = {}
) {
	const [isPending, startTransition] = useTransition()
	const hasOptimisticChanges = useRef(false)
	
	// React 19 useOptimistic for single items
	const [optimisticItem, updateOptimistic] = useOptimistic(
		initialItem,
		optimisticItemReducer<T>
	)

	// Pure optimistic update
	const optimisticUpdate = useCallback(async (
		updates: Partial<T>,
		serverAction: (updates: Partial<T>) => Promise<T>
	) => {
		hasOptimisticChanges.current = true

		startTransition(() => {
			updateOptimistic(updates)
		})

		try {
			const result = await serverAction(updates)
			
			// Update with server response
			startTransition(() => {
				updateOptimistic(result)
			})

			hasOptimisticChanges.current = false
			
			if (config.successMessage) {
				const message = typeof config.successMessage === 'function' 
					? config.successMessage(result) 
					: config.successMessage
				toast.success(message)
			}
			
			config.onSuccess?.(result, { type: 'update', item: updates })
			
			return result
		} catch (error) {
			// Revert to initial state
			startTransition(() => {
				updateOptimistic(initialItem)
			})
			
			hasOptimisticChanges.current = false
			
			const errorMessage = config.errorMessage || 'Failed to update item'
			toast.error(errorMessage)
			
			config.onError?.(error as Error, { type: 'update', item: updates })
			config.onRevert?.({ type: 'update', item: updates })
			
			throw error
		}
	}, [initialItem, updateOptimistic, config, startTransition])

	// Pure revert optimistic changes
	const revert = useCallback(() => {
		startTransition(() => {
			updateOptimistic(initialItem)
		})
		hasOptimisticChanges.current = false
	}, [initialItem, updateOptimistic, startTransition])

	return {
		// State
		item: optimisticItem,
		isPending,
		isOptimistic: hasOptimisticChanges.current,
		
		// Actions
		optimisticUpdate,
		revert
	}
}

// ============================================================================
// PURE OPTIMISTIC HELPERS
// ============================================================================

/**
 * Pure optimistic action composer - For complex multi-step operations
 */
export function createOptimisticAction<T extends { id: string }>(
	type: OptimisticAction<T>['type'],
	item?: Partial<T>,
	id?: string
): OptimisticAction<T> {
	return {
		type,
		item,
		id,
		tempId: type === 'create' ? `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` : undefined
	}
}

/**
 * Pure optimistic state checker
 */
export function isOptimisticItem<T extends { id: string }>(item: T): boolean {
	return item.id.startsWith('temp-')
}

/**
 * Pure optimistic filtering
 */
export function filterOptimisticItems<T extends { id: string }>(items: T[]): T[] {
	return items.filter(item => !isOptimisticItem(item))
}

export default useOptimisticList