'use client'

import { logger } from '@repo/shared/lib/frontend-logger'
import { supabaseClient } from '@repo/shared/lib/supabase-client'
import type { Tables } from '@repo/shared/types/supabase'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useInfiniteQuery as useTanStackInfiniteQuery } from '@tanstack/react-query'

const supabase = supabaseClient

// Use actual Supabase generated types
type TableName = keyof Database['public']['Tables']
type TableRow<T extends TableName> = Tables<T>

// Query modifier that accepts and returns a query builder
// Using a generic approach that works with the existing supabase client
type QueryModifier = <Q>(query: Q) => Q

interface UseInfiniteQueryProps<T extends TableName> {
  tableName: T
  columns?: string
  pageSize?: number
  trailingQuery?: QueryModifier
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
        logger.error('Infinite query error', {
          action: 'infinite_query_failed',
          metadata: { error: error.message, table: tableName }
        })
        throw new Error(error.message)
      }

      return {
        data: (data as unknown as TData[]) || [],
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

export
{
  useInfiniteQuery, type InfiniteQueryPage, type QueryModifier, type TableName, type TableRow, type UseInfiniteQueryProps
}
