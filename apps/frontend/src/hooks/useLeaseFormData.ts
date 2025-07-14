import { useQuery } from '@tanstack/react-query'
import { trpc } from '@/lib/trpcClient'
import { useProperties } from './useProperties'
import { useTenants } from './useTenants'

/**
 * Custom hook for fetching all data needed by the lease form
 * Separates data fetching concerns from UI components
 *
 * @param selectedPropertyId - Property ID to fetch units for
 * @returns All data needed for lease form
 */
export function useLeaseFormData(selectedPropertyId?: string) {
	// Get user's properties and tenants
	const { data: properties = [] } = useProperties()
	const { data: tenants = [] } = useTenants()

	// Get units for selected property
	const { data: propertyUnits = [], isLoading: unitsLoading } = useQuery({
		queryKey: ['property-units', selectedPropertyId],
		queryFn: async () => {
			if (!selectedPropertyId) return []

			return await apiClient.units.getAll({
				propertyId: selectedPropertyId
			})
		},
		enabled: !!selectedPropertyId
	})

	// Computed data
	const selectedProperty = properties.find(p => p.id === selectedPropertyId)
	const hasUnits = propertyUnits.length > 0
	const availableUnits = propertyUnits.filter(
		unit => unit.status === 'VACANT' || unit.status === 'RESERVED'
	)

	return {
		properties,
		tenants,
		propertyUnits,
		selectedProperty,
		hasUnits,
		availableUnits,
		unitsLoading
	}
}
