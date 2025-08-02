/**
 * React 19 Concurrent Features Implementation
 * useTransition, useDeferredValue, and concurrent rendering patterns
 */
import React, { 
  useTransition, 
  useDeferredValue, 
  startTransition as reactStartTransition,
  useMemo,
  useCallback,
  useState,
  useEffect,
  type SetStateAction
} from 'react'
import { useGlobalStore, type AppModal } from '@/stores/global-state'

// =====================================================
// 1. TRANSITION HOOKS FOR NON-URGENT UPDATES
// =====================================================

// Generic transition hook for state updates
export function useStateTransition<T>(initialValue: T) {
  const [state, setState] = useState(initialValue)
  const [isPending] = useTransition()

  const setStateTransition = useCallback((newState: SetStateAction<T>) => {
    reactStartTransition(() => {
      setState(newState)
    })
  }, [])

  return [state, setStateTransition, isPending] as const
}

// Search/filter transition hook
export function useSearchTransition(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [isPending, startTransition] = useTransition()
  const deferredQuery = useDeferredValue(query)

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)
    
    // Use transition for search to keep input responsive
    startTransition(() => {
      // This will be used by components that depend on deferredQuery
    })
  }, [])

  return {
    query: deferredQuery,
    actualQuery: query,
    updateQuery,
    isPending,
    hasChanged: query !== deferredQuery,
  }
}

// Selection transition hook for bulk operations
export function useSelectionTransition<T>(initialSelection: T[] = []) {
  const [selection, setSelection] = useState<T[]>(initialSelection)
  const [isPending, startTransition] = useTransition()

  const toggleSelection = useCallback((item: T) => {
    startTransition(() => {
      setSelection(prev => 
        prev.includes(item) 
          ? prev.filter(i => i !== item)
          : [...prev, item]
      )
    })
  }, [])

  const selectAll = useCallback((items: T[]) => {
    startTransition(() => {
      setSelection(items)
    })
  }, [])

  const clearSelection = useCallback(() => {
    startTransition(() => {
      setSelection([])
    })
  }, [])

  const selectRange = useCallback((items: T[], startIndex: number, endIndex: number) => {
    startTransition(() => {
      const rangeItems = items.slice(
        Math.min(startIndex, endIndex),
        Math.max(startIndex, endIndex) + 1
      )
      setSelection(prev => {
        const newSelection = new Set(prev)
        rangeItems.forEach(item => newSelection.add(item))
        return Array.from(newSelection)
      })
    })
  }, [])

  return {
    selection,
    isPending,
    toggleSelection,
    selectAll,
    clearSelection,
    selectRange,
    isSelected: useCallback((item: T) => selection.includes(item), [selection]),
    hasSelection: selection.length > 0,
    selectionCount: selection.length,
  }
}

// =====================================================
// 2. DEFERRED VALUE HOOKS
// =====================================================

// Deferred filtering hook
export function useDeferredFilter<T>(
  items: T[],
  filterFn: (item: T, query: string) => boolean,
  query: string
) {
  const deferredQuery = useDeferredValue(query)
  const deferredItems = useDeferredValue(items)

  const filteredItems = useMemo(() => {
    if (!deferredQuery.trim()) return deferredItems
    return deferredItems.filter(item => filterFn(item, deferredQuery))
  }, [deferredItems, deferredQuery, filterFn])

  return {
    filteredItems,
    isFiltering: query !== deferredQuery,
    actualQuery: query,
    deferredQuery,
  }
}

// Deferred sorting hook
export function useDeferredSort<T>(
  items: T[],
  sortFn: (a: T, b: T) => number,
  sortKey: string
) {
  const deferredItems = useDeferredValue(items)
  const deferredSortKey = useDeferredValue(sortKey)

  const sortedItems = useMemo(() => {
    return [...deferredItems].sort(sortFn)
  }, [deferredItems, sortFn])

  return {
    sortedItems,
    isSorting: sortKey !== deferredSortKey,
  }
}

// =====================================================
// 3. CONCURRENT NAVIGATION
// =====================================================

// Navigation with transition for smooth routing
export function useTransitionNavigation() {
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback((navigationFn: () => void) => {
    startTransition(() => {
      navigationFn()
    })
  }, [])

  return { navigate, isPending }
}

// Modal transition management
export function useModalTransition() {
  const [isPending, startTransition] = useTransition()
  const { openModal, closeModal } = useGlobalStore((state) => ({
    openModal: state.openModal,
    closeModal: state.closeModal,
  }))

  const openWithTransition = useCallback((modal: AppModal, data?: Record<string, unknown>) => {
    startTransition(() => {
      openModal(modal, data)
    })
  }, [openModal])

  const closeWithTransition = useCallback(() => {
    startTransition(() => {
      closeModal()
    })
  }, [closeModal])

  return {
    openModal: openWithTransition,
    closeModal: closeWithTransition,
    isPending,
  }
}

// =====================================================
// 4. CONCURRENT DATA LOADING
// =====================================================

// Query function type
type QueryFunction = () => Promise<unknown>

// Parallel data loading with concurrent features
export function useParallelQueries<T extends Record<string, QueryFunction>>(
  queries: T,
  _options?: {
    suspense?: boolean
    staleTime?: number
  }
) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<Record<keyof T, unknown>>({} as Record<keyof T, unknown>)
  const [errors, setErrors] = useState<Record<keyof T, Error | null>>({} as Record<keyof T, Error | null>)

  useEffect(() => {
    startTransition(() => {
      const loadQueries = async () => {
        const results = await Promise.allSettled(
          Object.entries(queries).map(async ([key, queryFn]) => {
            try {
              const result = await queryFn()
              return { key, result, error: null }
            } catch (error) {
              return { key, result: null, error: error as Error }
            }
          })
        )

        const newData: Record<string, unknown> = {}
        const newErrors: Record<string, Error | null> = {}

        results.forEach((result, index) => {
          const queryKeys = Object.keys(queries)
          const key = queryKeys[index]
          
          if (key && result.status === 'fulfilled') {
            newData[key] = result.value.result
            newErrors[key] = result.value.error
          } else if (key && result.status === 'rejected') {
            newData[key] = null
            newErrors[key] = result.reason as Error
          }
        })

        setData(newData as Record<keyof T, unknown>)
        setErrors(newErrors as Record<keyof T, Error | null>)
      }

      loadQueries().catch(() => {
        // Query loading failed, errors will be set in state
      })
    })
  }, [queries])

  return {
    data,
    errors,
    isPending,
    isLoading: isPending,
    hasErrors: Object.values(errors).some(error => error !== null),
  }
}

// =====================================================
// 5. PERFORMANCE OPTIMIZATION HOOKS
// =====================================================

// Heavy computation with transition
export function useHeavyComputation<T, R>(
  data: T,
  computeFn: (data: T) => R,
  deps: React.DependencyList = []
) {
  const [result, setResult] = useState<R | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredData = useDeferredValue(data)

  useEffect(() => {
    startTransition(() => {
      const computed = computeFn(deferredData)
      setResult(computed)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredData, computeFn, ...deps])

  return {
    result,
    isPending,
    isComputing: isPending || data !== deferredData,
  }
}

// Debounced state with transition
export function useDebouncedTransition<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedValue(value)
      })
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return {
    debouncedValue,
    isPending,
    isDebouncing: value !== debouncedValue || isPending,
  }
}

// =====================================================
// 6. COMPONENT HELPERS
// =====================================================

// HOC for wrapping components with concurrent features
export function withConcurrentFeatures<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function ConcurrentWrapper(props: P) {
    const [isPending, startTransition] = useTransition()

    const wrappedProps = useMemo(() => ({
      ...props,
      isPending,
      startTransition,
    }), [props, isPending])

    return React.createElement(Component, wrappedProps)
  }
}

// Hook for components to access concurrent utilities
export function useConcurrentUtils() {
  const [isPending, startTransition] = useTransition()

  return {
    isPending,
    startTransition,
    wrapInTransition: useCallback((fn: () => void) => {
      startTransition(fn)
    }, []),
  }
}