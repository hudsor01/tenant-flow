/**
 * Enhanced Tenants Management Hook - Zustand + TanStack Query Integration
 * Maximum performance with native API usage and advanced state management
 */
import { useCallback } from 'react'
import {
	useTenantSelection,
	useNotificationSystem,
	usePropertySelection
} from './use-app-store'
import {
	useTenants as useTenantsAPI,
	useTenant as useTenantAPI,
	useTenantsByProperty,
	useCreateTenant,
	useUpdateTenant,
	useDeleteTenant
} from './api/use-tenants'
import type {
	CreateTenantInput,
	UpdateTenantInput,
	TenantQuery
} from '@repo/shared'

/**
 * Enhanced Tenants Management Hook
 * Combines TanStack Query for server state with Zustand for UI state
 */
export function useTenants(
	query?: TenantQuery,
	options?: { enabled?: boolean }
) {
	// Zustand state for UI management
	const { selectedTenantId, selectTenant, clearSelection } =
		useTenantSelection()
	const { selectedPropertyId } = usePropertySelection()
	const { notifySuccess, notifyError } = useNotificationSystem()

	// TanStack Query for server state
	const tenantsQuery = useTenantsAPI(query, options)
	const selectedTenantQuery = useTenantAPI(selectedTenantId || '', {
		enabled: !!selectedTenantId
	})
	const propertyTenantsQuery = useTenantsByProperty(
		selectedPropertyId || '',
		{
			enabled: !!selectedPropertyId
		}
	)

	// Mutations with integrated notifications
	const createTenantMutation = useCreateTenant()
	const updateTenantMutation = useUpdateTenant()
	const deleteTenantMutation = useDeleteTenant()

	// Enhanced actions with integrated state management
	const createTenant = useCallback(
		async (data: CreateTenantInput) => {
			try {
				const result = await createTenantMutation.mutateAsync(data)
				// Auto-select newly created tenant
				selectTenant(result.id, result.name)
				notifySuccess(
					'Tenant Created',
					`${result.name} has been added successfully.`
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to create tenant'
				notifyError('Creation Failed', message)
				throw error
			}
		},
		[createTenantMutation, selectTenant, notifySuccess, notifyError]
	)

	const updateTenant = useCallback(
		async (id: string, data: UpdateTenantInput) => {
			try {
				const result = await updateTenantMutation.mutateAsync({
					id,
					data
				})
				notifySuccess(
					'Tenant Updated',
					'Tenant information has been updated successfully.'
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to update tenant'
				notifyError('Update Failed', message)
				throw error
			}
		},
		[updateTenantMutation, notifySuccess, notifyError]
	)

	const deleteTenant = useCallback(
		async (id: string) => {
			try {
				await deleteTenantMutation.mutateAsync(id)
				// Clear selection if deleted tenant was selected
				if (selectedTenantId === id) {
					clearSelection()
				}
				notifySuccess(
					'Tenant Removed',
					'Tenant has been removed from the system.'
				)
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to delete tenant'
				notifyError('Deletion Failed', message)
				throw error
			}
		},
		[
			deleteTenantMutation,
			selectedTenantId,
			clearSelection,
			notifySuccess,
			notifyError
		]
	)

	// Computed values for better UX
	const activeTenants =
		tenantsQuery.data?.filter(
			tenant => tenant.invitationStatus === 'ACCEPTED'
		) || []
	const inactiveTenants =
		tenantsQuery.data?.filter(
			tenant =>
				tenant.invitationStatus === 'PENDING' ||
				tenant.invitationStatus === 'EXPIRED'
		) || []
	const recentTenants =
		tenantsQuery.data?.filter(tenant => {
			const createdDate = new Date(tenant.createdAt)
			const thirtyDaysAgo = new Date()
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
			return createdDate >= thirtyDaysAgo
		}) || []

	return {
		// Query state
		tenants: tenantsQuery.data || [],
		isLoading: tenantsQuery.isLoading,
		isError: tenantsQuery.isError,
		error: tenantsQuery.error,
		refetch: tenantsQuery.refetch,

		// Selected tenant
		selectedTenant: selectedTenantQuery.data || null,
		selectedTenantId,
		isSelectedTenantLoading: selectedTenantQuery.isLoading,

		// Property-specific tenants
		propertyTenants: propertyTenantsQuery.data || [],
		isPropertyTenantsLoading: propertyTenantsQuery.isLoading,
		selectedPropertyId,

		// Selection actions
		selectTenant,
		clearSelection,

		// Computed tenant data
		activeTenants,
		inactiveTenants,
		recentTenants,

		// Statistics
		stats: {
			total: tenantsQuery.data?.length || 0,
			active: activeTenants.length,
			inactive: inactiveTenants.length,
			recent: recentTenants.length
		},

		// CRUD actions
		createTenant,
		updateTenant,
		deleteTenant,

		// Mutation states
		isCreating: createTenantMutation.isPending,
		isUpdating: updateTenantMutation.isPending,
		isDeleting: deleteTenantMutation.isPending,

		// Action states
		isBusy:
			createTenantMutation.isPending ||
			updateTenantMutation.isPending ||
			deleteTenantMutation.isPending
	}
}

/**
 * Hook for managing a single tenant by ID
 */
export function useTenant(id: string, options?: { enabled?: boolean }) {
	const tenantQuery = useTenantAPI(id, options)

	return {
		tenant: tenantQuery.data || null,
		isLoading: tenantQuery.isLoading,
		isError: tenantQuery.isError,
		error: tenantQuery.error,
		refetch: tenantQuery.refetch,

		// Computed tenant information
		isActive: tenantQuery.data?.invitationStatus === 'ACCEPTED',
		isInactive:
			tenantQuery.data?.invitationStatus === 'PENDING' ||
			tenantQuery.data?.invitationStatus === 'EXPIRED',
		fullName: tenantQuery.data?.name || null
	}
}

/**
 * Hook for tenant selection management only (lightweight)
 */
export function useTenantSelectionOnly() {
	return useTenantSelection()
}
