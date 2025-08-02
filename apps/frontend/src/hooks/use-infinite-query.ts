import { useEffect, useRef, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/clients'
import type { Database } from '@/types/supabase-generated'


// The following types are used to make the hook type-safe. It extracts the database type from the supabase client.
// Removed unused types: SupabaseClient, SupabaseClientType, IfAny

// Using the imported Database type directly instead of extracting from client

// Change this to the database schema you want to use
type DatabaseSchema = Database['public']

// Extracts the table names from the database type
type SupabaseTableName = keyof DatabaseSchema['Tables']

// Extracts the table definition from the database type
type SupabaseTableData<T extends SupabaseTableName> = DatabaseSchema['Tables'][T]['Row']

// Generic type for query values based on table column types
type QueryValue<T extends SupabaseTableName> = 
  | string 
  | number 
  | boolean 
  | null 
  | Date 
  | DatabaseSchema['Tables'][T]['Row'][keyof DatabaseSchema['Tables'][T]['Row']]

// Enhanced type for the select builder with all query methods
type SupabaseSelectBuilder<T extends SupabaseTableName> = {
  range: (from: number, to: number) => SupabaseSelectBuilder<T>
  eq: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  neq: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  gt: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  gte: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  lt: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  lte: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  like: (column: string, pattern: string) => SupabaseSelectBuilder<T>
  ilike: (column: string, pattern: string) => SupabaseSelectBuilder<T>
  is: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  in: (column: string, values: QueryValue<T>[]) => SupabaseSelectBuilder<T>
  contains: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  containedBy: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  rangeGt: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  rangeGte: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  rangeLt: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  rangeLte: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  rangeAdjacent: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  overlaps: (column: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  textSearch: (column: string, query: string, options?: Record<string, unknown>) => SupabaseSelectBuilder<T>
  match: (query: Record<string, QueryValue<T>>) => SupabaseSelectBuilder<T>
  not: (column: string, operator: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  or: (filters: string, options?: Record<string, unknown>) => SupabaseSelectBuilder<T>
  filter: (column: string, operator: string, value: QueryValue<T>) => SupabaseSelectBuilder<T>
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => SupabaseSelectBuilder<T>
  limit: (count: number, options?: { foreignTable?: string }) => SupabaseSelectBuilder<T>
  select: (columns?: string) => SupabaseSelectBuilder<T>
} & Promise<{
  data: DatabaseSchema['Tables'][T]['Row'][] | null
  count: number | null
  error: Error | null
}>

// A function that modifies the query. Can be used to sort, filter, etc. If .range is used, it will be overwritten.
type SupabaseQueryHandler<T extends SupabaseTableName> = (
  query: SupabaseSelectBuilder<T>
) => SupabaseSelectBuilder<T>

interface UseInfiniteQueryProps<T extends SupabaseTableName> {
  // The table name to query
  tableName: T
  // The columns to select, defaults to `*`
  columns?: string
  // The number of items to fetch per page, defaults to `20`
  pageSize?: number
  // A function that modifies the query. Can be used to sort, filter, etc. If .range is used, it will be overwritten.
  trailingQuery?: SupabaseQueryHandler<T>
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

function createStore<TData, T extends SupabaseTableName>(
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

    if (!supabase) {
      setState({ error: new Error('Supabase client not initialized'), isFetching: false })
      return
    }

    const baseQuery = supabase
      .from(tableName)
      .select(columns, { count: 'exact' })
    
    // Type assertion needed due to Supabase's complex type inference
    let query = baseQuery as unknown as SupabaseSelectBuilder<T>

    if (trailingQuery) {
      query = trailingQuery(query)
    }
    const { data: newData, count, error } = await query.range(skip, skip + pageSize - 1)

    if (error) {
      console.error('An unexpected error occurred:', error)
      setState({ error })
    } else {
      const deduplicatedData = ((newData || []) as TData[]).filter(
        (item) => !state.data.find((old) => (old as { id?: string }).id === (item as { id?: string }).id)
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
const initialState: StoreState<Record<string, string | number | boolean | null>> = {
  data: [],
  count: 0,
  isSuccess: false,
  isLoading: false,
  isFetching: false,
  error: null,
  hasInitialFetch: false,
}

function useInfiniteQuery<
  TData,
  T extends SupabaseTableName = SupabaseTableName,
>(props: UseInfiniteQueryProps<T>) {
  const { tableName, columns, pageSize, trailingQuery } = props
  const storeRef = useRef(createStore<TData, T>(props))

  const state = useSyncExternalStore(
    storeRef.current.subscribe,
    () => storeRef.current.getState(),
    () => initialState as StoreState<TData>
  )

  useEffect(() => {
    if (!state.hasInitialFetch && typeof window !== 'undefined') {
      void storeRef.current.initialize()
    }
  }, [state.hasInitialFetch])

  // Separate effect for props changes to avoid infinite rerenders
  useEffect(() => {
    if (storeRef.current.getState().hasInitialFetch) {
      storeRef.current = createStore<TData, T>(props)
      void storeRef.current.initialize()
    }
  }, [props, tableName, columns, pageSize, trailingQuery])

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
  type SupabaseQueryHandler,
  type SupabaseTableData,
  type SupabaseTableName,
  type UseInfiniteQueryProps,
}
