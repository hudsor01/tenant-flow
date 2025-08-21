/**
 * Properties State Management - Refactored with Factory Pattern
 * Eliminates DRY violations and simplifies implementation
 */

import { atom } from 'jotai'
import { ApiService } from '../../lib/api/api-service'
import { createEntityAtoms, type BaseFilters } from '../utils/atom-factory'
import type {
	Property,
	CreatePropertyInput,
	UpdatePropertyInput
} from '@repo/shared'

// Re-export types from shared package
export type { Property } from '@repo/shared'

// Property-specific filters
export interface PropertyFilters extends BaseFilters {
	city?: string
	propertyType?: string
}

// Transform property data to match API expectations
const transformPropertyData = (
	data: Omit<Property, 'id'> | Partial<Property>
) => {
	return {
		...data,
		// Convert null to undefined for API compatibility
		description: data.description === null ? undefined : data.description
	}
}

// Create API adapter to match factory interface
const propertiesApiAdapter = {
	getAll: () => ApiService.getProperties(),
	getById: (id: string) => ApiService.getProperty(id),
	create: (data: Omit<Property, 'id'>) =>
		ApiService.createProperty(
			transformPropertyData(data) as CreatePropertyInput
		),
	update: (id: string, data: Partial<Property>) =>
		ApiService.updateProperty(
			id,
			transformPropertyData(data) as UpdatePropertyInput
		),
	delete: async (id: string) => {
		await ApiService.deleteProperty(id)
	}
}

// Create property atoms using factory
const propertyAtoms = createEntityAtoms<Property, PropertyFilters>({
	name: 'properties',
	api: propertiesApiAdapter,
	defaultFilters: {},
	filterFn: (property, filters) => {
		// City filter
		if (filters.city && property.city !== filters.city) return false

		// Property type filter
		if (
			filters.propertyType &&
			property.propertyType !== filters.propertyType
		)
			return false

		// Search filter
		if (filters.searchQuery) {
			const query = filters.searchQuery.toLowerCase()
			return (
				property.name.toLowerCase().includes(query) ||
				property.address.toLowerCase().includes(query)
			)
		}

		return true
	}
})

// Export all generated atoms with consistent naming
export const {
	// Query atoms
	queryAtom: propertiesQueryAtom,
	dataAtom: propertiesAtom,
	loadingAtom: propertiesLoadingAtom,
	errorAtom: propertiesErrorAtom,

	// Selection
	selectedAtom: selectedPropertyAtom,
	selectAtom: selectPropertyAtom,
	clearSelectionAtom: clearPropertySelectionAtom,

	// Filters
	filtersAtom: propertyFiltersAtom,
	filteredDataAtom: filteredPropertiesAtom,
	setFiltersAtom: setPropertyFiltersAtom,
	clearFiltersAtom: clearPropertyFiltersAtom,

	// Counts
	countAtom: totalPropertiesCountAtom,
	filteredCountAtom: filteredPropertiesCountAtom,

	// Lookups
	byIdAtom: propertiesByIdAtom,
	detailQueryAtom: propertyDetailQueryAtom,

	// Mutations
	createMutation: createPropertyMutationAtom,
	updateMutation: updatePropertyMutationAtom,
	deleteMutation: deletePropertyMutationAtom,

	// Actions
	refetchAtom: refetchPropertiesAtom,

	// Query keys
	queryKeys: propertyQueryKeys
} = propertyAtoms

// Additional derived atoms specific to properties

// City options derived from properties
export const cityOptionsAtom = atom(get => {
	const properties = get(propertiesAtom)
	return [
		...new Set(
			properties
				.map(p => p.city)
				.filter((city): city is string => Boolean(city))
		)
	]
})

// Property type options
export const typeOptionsAtom = atom<string[]>([
	'SINGLE_FAMILY',
	'APARTMENT',
	'CONDO',
	'TOWNHOUSE',
	'OTHER'
])

// Properties grouped by city
export const propertiesByCityAtom = atom(get => {
	const properties = get(propertiesAtom)
	return properties.reduce(
		(acc, property) => {
			const city = property.city || 'Unknown'
			if (!acc[city]) {
				acc[city] = []
			}
			acc[city].push(property)
			return acc
		},
		{} as Record<string, Property[]>
	)
})

// Vacant units count across all properties
export const vacantUnitsCountAtom = atom(get => {
	const properties = get(propertiesAtom)
	return properties.reduce((total, property) => {
		const vacantUnits =
			property.units?.filter(
				(unit: { status: string }) => unit.status === 'VACANT'
			).length || 0
		return total + vacantUnits
	}, 0)
})

// Property stats (if needed as separate query)
import { atomWithQuery } from 'jotai-tanstack-query'

export const propertyStatsQueryAtom = atomWithQuery(() => ({
	queryKey: ['property-stats'],
	queryFn: () => ApiService.getPropertyStats(),
	staleTime: 5 * 60 * 1000,
	gcTime: 10 * 60 * 1000
}))

// Export a simplified API for common operations
export const PropertiesState = {
	// Get all properties
	useProperties: () => propertiesAtom,
	useFilteredProperties: () => filteredPropertiesAtom,

	// Selection
	useSelectedProperty: () => selectedPropertyAtom,
	selectProperty: selectPropertyAtom,

	// Filters
	useFilters: () => propertyFiltersAtom,
	setFilters: setPropertyFiltersAtom,
	clearFilters: clearPropertyFiltersAtom,

	// Loading states
	useLoading: () => propertiesLoadingAtom,
	useError: () => propertiesErrorAtom,

	// Actions
	refetch: refetchPropertiesAtom,

	// Mutations
	create: createPropertyMutationAtom,
	update: updatePropertyMutationAtom,
	delete: deletePropertyMutationAtom
}
