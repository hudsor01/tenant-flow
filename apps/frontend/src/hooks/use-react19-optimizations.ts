/**
 * React 19 Performance Optimizations Hook
 * Leverages new React 19 features for maximum performance
 */

import { use, useMemo, useTransition, useDeferredValue, useOptimistic, useId } from 'react'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook for optimistic UI updates with React 19's useOptimistic
 */
export function useOptimisticUpdate<T>(
  initialValue: T,
  updateFn: (currentState: T, optimisticValue: T) => T
) {
  const [optimisticState, addOptimistic] = useOptimistic(
    initialValue,
    updateFn
  )

  return {
    value: optimisticState,
    updateOptimistically: addOptimistic
  }
}

/**
 * Hook for deferred values with loading states
 */
export function useDeferredSearch(searchTerm: string, _delay = 300) {
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const isStale = searchTerm !== deferredSearchTerm

  return {
    deferredValue: deferredSearchTerm,
    isSearching: isStale
  }
}

/**
 * Hook for managing transitions with loading states
 */
export function useTransitionWithCallback() {
  const [isPending, startTransition] = useTransition()
  const callbackRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isPending && callbackRef.current) {
      callbackRef.current()
      callbackRef.current = null
    }
  }, [isPending])

  const startTransitionWithCallback = useCallback(
    (callback: () => void, afterTransition?: () => void) => {
      callbackRef.current = afterTransition || null
      startTransition(callback)
    },
    []
  )

  return {
    isPending,
    startTransition: startTransitionWithCallback
  }
}

/**
 * Hook for resource suspense with React 19's use() hook
 */
export function useResource<T>(promise: Promise<T>): T {
  // React 19's use() hook handles promises and context
  return use(promise)
}

/**
 * Hook for efficient list rendering with React 19 optimizations
 */
export function useOptimizedList<T extends { id: string | number }>(
  items: T[],
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number
) {
  const [isPending, startTransition] = useTransition()
  
  const processedItems = useMemo(() => {
    let result = [...items]
    
    if (filterFn) {
      result = result.filter(filterFn)
    }
    
    if (sortFn) {
      result.sort(sortFn)
    }
    
    return result
  }, [items, filterFn, sortFn])

  const deferredItems = useDeferredValue(processedItems)
  
  return {
    items: deferredItems,
    isProcessing: isPending,
    startTransition
  }
}

/**
 * Hook for form actions with React 19's action support
 */
export function useFormAction<T>(
  action: (formData: FormData) => Promise<T>
) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const executeAction = useCallback(
    async (formData: FormData) => {
      setError(null)
      startTransition(async () => {
        try {
          const result = await action(formData)
          setData(result)
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      })
    },
    [action]
  )

  return {
    executeAction,
    isPending,
    error,
    data,
    reset: () => {
      setError(null)
      setData(null)
    }
  }
}

/**
 * Hook for generating stable IDs for accessibility
 */
export function useStableId(prefix = 'id') {
  const id = useId()
  return `${prefix}-${id}`
}

/**
 * Hook for progressive enhancement with React 19
 */
export function useProgressiveEnhancement() {
  const [isEnhanced, setIsEnhanced] = useState(false)

  useEffect(() => {
    // Check if JavaScript is fully loaded and interactive
    setIsEnhanced(true)
  }, [])

  return {
    isEnhanced,
    enhancedProps: isEnhanced ? {} : { inert: true }
  }
}

/**
 * Hook for virtualized scrolling with React 19 optimizations
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 3
) {
  const [scrollTop, setScrollTop] = useState(0)
  const deferredScrollTop = useDeferredValue(scrollTop)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(deferredScrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((deferredScrollTop + containerHeight) / itemHeight) + overscan
    )

    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex + 1),
      offsetY: startIndex * itemHeight,
      totalHeight: items.length * itemHeight
    }
  }, [items, itemHeight, containerHeight, overscan, deferredScrollTop])

  return {
    ...visibleRange,
    onScroll: (e: React.UIEvent<HTMLElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  }
}

// Import useState that was missing
import { useState } from 'react'