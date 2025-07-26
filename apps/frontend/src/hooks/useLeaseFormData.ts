import { trpc } from '@/lib/clients'
import { useProperties } from './trpc/useProperties'
import { useTenants } from './trpc/useTenants'
import type { Tenant, Property, Unit } from '@tenantflow/shared'

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
	// Get user's properties and tenants
	const { data: propertiesResponse } = useProperties()
	const { data: tenantsResponse } = useTenants()
	
	const properties = (propertiesResponse as { properties?: Property[] })?.properties || []
	// Transform tenant data to match expected type
	const tenants: Tenant[] = ((tenantsResponse as { tenants?: Tenant[] })?.tenants || []).map((tenant: Tenant) => ({
		...tenant,
		phone: tenant.phone || null,
		createdAt: typeof tenant.createdAt === 'string' ? new Date(tenant.createdAt) : tenant.createdAt,
		updatedAt: typeof tenant.updatedAt === 'string' ? new Date(tenant.updatedAt) : tenant.updatedAt
	}))

	// Get units for selected property using TRPC
	const { data: propertyUnits = [], isLoading: unitsLoading } = trpc.units.list.useQuery(
		{ propertyId: selectedPropertyId! },
		{ enabled: !!selectedPropertyId }
	)

	// Computed data
	const selectedProperty = properties.find(p => p.id === selectedPropertyId)
	const hasUnits = propertyUnits.length > 0
	const availableUnits = propertyUnits.filter(
		unit => unit.status === 'VACANT' || unit.status === 'RESERVED'
	)

	return {
		properties,
		tenants,
		units: propertyUnits, // Alias for backward compatibility
		propertyUnits,
		selectedProperty,
		hasUnits,
		availableUnits,
		isLoading: unitsLoading,
		unitsLoading,
		error: null // TODO: Add proper error handling
	}
}
