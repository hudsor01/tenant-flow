'use client'

import { supabaseClient } from '@repo/shared'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Database, Tables } from '@repo/shared'
import { logger } from '@repo/shared'

const supabase = supabaseClient

// Use actual Supabase generated types
type TableName = keyof Database['public']['Tables']
type TableRow<T extends TableName> = Tables<T>

// Simple query modifier function using Supabase's built-in types
type QueryModifier<_T extends TableName> = (
  query: unknown
) => unknown

interface UseInfiniteQueryProps<T extends TableName> {
  tableName: T
  columns?: string
  pageSize?: number
  trailingQuery?: QueryModifier<T>
}

interface StoreState<TData> {
  data: TData[]
  count: number
  isSuccess: boolean
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  hasInitialFetch: boolean
}

type Listener = () => void

function createStore<TData extends TableRow<T>, T extends TableName>(
  props: UseInfiniteQueryProps<T>
) {
  const { tableName, columns = '*', pageSize = 20, trailingQuery } = props

  let state: StoreState<TData> = {
    data: [],
    count: 0,
    isSuccess: false,
    isLoading: false,
    isFetching: false,
    error: null,
    hasInitialFetch: false,
  }

  const listeners = new Set<Listener>()

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const setState = (newState: Partial<StoreState<TData>>) => {
    state = { ...state, ...newState }
    notify()
  }

  const fetchPage = async (skip: number) => {
    if (state.hasInitialFetch && (state.isFetching || state.count <= state.data.length)) return

    setState({ isFetching: true })

    let query = supabase.from(tableName).select(columns, { count: 'exact' })

    if (trailingQuery) {
      query = trailingQuery(query) as typeof query
    }
    const { data: newData, count, error } = await query.range(skip, skip + pageSize - 1)

    if (error) {
      logger.error({ error: error.message, table: tableName }, 'An unexpected error occurred')
      setState({ error })
    } else {
      const deduplicatedData = ((newData || []) as TData[]).filter(
        (item) => !state.data.find((old) => 
          'id' in old && 'id' in item && old.id === item.id
        )
      )

      setState({
        data: [...state.data, ...deduplicatedData],
        count: count || 0,
        isSuccess: true,
        error: null,
      })
    }
    setState({ isFetching: false })
  }

  const fetchNextPage = async () => {
    if (state.isFetching) return
    await fetchPage(state.data.length)
  }

  const initialize = async () => {
    setState({ isLoading: true, isSuccess: false, data: [] })
    await fetchNextPage()
    setState({ isLoading: false, hasInitialFetch: true })
  }

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    fetchNextPage,
    initialize,
  }
}

// Empty initial state to avoid hydration errors.
const initialState = {
  data: [],
  count: 0,
  isSuccess: false,
  isLoading: false,
  isFetching: false,
  error: null,
  hasInitialFetch: false,
}

function useInfiniteQuery<
  TData extends TableRow<T>,
  T extends TableName = TableName,
>(props: UseInfiniteQueryProps<T>) {
  const storeRef = useRef(createStore<TData, T>(props))

  const state = useSyncExternalStore(
    storeRef.current.subscribe,
    () => storeRef.current.getState(),
    () => initialState as StoreState<TData>
  )

  useEffect(() => {
    // Initialize if not already done
    if (!state.hasInitialFetch && typeof window !== 'undefined') {
      storeRef.current.initialize()
    }
  }, [state.hasInitialFetch])

  // Separate effect for props changes to avoid recreating store unnecessarily  
  useEffect(() => {
    if (state.hasInitialFetch) {
      storeRef.current = createStore<TData, T>(props)
      storeRef.current.initialize()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.tableName, props.columns, props.pageSize, props.trailingQuery, state.hasInitialFetch])

  return {
    data: state.data,
    count: state.count,
    isSuccess: state.isSuccess,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    hasMore: state.count > state.data.length,
    fetchNextPage: storeRef.current.fetchNextPage,
  }
}

export {
  useInfiniteQuery,
  type QueryModifier,
  type TableRow,
  type TableName,
  type UseInfiniteQueryProps,
}
