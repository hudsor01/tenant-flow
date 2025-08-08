import { atom } from 'jotai'
import { atomWithQuery } from 'jotai-tanstack-query'
import { PropertiesApi } from '../../lib/api/properties'
import type { Property } from '@repo/shared'

// Re-export types from shared package
export type { Property } from '@repo/shared'

export interface PropertyFilters {
  city?: string
  propertyType?: string
  searchQuery?: string
}

// Core atoms
export const propertiesAtom = atom<Property[]>([])
export const selectedPropertyAtom = atom<Property | null>(null)
export const propertyFiltersAtom = atom<PropertyFilters>({})

// Loading states
export const propertiesLoadingAtom = atom<boolean>(false)
export const propertiesFetchingAtom = atom<boolean>(false)
export const propertiesErrorAtom = atom<string | null>(null)

// API Query Atoms
export const propertiesQueryAtom = atomWithQuery(() => ({
  queryKey: ['properties'],
  queryFn: () => PropertiesApi.getProperties(),
}))

export const propertyStatsQueryAtom = atomWithQuery(() => ({
  queryKey: ['property-stats'],
  queryFn: () => PropertiesApi.getPropertyStats(),
}))

// Stats
export const totalPropertiesCountAtom = atom<number>(0)
export const cityOptionsAtom = atom<string[]>([])
export const typeOptionsAtom = atom<string[]>(['SINGLE_FAMILY', 'APARTMENT', 'CONDO', 'TOWNHOUSE', 'OTHER'])

// Computed selectors
export const filteredPropertiesAtom = atom((get) => {
  const properties = get(propertiesAtom)
  const filters = get(propertyFiltersAtom)
  
  return properties.filter(property => {
    if (filters.city && property.city !== filters.city) return false
    if (filters.propertyType && property.propertyType !== filters.propertyType) return false
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      return property.name.toLowerCase().includes(query) || 
             property.address.toLowerCase().includes(query)
    }
    return true
  })
})

// TODO: Add status field to Property interface if needed for property status tracking
// export const propertiesByStatusAtom = atom((get) => {
//   const properties = get(propertiesAtom)
//   return properties.reduce((acc, property) => {
//     const status = property.status || 'ACTIVE'
//     if (!acc[status]) {
//       acc[status] = []
//     }
//     acc[status].push(property)
//     return acc
//   }, {} as Record<string, Property[]>)
// })

export const propertiesByCityAtom = atom((get) => {
  const properties = get(propertiesAtom)
  return properties.reduce((acc, property) => {
    const city = property.city || 'Unknown'
    if (!acc[city]) {
      acc[city] = []
    }
    acc[city].push(property)
    return acc
  }, {} as Record<string, Property[]>)
})

export const vacantUnitsCountAtom = atom((get) => {
  const properties = get(propertiesAtom)
  // Count total vacant units across all properties
  return properties.reduce((total, property) => {
    // Assuming units is an array of units with status
    const vacantUnits = property.units?.filter((unit: { status: string }) => unit.status === 'VACANT').length || 0
    return total + vacantUnits
  }, 0)
})

// Actions
export const setPropertiesAtom = atom(
  null,
  (get, set, properties: Property[]) => {
    set(propertiesAtom, properties)
    
    // Update city options
    const cities = [...new Set(properties.map(p => p.city).filter((city): city is string => Boolean(city)))]
    set(cityOptionsAtom, cities)
    
    set(totalPropertiesCountAtom, properties.length)
  }
)

export const addPropertyAtom = atom(
  null,
  (get, set, property: Property) => {
    const currentProperties = get(propertiesAtom)
    set(propertiesAtom, [property, ...currentProperties])
    set(totalPropertiesCountAtom, currentProperties.length + 1)
  }
)

export const updatePropertyAtom = atom(
  null,
  (get, set, updatedProperty: Partial<Property> & { id: string }) => {
    const currentProperties = get(propertiesAtom)
    const updatedProperties = currentProperties.map(property =>
      property.id === updatedProperty.id 
        ? { ...property, ...updatedProperty }
        : property
    )
    
    set(propertiesAtom, updatedProperties)
    
    // Update selected property if it matches
    const selectedProperty = get(selectedPropertyAtom)
    if (selectedProperty?.id === updatedProperty.id) {
      set(selectedPropertyAtom, { ...selectedProperty, ...updatedProperty })
    }
  }
)

export const deletePropertyAtom = atom(
  null,
  (get, set, propertyId: string) => {
    const currentProperties = get(propertiesAtom)
    const filteredProperties = currentProperties.filter(p => p.id !== propertyId)
    
    set(propertiesAtom, filteredProperties)
    set(totalPropertiesCountAtom, filteredProperties.length)
    
    // Clear selected property if it was deleted
    const selectedProperty = get(selectedPropertyAtom)
    if (selectedProperty?.id === propertyId) {
      set(selectedPropertyAtom, null)
    }
  }
)

export const setPropertyFiltersAtom = atom(
  null,
  (get, set, filters: PropertyFilters) => {
    const currentFilters = get(propertyFiltersAtom)
    set(propertyFiltersAtom, { ...currentFilters, ...filters })
  }
)

export const clearPropertyFiltersAtom = atom(
  null,
  (get, set) => {
    set(propertyFiltersAtom, {})
  }
)

export const selectPropertyAtom = atom(
  null,
  (get, set, property: Property | null) => {
    set(selectedPropertyAtom, property)
  }
)

export const setPropertiesLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(propertiesLoadingAtom, loading)
  }
)

export const setPropertiesErrorAtom = atom(
  null,
  (get, set, error: string | null) => {
    set(propertiesErrorAtom, error)
  }
)