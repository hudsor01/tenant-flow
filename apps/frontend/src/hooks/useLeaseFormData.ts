import { trpc } from '@/lib/api'
import { useProperties } from './trpc/useProperties'
import { useTenants } from './trpc/useTenants'

/**
 * Custom hook for fetching all data needed by the lease form
 * Separates data fetching concerns from UI components
 *
 * @param selectedPropertyId - Property ID to fetch units for
 * @returns All data needed for lease form
 */
export function useLeaseFormData(selectedPropertyId?: string) {
	// Get user's properties and tenants
	const { data: propertiesResponse } = useProperties()
	const { data: tenantsResponse } = useTenants()
	
	const properties = propertiesResponse?.properties || []
	const tenants = tenantsResponse?.tenants || []

	// Get units for selected property using TRPC
	const { data: propertyUnits = [], isLoading: unitsLoading } = trpc.units.list.useQuery(
		{ propertyId: selectedPropertyId! },
		{ enabled: !!selectedPropertyId }
	)

	// Computed data
	const selectedProperty = properties.find(p => p.id === selectedPropertyId)
	const hasUnits = propertyUnits.length > 0
	const availableUnits = propertyUnits.filter(
		(unit: { status: string }) => unit.status === 'VACANT' || unit.status === 'RESERVED'
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
