import { useProperties } from './useProperties'
import { useTenants } from './useTenants'
import { useUnitsByProperty } from './useUnits'
import type { Tenant } from '@repo/shared'
import type { Property, Unit } from '@repo/shared'

/**
 * Custom hook for fetching all data needed by the lease form
 * Separates data fetching concerns from UI components
 *
 * @param selectedPropertyId - Property ID to fetch units for
 * @returns All data needed for lease form
 */
export function useLeaseFormData(selectedPropertyId?: string): {
	properties: Property[];
	tenants: Tenant[];
	units: Unit[];
	propertyUnits: Unit[];
	selectedProperty: Property | undefined;
	hasUnits: boolean;
	availableUnits: Unit[];
	isLoading: boolean;
	unitsLoading: boolean;
	error: unknown;
} {
	// Get user's properties and tenants with error handling
	const { data: propertiesResponse, error: propertiesError, isLoading: propertiesLoading } = useProperties()
	const { data: tenantsResponse, error: tenantsError, isLoading: tenantsLoading } = useTenants()
	
	const properties = (propertiesResponse as { properties?: Property[] })?.properties || []
	// Transform tenant data to match expected type
	const tenants: Tenant[] = ((tenantsResponse as { tenants?: Tenant[] })?.tenants || []).map((tenant: Tenant) => ({
		...tenant,
		phone: tenant.phone || null,
		createdAt: typeof tenant.createdAt === 'string' ? new Date(tenant.createdAt) : tenant.createdAt,
		updatedAt: typeof tenant.updatedAt === 'string' ? new Date(tenant.updatedAt) : tenant.updatedAt
	}))

	// Get units for selected property
	const { data: unitsData = [], isLoading: unitsLoading, error: unitsError } = useUnitsByProperty(selectedPropertyId || '')
	
	// Ensure propertyUnits is properly typed as Unit array
	const propertyUnits: Unit[] = Array.isArray(unitsData) 
		? unitsData as Unit[]
		: (unitsData as { units?: Unit[] })?.units || []

	// Computed data
	const selectedProperty = properties.find(p => p.id === selectedPropertyId)
	const hasUnits = propertyUnits.length > 0
	const availableUnits = propertyUnits.filter(
		(unit: Unit) => unit.status === 'VACANT' || unit.status === 'RESERVED'
	)

	// Combine errors from all hooks
	const combinedError = propertiesError || tenantsError || unitsError
	const isLoading = propertiesLoading || tenantsLoading || unitsLoading

	return {
		properties,
		tenants,
		units: propertyUnits, // Alias for backward compatibility
		propertyUnits,
		selectedProperty,
		hasUnits,
		availableUnits,
		isLoading,
		unitsLoading,
		error: combinedError
	}
}
