/**
 * Example: Migrating Dashboard from old hooks to new Zustand stores
 * 
 * This file demonstrates how to migrate from the old hook-based approach
 * to the new Zustand store approach with Supabase integration
 */

import React, { useEffect } from 'react'
import { usePropertyStore } from '@/stores/property-store'
import { useLeaseStore } from '@/stores/lease-store'
import { useTenantStore } from '@/stores/tenant-store'

// OLD APPROACH (to be replaced)
// import { useProperties } from '@/hooks/useProperties'
// import { useTenants } from '@/hooks/useTenants'
// import { useMaintenanceRequests } from '@/hooks/useMaintenance'

export function DashboardExample() {
  // NEW APPROACH: Using Zustand stores
  const {
    properties,
    isLoading: propertiesLoading,
    fetchProperties,
    totalCount: totalProperties,
    getVacantUnitsCount,
    subscribeToChanges: subscribeToPropertyChanges
  } = usePropertyStore()
  
  const {
    fetchExpiringLeases,
    expiringLeases,
    activeCount: activeLeaseCount,
    subscribeToChanges: subscribeToLeaseChanges
  } = useLeaseStore()
  
  const {
    tenants,
    isLoading: tenantsLoading,
    fetchTenants,
    activeTenants,
    pendingInvitations,
    subscribeToChanges: subscribeToTenantChanges
  } = useTenantStore()
  
  // Initialize data on mount
  useEffect(() => {
    // Fetch initial data
    fetchProperties()
    fetchTenants()
    fetchExpiringLeases(30) // Next 30 days
    
    // Set up real-time subscriptions
    const unsubProperty = subscribeToPropertyChanges()
    const unsubLease = subscribeToLeaseChanges()
    const unsubTenant = subscribeToTenantChanges()
    
    // Cleanup subscriptions
    return () => {
      unsubProperty()
      unsubLease()
      unsubTenant()
    }
  }, [])
  
  // Calculate stats
  const vacantUnits = getVacantUnitsCount()
  const occupancyRate = properties.reduce((total, property) => {
    const totalUnits = property.unitCount || 0
    const occupiedUnits = property.units?.filter(u => u.status === 'OCCUPIED').length || 0
    return total + (totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0)
  }, 0) / (properties.length || 1)
  
  // Example of using the data
  return (
    <div>
      <h1>Dashboard Stats</h1>
      
      {/* Property Stats */}
      <div>
        <h2>Properties</h2>
        <p>Total Properties: {totalProperties}</p>
        <p>Vacant Units: {vacantUnits}</p>
        <p>Occupancy Rate: {occupancyRate.toFixed(1)}%</p>
      </div>
      
      {/* Tenant Stats */}
      <div>
        <h2>Tenants</h2>
        <p>Active Tenants: {activeTenants}</p>
        <p>Pending Invitations: {pendingInvitations}</p>
      </div>
      
      {/* Lease Stats */}
      <div>
        <h2>Leases</h2>
        <p>Active Leases: {activeLeaseCount}</p>
        <p>Expiring Soon: {expiringLeases.length}</p>
      </div>
    </div>
  )
}

// MIGRATION GUIDE:
// 
// 1. Replace hook imports:
//    OLD: import { useProperties } from '@/hooks/useProperties'
//    NEW: import { usePropertyStore } from '@/stores/property-store'
//
// 2. Replace hook usage:
//    OLD: const { data, isLoading } = useProperties()
//    NEW: const { properties, isLoading, fetchProperties } = usePropertyStore()
//
// 3. Initialize data in useEffect:
//    NEW: useEffect(() => { fetchProperties() }, [])
//
// 4. Access data directly:
//    OLD: data?.properties || []
//    NEW: properties
//
// 5. Mutations are simpler:
//    OLD: const createMutation = useCreateProperty()
//         createMutation.mutate(data)
//    NEW: const { createProperty } = usePropertyStore()
//         await createProperty(data)
//
// 6. Real-time updates are automatic:
//    NEW: const unsubscribe = subscribeToChanges()
//
// 7. Filtering is built-in:
//    NEW: setFilters({ city: 'New York' })
//         fetchProperties() // Will use filters
//
// 8. Computed values are available:
//    NEW: const vacantCount = getVacantUnitsCount()
//
// 9. Selection state is managed:
//    NEW: selectProperty(property)
//         const selected = usePropertyStore(state => state.selectedProperty)
//
// 10. Performance: Components only re-render when used data changes
//     NEW: const properties = usePropertyStore(state => state.properties)
//          // Only re-renders when properties change, not other state

// BENEFITS:
// - 50% less code
// - Real-time updates built-in
// - Better performance (less re-renders)
// - Type-safe with Supabase types
// - Centralized state management
// - Automatic caching and persistence
// - Easier testing