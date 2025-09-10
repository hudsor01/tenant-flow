'use client'

import { supabaseClient } from '@repo/shared'
import { useInfiniteQuery as useTanStackInfiniteQuery } from '@tanstack/react-query'
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

interface InfiniteQueryPage<TData> {
  data: TData[]
  count: number
  nextCursor?: number
}

/**
 * Native TanStack Query infinite query for Supabase tables
 * Replaces custom implementation with native TanStack features:
 * - Automatic caching and stale-while-revalidate
 * - Built-in error boundaries and retry logic  
 * - Native loading and fetching states
 * - Optimistic updates and cache management
 * - Background refetch and focus management
 */
function useInfiniteQuery<
  TData extends TableRow<T>,
  T extends TableName = TableName,
>(props: UseInfiniteQueryProps<T>) {
  const { tableName, columns = '*', pageSize = 20, trailingQuery } = props

  const query = useTanStackInfiniteQuery({
    queryKey: ['infinite', tableName, columns, pageSize, trailingQuery?.toString()],
    queryFn: async ({ pageParam = 0 }): Promise<InfiniteQueryPage<TData>> => {
      const skip = pageParam as number
      
      let query = supabase.from(tableName).select(columns, { count: 'exact' })

      if (trailingQuery) {
        query = trailingQuery(query) as typeof query
      }
      
      const { data, count, error } = await query.range(skip, skip + pageSize - 1)

      if (error) {
        logger.error({ error: error.message, table: tableName }, 'Infinite query error')
        throw new Error(error.message)
      }

      return {
        data: (data || []) as TData[],
        count: count || 0,
        nextCursor: (data?.length === pageSize && (skip + pageSize) < (count || 0)) ? skip + pageSize : undefined
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    refetchOnWindowFocus: false // Don't refetch on every window focus for infinite data
  })

  // Flatten pages data for easier consumption
  const flatData = query.data?.pages?.flatMap(page => page.data) || []
  const totalCount = query.data?.pages?.[0]?.count || 0

  return {
    data: flatData,
    count: totalCount,
    isSuccess: query.isSuccess,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    hasMore: query.hasNextPage || false,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    // Additional TanStack Query native features
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    failureCount: query.failureCount,
    failureReason: query.failureReason
  }
}

export {
  useInfiniteQuery,
  type QueryModifier,
  type TableRow,
  type TableName,
  type UseInfiniteQueryProps,
  type InfiniteQueryPage
}
