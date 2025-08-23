/**
 * Lease Management hook - Zustand + TanStack Query Integration
 * Clean integration between Zustand state and native TanStack Query API calls
 */
import { useCallback } from 'react'
import { usePropertySelection, useNotificationSystem } from './use-app-store'
import {
	useLeases as useLeasesAPI,
	useLease as useLeaseAPI,
	useCreateLease,
	useUpdateLease,
	useDeleteLease,
	useLeasesByProperty
} from './api/use-leases'
import type {
	CreateLeaseInput,
	UpdateLeaseInput,
	LeaseQuery
} from '@repo/shared'

/**
 * Enhanced Lease Management Hook
 * Combines TanStack Query for server state with Zustand for UI state
 */
export function useLeaseManagement(
	query?: LeaseQuery,
	options?: { enabled?: boolean }
) {
	// Zustand state for UI management
	const { selectedPropertyId } = usePropertySelection()
	const { notifySuccess, notifyError } = useNotificationSystem()

	// TanStack Query for server state
	const leasesQuery = useLeasesAPI(query, options)
	const propertyLeasesQuery = useLeasesByProperty(selectedPropertyId || '', {
		enabled: !!selectedPropertyId
	})

	// Mutations with integrated notifications
	const createLeaseMutation = useCreateLease()
	const updateLeaseMutation = useUpdateLease()
	const deleteLeaseMutation = useDeleteLease()

	// Enhanced actions with integrated state management
	const createLease = useCallback(
		async (data: CreateLeaseInput) => {
			try {
				const result = await createLeaseMutation.mutateAsync(data)
				notifySuccess(
					'Lease created successfully',
					`Lease for ${data.tenantName} has been created.`
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to create lease'
				notifyError('Failed to create lease', message)
				throw error
			}
		},
		[createLeaseMutation, notifySuccess, notifyError]
	)

	const updateLease = useCallback(
		async (id: string, data: UpdateLeaseInput) => {
			try {
				const result = await updateLeaseMutation.mutateAsync({
					id,
					data
				})
				notifySuccess('Lease updated successfully')
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to update lease'
				notifyError('Failed to update lease', message)
				throw error
			}
		},
		[updateLeaseMutation, notifySuccess, notifyError]
	)

	const deleteLease = useCallback(
		async (id: string) => {
			try {
				await deleteLeaseMutation.mutateAsync(id)
				notifySuccess('Lease deleted successfully')
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to delete lease'
				notifyError('Failed to delete lease', message)
				throw error
			}
		},
		[deleteLeaseMutation, notifySuccess, notifyError]
	)

	// Computed values for better UX
	const activeLeases =
		leasesQuery.data?.filter(lease => lease.status === 'ACTIVE') || []
	const expiredLeases =
		leasesQuery.data?.filter(lease => lease.status === 'EXPIRED') || []
	const upcomingExpirations =
		leasesQuery.data?.filter(lease => {
			const endDate = new Date(lease.endDate)
			const thirtyDaysFromNow = new Date()
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
			return endDate <= thirtyDaysFromNow && lease.status === 'ACTIVE'
		}) || []

	return {
		// Query state
		leases: leasesQuery.data || [],
		isLoading: leasesQuery.isLoading,
		isError: leasesQuery.isError,
		error: leasesQuery.error,
		refetch: leasesQuery.refetch,

		// Property-specific leases
		propertyLeases: propertyLeasesQuery.data || [],
		isPropertyLeasesLoading: propertyLeasesQuery.isLoading,
		selectedPropertyId,

		// Computed lease data
		activeLeases,
		expiredLeases,
		upcomingExpirations,

		// Statistics
		stats: {
			total: leasesQuery.data?.length || 0,
			active: activeLeases.length,
			expired: expiredLeases.length,
			expiringSoon: upcomingExpirations.length
		},

		// CRUD actions
		createLease,
		updateLease,
		deleteLease,

		// Mutation states
		isCreating: createLeaseMutation.isPending,
		isUpdating: updateLeaseMutation.isPending,
		isDeleting: deleteLeaseMutation.isPending,

		// Action states
		isBusy:
			createLeaseMutation.isPending ||
			updateLeaseMutation.isPending ||
			deleteLeaseMutation.isPending
	}
}

/**
 * Hook for managing a single lease by ID
 */
export function useLease(id: string, options?: { enabled?: boolean }) {
	const leaseQuery = useLeaseAPI(id, options)
	const { notifyError } = useNotificationSystem()

	return {
		lease: leaseQuery.data || null,
		isLoading: leaseQuery.isLoading,
		isError: leaseQuery.isError,
		error: leaseQuery.error,
		refetch: leaseQuery.refetch,

		// Computed lease information
		isActive: leaseQuery.data?.status === 'ACTIVE',
		isExpired: leaseQuery.data?.status === 'EXPIRED',
		daysUntilExpiration: leaseQuery.data
			? Math.ceil(
					(new Date(leaseQuery.data.endDate).getTime() - Date.now()) /
						(1000 * 60 * 60 * 24)
				)
			: null
	}
}

/**
 * Hook for lease statistics and analytics
 */
export function useLeaseAnalytics() {
	const leasesQuery = useLeasesAPI()

	const analytics = {
		totalLeases: leasesQuery.data?.length || 0,
		activeLeases:
			leasesQuery.data?.filter(l => l.status === 'ACTIVE').length || 0,
		expiredLeases:
			leasesQuery.data?.filter(l => l.status === 'EXPIRED').length || 0,
		averageLeaseLength: 0, // Could calculate from lease data
		monthlyRevenue: 0 // Could calculate from rent amounts
	}

	return {
		analytics,
		isLoading: leasesQuery.isLoading,
		isError: leasesQuery.isError,
		error: leasesQuery.error
	}
}
