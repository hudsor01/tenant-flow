import { useResource } from './useResource'
import { useRequest } from 'ahooks'
import { apiClient } from '@/lib/api'
import type { UnitWithDetails, UnitQuery } from '@/types/api'

/**
 * 🚀 UNITS REVOLUTION: ~150 lines → 25 lines (83% reduction!)
 */

// 🎯 Main units resource
export const useUnits = (query?: UnitQuery) =>
	useResource<UnitWithDetails>('units', {
		refreshDeps: [query],
		ready: !!apiClient.auth.isAuthenticated(),
		cacheTime: 10 * 60 * 1000 // Units change less frequently
	})

// 🎯 Units by property with dedicated caching
export const useUnitsByProperty = (propertyId: string) =>
	useRequest(() => apiClient.units.getAll({ propertyId }), {
		cacheKey: `units-property-${propertyId}`,
		refreshDeps: [propertyId],
		ready: !!propertyId && !!apiClient.auth.isAuthenticated(),
		staleTime: 10 * 60 * 1000
	})
