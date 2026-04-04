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
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'
import { useEntityDetail } from '#hooks/use-entity-detail'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { sanitizeSearchInput } from '#lib/sanitize-search'
import type { Vendor, VendorFilters } from '#types/domain'
import { maintenanceQueries, vendorMutations } from './query-keys/maintenance-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

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
					const safe = sanitizeSearchInput(filters.search)
					if (safe) {
						q = q.ilike('name', `%${safe}%`)
					}
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
	return useEntityDetail<Vendor>({
		queryOptions: vendorKeys.detail(id),
		id
	})
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useCreateVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...vendorMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [vendorKeys.lists(), ownerDashboardKeys.all],
			successMessage: 'Vendor added successfully',
			errorContext: 'Add vendor'
		})
	})
}

export function useUpdateVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...vendorMutations.update(),
		...createMutationCallbacks<Vendor>(queryClient, {
			invalidate: [vendorKeys.lists(), ownerDashboardKeys.all],
			updateDetail: (vendor) => ({
				queryKey: vendorKeys.detail(vendor.id).queryKey,
				data: vendor
			}),
			successMessage: 'Vendor updated successfully',
			errorContext: 'Update vendor'
		})
	})
}

export function useDeleteVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...vendorMutations.delete(),
		...createMutationCallbacks(queryClient, {
			invalidate: [vendorKeys.lists(), ownerDashboardKeys.all],
			successMessage: 'Vendor removed',
			errorContext: 'Remove vendor'
		})
	})
}

/**
 * Assign a vendor to a maintenance request.
 * Sets vendor_id and transitions status to 'assigned' in a single PostgREST update.
 */
export function useAssignVendorMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		...vendorMutations.assign(),
		...createMutationCallbacks<
			void,
			{ vendorId: string; maintenanceId: string }
		>(queryClient, {
			invalidate: (vars) => [
				maintenanceQueries.detail(vars.maintenanceId).queryKey
			],
			successMessage: 'Vendor assigned to request',
			errorContext: 'Assign vendor'
		})
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
		...vendorMutations.unassign(),
		...createMutationCallbacks<void, string>(queryClient, {
			invalidate: (maintenanceId) => [
				maintenanceQueries.detail(maintenanceId).queryKey
			],
			successMessage: 'Vendor unassigned',
			errorContext: 'Unassign vendor'
		})
	})
}
