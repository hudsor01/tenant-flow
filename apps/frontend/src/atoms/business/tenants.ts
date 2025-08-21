/**
 * Tenants State Management - Refactored with Factory Pattern
 * Eliminates DRY violations and simplifies implementation
 */

import { atom } from 'jotai'
import { atomWithQuery } from 'jotai-tanstack-query'
import { ApiService } from '../../lib/api/api-service'
import { createEntityAtoms, type BaseFilters } from '../utils/atom-factory'
import type { Tenant, CreateTenantInput, UpdateTenantInput, Lease } from '@repo/shared'

// Re-export types from shared package
export type { Tenant } from '@repo/shared'

// Tenant-specific filters
export interface TenantFilters extends BaseFilters {
	status?: string
	propertyId?: string
	unitId?: string
	hasActiveLease?: boolean
	invitationStatus?: string
}

// Transform tenant data to match API expectations
const transformTenantData = (data: Omit<Tenant, 'id'> | Partial<Tenant>) => {
	return {
		...data,
		// Convert null to undefined for API compatibility
		phone: data.phone === null ? undefined : data.phone,
		emergencyContact: data.emergencyContact === null ? undefined : data.emergencyContact,
		userId: data.userId === null ? undefined : data.userId
	}
}

// Create API adapter to match factory interface
const tenantsApiAdapter = {
	getAll: () => ApiService.getTenants(),
	getById: (id: string) => ApiService.getTenant(id),
	create: (data: Omit<Tenant, 'id'>) =>
		ApiService.createTenant(transformTenantData(data) as CreateTenantInput),
	update: (id: string, data: Partial<Tenant>) =>
		ApiService.updateTenant(
			id,
			transformTenantData(data) as UpdateTenantInput
		),
	delete: async (id: string) => {
		await ApiService.deleteTenant(id)
	}
}

// Create tenant atoms using factory
const tenantAtoms = createEntityAtoms<Tenant, TenantFilters>({
	name: 'tenants',
	api: tenantsApiAdapter,
	defaultFilters: {},
	filterFn: (tenant, filters) => {
		// Status filter (invitationStatus)
		if (filters.status && tenant.invitationStatus !== filters.status)
			return false

		// Invitation status filter (explicit)
		if (filters.invitationStatus && tenant.invitationStatus !== filters.invitationStatus)
			return false

		// Property filter - implemented through leases atom when available
		// This is done in the derived atoms below since tenant doesn't have direct propertyId

		// Search filter
		if (filters.searchQuery) {
			const query = filters.searchQuery.toLowerCase()
			const fullName = tenant.name.toLowerCase()
			const email = tenant.email.toLowerCase()
			const phone = tenant.phone?.toLowerCase() || ''
			const emergencyContact = tenant.emergencyContact?.toLowerCase() || ''
			
			return (
				fullName.includes(query) ||
				email.includes(query) ||
				phone.includes(query) ||
				emergencyContact.includes(query)
			)
		}

		return true
	}
})

// Export all generated atoms with consistent naming
export const {
	// Query atoms
	queryAtom: tenantsQueryAtom,
	dataAtom: tenantsAtom,
	loadingAtom: tenantsLoadingAtom,
	errorAtom: tenantsErrorAtom,

	// Selection
	selectedAtom: selectedTenantAtom,
	selectAtom: selectTenantAtom,
	clearSelectionAtom: clearTenantSelectionAtom,

	// Filters
	filtersAtom: tenantFiltersAtom,
	filteredDataAtom: filteredTenantsAtom,
	setFiltersAtom: setTenantFiltersAtom,
	clearFiltersAtom: clearTenantFiltersAtom,

	// Counts
	countAtom: totalTenantsCountAtom,
	filteredCountAtom: filteredTenantsCountAtom,

	// Lookups
	byIdAtom: tenantsByIdAtom,
	detailQueryAtom: tenantDetailQueryAtom,

	// Mutations
	createMutation: createTenantMutationAtom,
	updateMutation: updateTenantMutationAtom,
	deleteMutation: deleteTenantMutationAtom,

	// Actions
	refetchAtom: refetchTenantsAtom,

	// Query keys
	queryKeys: tenantQueryKeys
} = tenantAtoms

// Additional derived atoms specific to tenants

// Active tenants only
export const activeTenantsAtom = atom(get =>
	get(tenantsAtom).filter(tenant => tenant.invitationStatus === 'ACCEPTED')
)

// Pending tenants
export const pendingTenantsAtom = atom(get =>
	get(tenantsAtom).filter(tenant => tenant.invitationStatus === 'PENDING')
)

// Expired tenants
export const expiredTenantsAtom = atom(get =>
	get(tenantsAtom).filter(tenant => tenant.invitationStatus === 'EXPIRED')
)

// Sent invitations
export const sentInvitationsAtom = atom(get =>
	get(tenantsAtom).filter(tenant => tenant.invitationStatus === 'SENT')
)

// Tenants by status count
export const tenantsByStatusAtom = atom(get => {
	const tenants = get(tenantsAtom)
	return tenants.reduce(
		(acc, tenant) => {
			const status = tenant.invitationStatus
			if (!acc[status]) {
				acc[status] = 0
			}
			acc[status]++
			return acc
		},
		{} as Record<string, number>
	)
})

// Tenant search atom for enhanced search functionality
export const tenantSearchAtom = atom('')

// Enhanced search results that include tenant metadata
export const searchedTenantsAtom = atom(get => {
	const tenants = get(tenantsAtom)
	const searchQuery = get(tenantSearchAtom)
	
	if (!searchQuery.trim()) return tenants
	
	const query = searchQuery.toLowerCase()
	return tenants.filter(tenant => {
		const searchableFields = [
			tenant.name,
			tenant.email,
			tenant.phone || '',
			tenant.emergencyContact || '',
			tenant.invitationStatus
		].map(field => field.toLowerCase())
		
		return searchableFields.some(field => field.includes(query))
	})
})

// Lease integration atoms (for property relationships)
// These will work once leases atom is available
export const leasesAtom = atom<Lease[]>([]) // This will be imported from leases atoms when available

// Tenants with their current property information
export const tenantsWithPropertyInfoAtom = atom(get => {
	const tenants = get(tenantsAtom)
	const leases = get(leasesAtom)
	
	return tenants.map(tenant => {
		// Find active lease for this tenant
		const activeLease = leases.find(lease => 
			lease.tenantId === tenant.id && 
			lease.status === 'ACTIVE'
		)
		
		return {
			...tenant,
			currentLease: activeLease || null,
			hasActiveLease: !!activeLease
		}
	})
})

// Tenants by property (implemented through leases relationship)
export const tenantsByPropertyAtom = atom(get => {
	const tenantsWithLeases = get(tenantsWithPropertyInfoAtom)
	
	return tenantsWithLeases.reduce((acc, tenant) => {
		if (tenant.currentLease) {
			// Get propertyId through unit relationship when leases atom includes unit data
			// For now, we'll use a placeholder structure
			const propertyId = 'property-from-lease' // This will be: tenant.currentLease.unit.propertyId
			
			if (!acc[propertyId]) {
				acc[propertyId] = []
			}
			acc[propertyId].push(tenant)
		}
		return acc
	}, {} as Record<string, typeof tenantsWithLeases[0][]>)
})

// Tenant stats query (separate endpoint)
export const tenantStatsQueryAtom = atomWithQuery(() => ({
	queryKey: ['tenant-stats'],
	queryFn: () => ApiService.getTenantStats(),
	staleTime: 5 * 60 * 1000, // 5 minutes
	gcTime: 10 * 60 * 1000 // 10 minutes
}))

// Enhanced tenant stats with computed metrics
export const enhancedTenantStatsAtom = atom(get => {
	const baseStats = get(tenantStatsQueryAtom).data
	const tenantsByStatus = get(tenantsByStatusAtom)
	const totalTenants = get(totalTenantsCountAtom)
	
	// Combine API stats with computed stats
	return {
		...baseStats,
		computed: {
			byStatus: tenantsByStatus,
			totalCount: totalTenants,
			acceptanceRate: baseStats ? 
				(baseStats.active / (baseStats.active + baseStats.pendingApplications)) * 100 : 0
		}
	}
})

// Filter actions for common use cases
export const filterByStatusAtom = atom(null, (get, set, status: string) => {
	const currentFilters = get(tenantFiltersAtom)
	set(tenantFiltersAtom, { ...currentFilters, status })
})

export const filterByPropertyAtom = atom(null, (get, set, propertyId: string) => {
	const currentFilters = get(tenantFiltersAtom)
	set(tenantFiltersAtom, { ...currentFilters, propertyId })
})

export const clearAllFiltersAtom = atom(null, (get, set) => {
	set(tenantFiltersAtom, {})
	set(tenantSearchAtom, '')
})

// Export a simplified API for common operations
export const TenantsState = {
	// Get all tenants
	useTenants: () => tenantsAtom,
	useFilteredTenants: () => filteredTenantsAtom,
	useActiveTenants: () => activeTenantsAtom,
	usePendingTenants: () => pendingTenantsAtom,
	useExpiredTenants: () => expiredTenantsAtom,
	useSentInvitations: () => sentInvitationsAtom,
	useSearchedTenants: () => searchedTenantsAtom,

	// Selection
	useSelectedTenant: () => selectedTenantAtom,
	selectTenant: selectTenantAtom,
	clearSelection: clearTenantSelectionAtom,

	// Filters
	useFilters: () => tenantFiltersAtom,
	setFilters: setTenantFiltersAtom,
	clearFilters: clearTenantFiltersAtom,
	filterByStatus: filterByStatusAtom,
	filterByProperty: filterByPropertyAtom,
	clearAllFilters: clearAllFiltersAtom,

	// Search
	useSearch: () => tenantSearchAtom,
	setSearch: atom(null, (get, set, query: string) => set(tenantSearchAtom, query)),

	// Loading states
	useLoading: () => tenantsLoadingAtom,
	useError: () => tenantsErrorAtom,

	// Stats
	useStats: () => tenantStatsQueryAtom,
	useEnhancedStats: () => enhancedTenantStatsAtom,
	useStatusCounts: () => tenantsByStatusAtom,

	// Relationships
	useTenantsWithPropertyInfo: () => tenantsWithPropertyInfoAtom,
	useTenantsByProperty: () => tenantsByPropertyAtom,

	// Actions
	refetch: refetchTenantsAtom,

	// Mutations
	create: createTenantMutationAtom,
	update: updateTenantMutationAtom,
	delete: deleteTenantMutationAtom
}

// Helper hooks for common use cases
export const useTenantById = (id: string) => {
	const byId = atom(get => get(tenantsByIdAtom)[id])
	return byId
}

export const useTenantsForProperty = (propertyId: string) => {
	return atom(get => {
		const tenantsByProperty = get(tenantsByPropertyAtom)
		return tenantsByProperty[propertyId] || []
	})
}

// Helper for checking if tenant has active lease
export const useTenantHasActiveLease = (tenantId: string) => {
	return atom(get => {
		const tenantsWithInfo = get(tenantsWithPropertyInfoAtom)
		const tenant = tenantsWithInfo.find(t => t.id === tenantId)
		return tenant?.hasActiveLease || false
	})
}

// Utility atoms for bulk operations
export const selectedTenantsForBulkAtom = atom<string[]>([])

export const toggleTenantSelectionAtom = atom(null, (get, set, tenantId: string) => {
	const currentSelection = get(selectedTenantsForBulkAtom)
	const isSelected = currentSelection.includes(tenantId)
	
	if (isSelected) {
		set(selectedTenantsForBulkAtom, currentSelection.filter(id => id !== tenantId))
	} else {
		set(selectedTenantsForBulkAtom, [...currentSelection, tenantId])
	}
})

export const clearBulkSelectionAtom = atom(null, (get, set) => {
	set(selectedTenantsForBulkAtom, [])
})

// Invitation management atoms
export const resendInvitationAtom = atom(null, async (get, _set, _tenantId: string) => {
	try {
		// This would call the API to resend invitation
		// await TenantsApi.resendInvitation(tenantId)
		// For now, we'll just refetch the data
		const refetch = get(refetchTenantsAtom)
		await refetch
	} catch (error) {
		console.error('Failed to resend invitation:', error)
		throw error
	}
})