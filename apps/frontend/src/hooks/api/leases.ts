'use client'

import { leasesApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'

// Lease type now imported from @repo/shared types - removed unused local definition
type InsertLease = Database['public']['Tables']['Lease']['Insert']
type UpdateLease = Database['public']['Tables']['Lease']['Update']

type LeaseStatus = Database['public']['Enums']['LeaseStatus']

// Enhanced leases hook using pre-calculated analytics from database RPC functions
export function useLeases(status?: LeaseStatus) {
	return useQuery({
		queryKey: ['leases', 'analytics', status ?? 'ALL'],
		queryFn: async () => {
			// Use RPC function that returns pre-calculated lease analytics
			return leasesApi.getLeasesWithAnalytics(status)
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3
	})
}

// Enhanced lease stats using pre-calculated financial summary from database RPC functions
export function useLeaseStats() {
	return useQuery({
		queryKey: ['leases', 'financial-summary'],
		queryFn: async () => {
			// Use RPC function that returns pre-calculated financial summary
			return leasesApi.getLeaseFinancialSummary()
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3
	})
}

// Enhanced create lease using server-side financial calculations
export function useCreateLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertLease) => {
			// Use RPC function that handles financial calculations server-side
			return leasesApi.createLeaseWithFinancialCalculations(values)
		},
		onMutate: async () => {
			// Cancel outgoing refetches to prevent conflicts
			await qc.cancelQueries({ queryKey: ['leases'] })
			
			// No optimistic updates with business logic - server handles all calculations
			// Just show loading state to user
			return {}
		},
		onError: () => {
			// Invalidate to refresh from server on error
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all lease queries to get server-calculated data
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

// Enhanced update lease using server-side financial recalculations
export function useUpdateLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateLease }) => {
			// Use RPC function that handles financial recalculations server-side
			return leasesApi.updateLeaseWithFinancialCalculations(id, values)
		},
		onMutate: async () => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['leases'] })
			
			// No optimistic updates with business logic - server handles all calculations
			// Just show loading state to user
			return {}
		},
		onError: () => {
			// Invalidate to refresh from server on error
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all lease queries to get server-calculated data
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

// Enhanced delete lease using server-side financial impact calculations
export function useDeleteLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			// Use RPC function that handles financial impact calculations server-side
			return leasesApi.terminateLeaseWithFinancialCalculations(id)
		},
		onMutate: async () => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['leases'] })
			
			// No optimistic updates with business logic - server handles all calculations
			// Just show loading state to user
			return {}
		},
		onError: () => {
			// Invalidate to refresh from server on error
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all lease queries to get server-calculated data
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
