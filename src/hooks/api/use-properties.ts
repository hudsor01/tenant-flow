/**
 * Properties Query Hooks — queries only, mutations in use-property-mutations.ts.
 * Query keys in query-keys/property-keys.ts.
 */

import { useQuery } from '@tanstack/react-query'

import { useEntityDetail } from '#hooks/use-entity-detail'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse } from '#types/api-contracts'
import type { Property } from '#types/core'
import { propertyQueries, type PropertyFilters } from './query-keys/property-keys'
import { propertyStatsQueries } from './query-keys/property-stats-keys'

/** Stable select function for TanStack Query optimization */
const selectPaginatedData = <T>(response: PaginatedResponse<T>): T[] => response.data

/**
 * Hook to fetch property by ID
 * Uses placeholderData from list cache for instant detail view
 */
export function useProperty(id: string) {
	return useEntityDetail<Property>({
		queryOptions: propertyQueries.detail(id),
		listQueryKey: propertyQueries.lists(),
		id
	})
}

/**
 * Hook to fetch property list with pagination and search
 * Optimizations: notifyOnChangeProps, stable select, structuralSharing
 */
export function usePropertyList(params?: {
	search?: string | null
	limit?: number
	offset?: number
}) {
	const { search = null, limit = 50, offset = 0 } = params || {}

	const filters: PropertyFilters = {
		...(search ? { search } : {}),
		limit,
		offset
	}

	const listQuery = propertyQueries.list(filters)

	return useQuery({
		...listQuery,
		...QUERY_CACHE_TIMES.LIST,
		select: selectPaginatedData,
		structuralSharing: true,
		notifyOnChangeProps: ['data', 'error', 'isPending', 'isFetching']
	})
}

export function usePropertiesWithUnits() {
	return useQuery(propertyQueries.withUnits())
}

export function usePropertyStats() {
	return useQuery(propertyStatsQueries.stats())
}

export function usePropertyPerformanceAnalytics() {
	return useQuery(propertyStatsQueries.performance())
}

export function usePropertyOccupancyAnalytics() {
	return useQuery(propertyStatsQueries.analytics.occupancy())
}

export function usePropertyFinancialAnalytics() {
	return useQuery(propertyStatsQueries.analytics.financial())
}

export function usePropertyMaintenanceAnalytics() {
	return useQuery(propertyStatsQueries.analytics.maintenance())
}

export function usePropertyImages(property_id: string) {
	return useQuery(propertyQueries.images(property_id))
}
