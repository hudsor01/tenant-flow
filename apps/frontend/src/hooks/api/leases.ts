'use client'

import { leasesApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'

// Lease type now imported from @repo/shared types - removed unused local definition

type InsertLease = Database['public']['Tables']['Lease']['Insert']

type UpdateLease = Database['public']['Tables']['Lease']['Update']

type LeaseStatus = Database['public']['Enums']['LeaseStatus']

export function useLeases(status?: LeaseStatus) {
	return useQuery({
		queryKey: ['leases', status ?? 'ALL'],
		queryFn: async () => {
			return leasesApi.list(status ? { status } : undefined)
		}
	})
}

export function useLeaseStats() {
	return useQuery({
		queryKey: ['leases', 'stats'],
		queryFn: async () => {
			return leasesApi.stats()
		}
	})
}

export function useCreateLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertLease) => leasesApi.create(values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateLease }) =>
			leasesApi.update(id, values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useDeleteLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			await leasesApi.remove(id)
			return true
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
