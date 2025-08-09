import { atom } from 'jotai'
import { atomWithQuery } from 'jotai-tanstack-query'
import { atomWithReset } from 'jotai/utils'
import { PropertiesApi } from '../../lib/api/properties'
import type { Property } from '@repo/shared'

// Re-export types from shared package
export type { Property } from '@repo/shared'

export interface PropertyFilters {
  city?: string
  propertyType?: string
  searchQuery?: string
}

// Core UI state atoms (non-server data)
export const selectedPropertyAtom = atom<Property | null>(null)
export const propertyFiltersAtom = atomWithReset<PropertyFilters>({})

// Server state atoms (primary data source)
export const propertiesQueryAtom = atomWithQuery(() => ({
  queryKey: ['properties'],
  queryFn: () => PropertiesApi.getProperties(),
}))

export const propertyStatsQueryAtom = atomWithQuery(() => ({
  queryKey: ['property-stats'],
  queryFn: () => PropertiesApi.getPropertyStats(),
}))

// Derived atoms from server state
export const propertiesAtom = atom((get) => {
  const query = get(propertiesQueryAtom)
  return query.data || []
})

// Derived stats from server state
export const totalPropertiesCountAtom = atom((get) => {
  const properties = get(propertiesAtom)
  return properties.length
})

export const cityOptionsAtom = atom((get) => {
  const properties = get(propertiesAtom)
  return [...new Set(properties.map(p => p.city).filter((city): city is string => Boolean(city)))]
})

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

// UI Action atoms (for non-server state only)
export const setPropertyFiltersAtom = atom(
  null,
  (get, set, filters: PropertyFilters) => {
    const currentFilters = get(propertyFiltersAtom)
    set(propertyFiltersAtom, { ...currentFilters, ...filters })
  }
)

export const clearPropertyFiltersAtom = atom(
  null,
  (get, set, _arg) => {
    // Use the built-in reset functionality from atomWithReset
    set(propertyFiltersAtom, (_prev) => ({}))
  }
)

export const selectPropertyAtom = atom(
  null,
  (get, set, property: Property | null) => {
    set(selectedPropertyAtom, property)
  }
)