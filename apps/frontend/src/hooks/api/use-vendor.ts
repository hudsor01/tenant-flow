'use client'

/**
 * Vendor Hooks
 * TanStack Query hooks for vendor/contractor data fetching and mutations
 * React 19 + TanStack Query v5 patterns
 *
 * All queryFns use supabase.from('vendors') — no apiRequest calls.
 * RLS enforces owner_user_id = auth.uid() on every query.
 */

import { useMutation, useQuery, useQueryClient, queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { maintenanceQueries } from './query-keys/maintenance-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'
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

// Explicit column list for vendor queries — no select('*')
const VENDOR_SELECT_COLUMNS =
	'id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at'

// ============================================================================
// QUERY KEYS & OPTIONS
// ============================================================================

export const vendorKeys = {
	all: ['vendors'] as const,
	lists: () => [...vendorKeys.all, 'list'] as const,
	list: (filters?: VendorFilters) =>
		queryOptions({
			queryKey: [...vendorKeys.lists(), filters ?? {}],
			queryFn: async (): Promise<VendorListResponse> => {
				const supabase = createClient()
				const limit = filters?.limit ?? 50
				const offset = filters?.offset ?? 0

				let q = supabase
					.from('vendors')
					.select(VENDOR_SELECT_COLUMNS, { count: 'exact' })
					.eq('status', filters?.status ?? 'active')
					.order('name', { ascending: true })

				if (filters?.trade) {
					q = q.eq('trade', filters.trade)
				}
				if (filters?.search) {
					q = q.ilike('name', `%${filters.search}%`)
				}

				q = q.range(offset, offset + limit - 1)

				const { data, error, count } = await q

				if (error) handlePostgrestError(error, 'vendors')

				return {
					data: (data as Vendor[]) ?? [],
					total: count ?? 0,
					limit,
					offset
				}
			},
			staleTime: 5 * 60 * 1000
		}),
	details: () => [...vendorKeys.all, 'detail'] as const,
	detail: (id: string) =>
		queryOptions({
			queryKey: [...vendorKeys.details(), id],
			queryFn: async (): Promise<Vendor> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('vendors')
					.select(VENDOR_SELECT_COLUMNS)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'vendors')

				return data as Vendor
			},
			staleTime: 5 * 60 * 1000,
			enabled: !!id
		})
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
		mutationFn: async (data: VendorCreateInput): Promise<Vendor> => {
			const supabase = createClient()
			const { data: { user } } = await supabase.auth.getUser()
			const userId = user?.id

			const { data: created, error } = await supabase
				.from('vendors')
				.insert({ ...data, owner_user_id: userId })
				.select(VENDOR_SELECT_COLUMNS)
				.single()

			if (error) handlePostgrestError(error, 'vendors')

			return created as Vendor
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Vendor added successfully')
		},
		onError: (error) => handleMutationError(error, 'Add vendor')
	})
}

export function useUpdateVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: VendorUpdateInput }): Promise<Vendor> => {
			const supabase = createClient()
			const { data: updated, error } = await supabase
				.from('vendors')
				.update(data)
				.eq('id', id)
				.select(VENDOR_SELECT_COLUMNS)
				.single()

			if (error) handlePostgrestError(error, 'vendors')

			return updated as Vendor
		},
		onSuccess: (vendor) => {
			queryClient.setQueryData(vendorKeys.detail(vendor.id).queryKey, vendor)
			queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Vendor updated successfully')
		},
		onError: (error) => handleMutationError(error, 'Update vendor')
	})
}

export function useDeleteVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		// Hard delete — no financial retention requirement for vendor records
		mutationFn: async (id: string): Promise<void> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('vendors')
				.delete()
				.eq('id', id)

			if (error) handlePostgrestError(error, 'vendors')
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Vendor removed')
		},
		onError: (error) => handleMutationError(error, 'Remove vendor')
	})
}

/**
 * Assign a vendor to a maintenance request.
 * Sets vendor_id and transitions status to 'assigned' in a single PostgREST update.
 */
export function useAssignVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({
			vendorId,
			maintenanceId
		}: {
			vendorId: string
			maintenanceId: string
		}): Promise<void> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('maintenance_requests')
				.update({ vendor_id: vendorId, status: 'assigned' })
				.eq('id', maintenanceId)

			if (error) handlePostgrestError(error, 'maintenance_requests')
		},
		onSuccess: (_data, { maintenanceId }) => {
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.detail(maintenanceId).queryKey
			})
			toast.success('Vendor assigned to request')
		},
		onError: (error) => handleMutationError(error, 'Assign vendor')
	})
}

/**
 * Unassign a vendor from a maintenance request.
 * Sets vendor_id to null and transitions status to 'needs_reassignment'
 * to preserve audit trail — does NOT revert to 'open'.
 */
export function useUnassignVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (maintenanceId: string): Promise<void> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('maintenance_requests')
				.update({ vendor_id: null, status: 'needs_reassignment' })
				.eq('id', maintenanceId)

			if (error) handlePostgrestError(error, 'maintenance_requests')
		},
		onSuccess: (_data, maintenanceId) => {
			queryClient.invalidateQueries({
				queryKey: maintenanceQueries.detail(maintenanceId).queryKey
			})
			toast.success('Vendor unassigned')
		},
		onError: (error) => handleMutationError(error, 'Unassign vendor')
	})
}
