/**
 * Lease Mutation Options
 * mutationOptions() factories for lease domain mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files.
 *
 * Covers CRUD + lifecycle (terminate, renew) + signature mutations.
 * Signature mutations call the docuseal Edge Function.
 */

import { mutationOptions } from '@tanstack/react-query'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import type { Lease } from '#types/core'
import type { LeaseCreate, LeaseUpdate } from '#lib/validation/leases'
import { mutationKeys } from '../mutation-keys'

// ============================================================================
// EDGE FUNCTION HELPER (for signature mutations)
// ============================================================================

/**
 * Calls the docuseal Edge Function with an action payload.
 * Reads the caller's JWT from the current Supabase session.
 */
async function callDocuSealEdgeFunction(
	action: string,
	payload: Record<string, unknown>
): Promise<{ success: boolean }> {
	const supabase = createClient()
	const { data: sessionData } = await supabase.auth.getSession()
	const token = sessionData.session?.access_token
	if (!token) throw new Error('Not authenticated')

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(`${baseUrl}/functions/v1/docuseal`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ action, ...payload })
	})

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: response.statusText }))
		throw new Error(
			(error as { error?: string }).error ?? 'DocuSeal request failed'
		)
	}

	return response.json()
}

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const leaseMutations = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.create,
			mutationFn: async (data: LeaseCreate): Promise<Lease> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				// Omit tenant_ids (form-only field) before inserting into DB
				const { tenant_ids: _tenant_ids, ...leaseData } = data

				const { data: created, error } = await supabase
					.from('leases')
					.insert({ ...leaseData, owner_user_id: ownerId })
					.select()
					.single()

				if (error) handlePostgrestError(error, 'leases')

				return created as unknown as Lease
			}
		}),

	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.update,
			mutationFn: async ({
				id,
				data,
				version
			}: {
				id: string
				data: LeaseUpdate
				version?: number
			}): Promise<Lease> => {
				const supabase = createClient()
				const payload = version ? { ...data, version } : { ...data }
				const { data: updated, error } = await supabase
					.from('leases')
					.update(payload)
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'leases')

				return updated as unknown as Lease
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				// Soft-delete: set lease_status to inactive (financial record retention)
				const { error } = await supabase
					.from('leases')
					.update({ lease_status: 'inactive' })
					.eq('id', id)

				if (error) handlePostgrestError(error, 'leases')
			}
		}),

	/** Optimistic delete returns the ID for rollback */
	deleteOptimistic: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.delete,
			mutationFn: async (id: string): Promise<string> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('leases')
					.update({ lease_status: 'inactive' })
					.eq('id', id)

				if (error) handlePostgrestError(error, 'leases')
				return id
			}
		}),

	terminate: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.terminate,
			mutationFn: async (id: string): Promise<Lease> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('leases')
					.update({
						lease_status: 'terminated',
						end_date: new Date().toISOString()
					})
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'leases')

				return updated as unknown as Lease
			}
		}),

	renew: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.renew,
			mutationFn: async ({
				id,
				data
			}: {
				id: string
				data: { end_date: string }
			}): Promise<Lease> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('leases')
					.update({ end_date: data.end_date, lease_status: 'active' })
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'leases')

				return updated as unknown as Lease
			}
		}),

	// Signature mutations (DocuSeal Edge Function)
	sendForSignature: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.sendForSignature,
			mutationFn: ({
				leaseId,
				message,
				missingFields
			}: {
				leaseId: string
				message?: string
				missingFields: {
					immediate_family_members: string
					landlord_notice_address: string
				}
			}) =>
				callDocuSealEdgeFunction('send-for-signature', {
					leaseId,
					message,
					missingFields
				})
		}),

	signAsOwner: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.sign,
			mutationFn: (leaseId: string) =>
				callDocuSealEdgeFunction('sign-owner', { leaseId })
		}),

	signAsTenant: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.sign,
			mutationFn: (leaseId: string) =>
				callDocuSealEdgeFunction('sign-tenant', { leaseId })
		}),

	cancelSignature: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.cancelSignature,
			mutationFn: (leaseId: string) =>
				callDocuSealEdgeFunction('cancel', { leaseId })
		}),

	resendSignature: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.resendSignature,
			mutationFn: ({
				leaseId,
				message
			}: {
				leaseId: string
				message?: string
			}) => callDocuSealEdgeFunction('resend', { leaseId, message })
		})
}
