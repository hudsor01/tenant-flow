'use client'

/**
 * Vendor Hooks
 * TanStack Query hooks for vendor/contractor data fetching and mutations
 * React 19 + TanStack Query v5 patterns
 */

import { useMutation, useQuery, useQueryClient, queryOptions } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { handleMutationError } from '#lib/mutation-error-handler'
import { maintenanceQueries } from './query-keys/maintenance-keys'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

export interface Vendor {
	id: string
	owner_user_id: string
	name: string
	email?: string | null
	phone?: string | null
	trade:
		| 'plumbing'
		| 'electrical'
		| 'hvac'
		| 'carpentry'
		| 'painting'
		| 'landscaping'
		| 'appliance'
		| 'general'
		| 'other'
	hourly_rate?: number | null
	status: 'active' | 'inactive'
	notes?: string | null
	created_at: string
	updated_at: string
}

export interface VendorCreateInput {
	name: string
	email?: string
	phone?: string
	trade: Vendor['trade']
	hourly_rate?: number
	notes?: string
}

export interface VendorUpdateInput extends Partial<VendorCreateInput> {
	status?: Vendor['status']
}

export interface VendorFilters {
	trade?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
}

interface VendorListResponse {
	data: Vendor[]
	total: number
	limit: number
	offset: number
}

// ============================================================================
// QUERY KEYS & OPTIONS
// ============================================================================

export const vendorKeys = {
	all: ['vendors'] as const,
	lists: () => [...vendorKeys.all, 'list'] as const,
	list: (filters?: VendorFilters) =>
		queryOptions({
			queryKey: [...vendorKeys.lists(), filters ?? {}],
			queryFn: ({ signal }) => {
				const params = new URLSearchParams()
				if (filters?.trade) params.set('trade', filters.trade)
				if (filters?.status) params.set('status', filters.status)
				if (filters?.search) params.set('search', filters.search)
				if (filters?.limit) params.set('limit', String(filters.limit))
				if (filters?.offset) params.set('offset', String(filters.offset))
				const qs = params.toString()
				return apiRequest<VendorListResponse>(
					`/api/v1/vendors${qs ? `?${qs}` : ''}`,
					{ signal },
				)
			},
			staleTime: 5 * 60 * 1000,
		}),
	details: () => [...vendorKeys.all, 'detail'] as const,
	detail: (id: string) =>
		queryOptions({
			queryKey: [...vendorKeys.details(), id],
			queryFn: ({ signal }) =>
				apiRequest<Vendor>(`/api/v1/vendors/${id}`, { signal }),
			staleTime: 5 * 60 * 1000,
			enabled: !!id,
		}),
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useVendors(filters?: VendorFilters) {
	return useQuery(vendorKeys.list(filters))
}

export function useVendor(id: string) {
	return useQuery(vendorKeys.detail(id))
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: VendorCreateInput) =>
			apiRequest<Vendor>('/api/v1/vendors', {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
			toast.success('Vendor added successfully')
		},
		onError: (error) => handleMutationError(error, 'Add vendor'),
	})
}

export function useUpdateVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: VendorUpdateInput }) =>
			apiRequest<Vendor>(`/api/v1/vendors/${id}`, {
				method: 'PUT',
				body: JSON.stringify(data),
			}),
		onSuccess: (vendor) => {
			queryClient.setQueryData(vendorKeys.detail(vendor.id).queryKey, vendor)
			queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
			toast.success('Vendor updated successfully')
		},
		onError: (error) => handleMutationError(error, 'Update vendor'),
	})
}

export function useDeleteVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			apiRequest<void>(`/api/v1/vendors/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
			toast.success('Vendor removed')
		},
		onError: (error) => handleMutationError(error, 'Remove vendor'),
	})
}

export function useAssignVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({
			vendorId,
			maintenanceId,
		}: {
			vendorId: string
			maintenanceId: string
		}) =>
			apiRequest<{ id: string; vendor_id: string }>(
				`/api/v1/vendors/${vendorId}/assign/${maintenanceId}`,
				{ method: 'POST' },
			),
		onSuccess: (_data, { maintenanceId }) => {
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.detail(maintenanceId).queryKey,
			})
			toast.success('Vendor assigned to request')
		},
		onError: (error) => handleMutationError(error, 'Assign vendor'),
	})
}

export function useUnassignVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (maintenanceId: string) =>
			apiRequest<{ id: string; vendor_id: null }>(
				`/api/v1/vendors/unassign/${maintenanceId}`,
				{ method: 'DELETE' },
			),
		onSuccess: (_data, maintenanceId) => {
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.detail(maintenanceId).queryKey,
			})
			toast.success('Vendor unassigned')
		},
		onError: (error) => handleMutationError(error, 'Unassign vendor'),
	})
}
