'use client'

/**
 * Tenant Lease Hooks
 * Lease details, documents, and dashboard composite hook for tenant portal
 *
 * Split from use-tenant-portal.ts for 300-line compliance
 */

import {
	queryOptions,
	useQuery
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { DEFAULT_RETRY_ATTEMPTS } from '#shared/types/api-contracts'
import { tenantPortalKeys, resolveTenantId } from './use-tenant-portal-keys'

// ============================================================================
// TYPES
// ============================================================================

export interface TenantLease {
	id: string
	start_date: string
	end_date: string
	rent_amount: number
	security_deposit: number | null
	status: string
	lease_status: string
	stripe_subscription_id: string | null
	lease_document_url: string | null
	created_at: string
	owner_signed_at: string | null
	tenant_signed_at: string | null
	sent_for_signature_at: string | null
	unit: {
		id: string
		unit_number: string
		bedrooms: number
		bathrooms: number
		property: {
			id: string
			name: string
			address: string
			city: string
			state: string
			postal_code: string
		}
	} | null
	metadata: {
		documentUrl: string | null
	}
}

export interface TenantDocument {
	id: string
	type: 'LEASE' | 'RECEIPT'
	name: string
	url: string | null
	created_at: string | null
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const tenantLeaseQueries = {
	dashboard: () =>
		queryOptions({
			queryKey: tenantPortalKeys.dashboard(),
			queryFn: async () => {
				const supabase = createClient()

				// Use shared tenant ID resolution
				const tenantId = await resolveTenantId()
				if (!tenantId) return { lease: null, stats: {} }

				const { data, error } = await supabase
					.from('leases')
					.select(
						'id, start_date, end_date, rent_amount, lease_status, units!inner(unit_number, property_id, properties!inner(name, address_line1, city, state, postal_code)), lease_tenants!inner(tenant_id, responsibility_percentage)'
					)
					.eq('lease_tenants.tenant_id', tenantId)
					.eq('lease_status', 'active')
					.single()

				if (error && error.code !== 'PGRST116')
					handlePostgrestError(error, 'leases')

				return { lease: data, stats: {} }
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	lease: () =>
		queryOptions({
			queryKey: tenantPortalKeys.leases.all(),
			queryFn: async (): Promise<TenantLease | null> => {
				const supabase = createClient()

				// Use shared tenant ID resolution
				const tenantId = await resolveTenantId()
				if (!tenantId) return null

				const { data, error } = await supabase
					.from('leases')
					.select(
						'id, start_date, end_date, rent_amount, security_deposit, lease_status, stripe_subscription_id, lease_document_url, created_at, owner_signed_at, tenant_signed_at, sent_for_signature_at, units!inner(id, unit_number, bedrooms, bathrooms, properties!inner(id, name, address_line1, city, state, postal_code)), lease_tenants!inner(tenant_id)'
					)
					.eq('lease_tenants.tenant_id', tenantId)
					.eq('lease_status', 'active')
					.single()

				if (error) {
					if (error.code === 'PGRST116') return null
					handlePostgrestError(error, 'leases')
				}

				if (!data) return null

				const raw = data as {
					id: string
					start_date: string
					end_date: string
					rent_amount: number
					security_deposit: number | null
					lease_status: string
					stripe_subscription_id: string | null
					lease_document_url: string | null
					created_at: string
					owner_signed_at: string | null
					tenant_signed_at: string | null
					sent_for_signature_at: string | null
					units: Array<{
						id: string
						unit_number: string
						bedrooms: number
						bathrooms: number
						properties: Array<{
							id: string
							name: string
							address_line1: string
							city: string
							state: string
							postal_code: string
						}>
					}>
					lease_tenants: Array<{ tenant_id: string }>
				}

				const rawUnit = raw.units?.[0]
				const rawProperty = rawUnit?.properties?.[0]

				return {
					id: raw.id,
					start_date: raw.start_date,
					end_date: raw.end_date,
					rent_amount: raw.rent_amount,
					security_deposit: raw.security_deposit,
					status: raw.lease_status,
					lease_status: raw.lease_status,
					stripe_subscription_id: raw.stripe_subscription_id,
					lease_document_url: raw.lease_document_url,
					created_at: raw.created_at,
					owner_signed_at: raw.owner_signed_at,
					tenant_signed_at: raw.tenant_signed_at,
					sent_for_signature_at: raw.sent_for_signature_at,
					unit:
						rawUnit && rawProperty
							? {
									id: rawUnit.id,
									unit_number: rawUnit.unit_number,
									bedrooms: rawUnit.bedrooms,
									bathrooms: rawUnit.bathrooms,
									property: {
										id: rawProperty.id,
										name: rawProperty.name,
										address: rawProperty.address_line1,
										city: rawProperty.city,
										state: rawProperty.state,
										postal_code: rawProperty.postal_code
									}
								}
							: null,
					metadata: {
						documentUrl: raw.lease_document_url
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	documents: () =>
		queryOptions({
			queryKey: tenantPortalKeys.documents.all(),
			queryFn: async (): Promise<{ documents: TenantDocument[] }> => {
				const supabase = createClient()

				// Use shared tenant ID resolution
				const tenantId = await resolveTenantId()
				if (!tenantId) return { documents: [] }

				const { data, error } = await supabase
					.from('leases')
					.select('id, lease_document_url, created_at, lease_tenants!inner(tenant_id)')
					.eq('lease_tenants.tenant_id', tenantId)
					.eq('lease_status', 'active')
					.single()

				if (error) {
					if (error.code === 'PGRST116') return { documents: [] }
					handlePostgrestError(error, 'leases')
				}

				if (!data) return { documents: [] }

				const documents: TenantDocument[] = [
					{
						id: (data as Record<string, unknown>).id as string,
						type: 'LEASE',
						name: 'Lease Agreement',
						url: (data as Record<string, unknown>).lease_document_url as string | null,
						created_at: (data as Record<string, unknown>).created_at as string
					}
				]

				return { documents }
			},
			...QUERY_CACHE_TIMES.DETAIL,
			retry: DEFAULT_RETRY_ATTEMPTS
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useTenantLease() {
	return useQuery(tenantLeaseQueries.lease())
}

export function useTenantLeaseDocuments() {
	return useQuery(tenantLeaseQueries.documents())
}
