import { useProperties } from './useProperties'
import { useTenants } from './useTenants'
import { useUnitsByProperty } from './useUnits'
import type { Tenant, Property, PropertyType, Unit, UnitStatus, PropertyListResponse, TenantListResponse, UnitListResponse } from '@repo/shared'

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
	
	// Transform property data to match Property interface
	const properties: Property[] = ((propertiesResponse as PropertyListResponse)?.properties || []).map((property) => ({
		id: property.id,
		name: property.name,
		address: property.address,
		city: property.city,
		state: property.state,
		zipCode: property.zipCode,
		description: null, // Not available in list response
		propertyType: (property.propertyType as PropertyType) || 'SINGLE_FAMILY',
		imageUrl: property.imageUrl || null,
		ownerId: '', // Not available in list response, will be empty
		createdAt: new Date(property.createdAt),
		updatedAt: new Date() // Not available in list response
	}))
	// Transform tenant data to match expected type
	const tenants: Tenant[] = ((tenantsResponse as TenantListResponse)?.tenants || []).map((tenant) => ({
		id: tenant.id,
		name: tenant.name,
		email: tenant.email,
		phone: tenant.phone || null,
		emergencyContact: null, // Not available in list response
		userId: null, // Not available in list response
		invitationStatus: 'ACCEPTED' as const, // Default assumption for existing tenants
		createdAt: new Date(), // Not available in list response
		updatedAt: new Date()  // Not available in list response
	}))

	// Get units for selected property
	const { data: unitsData = [], isLoading: unitsLoading, error: unitsError } = useUnitsByProperty(selectedPropertyId || '')
	
	// Transform unit data to match Unit interface
	const propertyUnits: Unit[] = Array.isArray(unitsData) 
		? unitsData as Unit[]
		: ((unitsData as UnitListResponse)?.units || []).map((unit) => ({
			id: unit.id,
			propertyId: unit.propertyId,
			unitNumber: unit.unitNumber,
			bedrooms: unit.bedrooms,
			bathrooms: unit.bathrooms,
			squareFeet: null, // Not available in list response
			rent: unit.monthlyRent,
			status: unit.status as UnitStatus,
			lastInspectionDate: null, // Not available in list response
			createdAt: new Date(), // Not available in list response
			updatedAt: new Date()  // Not available in list response
		}))

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
