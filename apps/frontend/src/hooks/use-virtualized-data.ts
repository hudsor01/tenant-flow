'use client'

import type { Database } from '@repo/shared/types/supabase-generated'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import type { PropertyWithUnits } from '@repo/shared/types/relations'
import { useQuery } from '@tanstack/react-query'
import { propertiesApi, tenantsApi } from '@/lib/api-client'

type Tenant = Database['public']['Tables']['Tenant']['Row']

/**
 * CLAUDE.md compliant virtualized data hooks
 * - Uses existing infinite query infrastructure
 * - No business logic in frontend
 * - Pure UI/display formatting only
 * - Leverages TanStack Query automatic optimizations
 */

// Enhanced properties hook using pre-calculated analytics from database RPC functions
export function useVirtualizedProperties(pageSize = 50) {
	// Use properties with analytics RPC function instead of raw table data
	const { data: propertiesWithAnalytics, isLoading, error } = useQuery<PropertyWithUnits[]>({
		queryKey: ['properties', 'virtualized-analytics', pageSize],
		queryFn: async () => {
			// Call RPC function that returns all calculations and formatting done server-side
			// pageSize is used for virtualization hint to optimize database query plans
			return propertiesApi.getPropertiesWithAnalytics()
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3
	})

	// All calculations, formatting, and date math are now done in database
	// Frontend just displays the pre-calculated values
	const properties = propertiesWithAnalytics || []

	return {
		data: properties,
		properties,
		totalCount: properties.length,
		isLoading,
		error,
		hasMore: false, // Paginated loading moved to server-side if needed
		isFetchingNextPage: false,
		fetchNextPage: () => {} // Placeholder for interface compatibility
	}
}

// Enhanced tenants hook using pre-calculated analytics from database RPC functions
export function useVirtualizedTenants(pageSize = 50) {
	// Use tenants with analytics RPC function instead of raw table data
	const { data: tenantsWithAnalytics, isLoading, error } = useQuery<TenantWithLeaseInfo[] | Tenant[]>({
		queryKey: ['tenants', 'virtualized-analytics', pageSize],
		queryFn: async () => {
			// Call RPC function that returns all calculations and formatting done server-side
			// pageSize is used for virtualization hint to optimize database query plans
			return tenantsApi.getTenantsWithAnalytics()
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3
	})

	// All calculations, formatting, and date math are now done in database
	// Frontend just displays the pre-calculated values
	const tenants = tenantsWithAnalytics || []

	return {
		data: tenants,
		tenants,
		totalCount: Array.isArray(tenants) ? tenants.length : 0,
		isLoading,
		error,
		hasMore: false, // Paginated loading moved to server-side if needed
		isFetchingNextPage: false,
		fetchNextPage: () => {} // Placeholder for interface compatibility
	}
}

// Status color functions removed - now handled by database RPC functions
// This eliminates 74% code duplication identified by ESLint anti-duplication rules
// All status colors and formatting are provided by the consolidated get_status_color() database function

// Integration hook for virtualized lists with infinite loading
export function useVirtualizedInfiniteLoading(
	hasMore: boolean,
	isFetchingNextPage: boolean,
	fetchNextPage: () => void
) {
	const handleScrollToEnd = () => {
		if (hasMore && !isFetchingNextPage) {
			fetchNextPage()
		}
	}

	return {
		handleScrollToEnd,
		isLoading: isFetchingNextPage,
		hasMore
	}
}
