import { queryOptions, type QueryKey } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'

type CachePreset = keyof typeof QUERY_CACHE_TIMES | null | undefined

interface CreateQueryOptionsConfig<TData> extends Omit<
	Parameters<typeof queryOptions<TData>>[0],
	'queryKey' | 'queryFn'
> {
	/**
	 * Fully qualified TanStack Query key
	 */
	queryKey: QueryKey
	/**
	 * Optional cache preset shortcut. When omitted, no preset is merged.
	 */
	cache?: CachePreset
	/**
	 * Optional GET endpoint. If omitted, a custom queryFn must be provided.
	 */
	url?: string
	/**
	 * Optional custom queryFn. If omitted, apiRequest will be used with `url`.
	 */
	queryFn?: () => Promise<TData>
}

/**
 * Small factory to create typed query options with optional cache presets.
 *
 * - Injects `QUERY_CACHE_TIMES` presets when `cache` is provided.
 * - Falls back to apiRequest-based queryFn when only `url` is supplied.
 */
export function createQueryOptions<TData>(config: CreateQueryOptionsConfig<TData>) {
	const { queryKey, cache, queryFn, url, ...rest } = config

	const resolvedQueryFn = queryFn ?? (() => {
		if (!url) {
			throw new Error('createQueryOptions requires either `url` or `queryFn`.')
		}
		return apiRequest<TData>(url)
	})

	const cachePreset = cache ? QUERY_CACHE_TIMES[cache] : undefined

	return queryOptions({
		queryKey,
		queryFn: resolvedQueryFn,
		...(cachePreset ?? {}),
		...rest,
	})
}
