/**
 * usePendingMutations Hook
 * TanStack Query v5 pattern for tracking mutation state globally
 *
 * Uses useMutationState to provide:
 * - Count of pending mutations
 * - List of pending mutation operations
 * - Loading indicator state
 */

import { useMutationState } from '@tanstack/react-query'
import { isMutationKey } from './mutation-keys'

// ============================================================================
// TYPES
// ============================================================================

interface MutationInfo {
	key: readonly string[]
	domain: string
	operation: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract human-readable info from mutation key
 * Key format: ['mutations', 'domain', 'operation']
 */
function describeMutation(key: readonly unknown[]): MutationInfo {
	const [, domain, operation] = key as string[]
	return {
		key: key as readonly string[],
		domain: domain ?? 'unknown',
		operation: operation ?? 'unknown'
	}
}

/**
 * Format mutation operation for display
 * e.g., "create properties" -> "Creating property..."
 */
function formatOperation(domain: string, operation: string): string {
	const domainSingular = domain.replace(/s$/, '')
	const operationMap: Record<string, string> = {
		create: `Creating ${domainSingular}`,
		update: `Updating ${domainSingular}`,
		delete: `Deleting ${domainSingular}`,
		invite: 'Sending invitation',
		resendInvite: 'Resending invitation',
		cancelInvite: 'Cancelling invitation',
		markMovedOut: 'Moving out tenant',
		sign: 'Signing lease',
		sendForSignature: 'Sending for signature',
		terminate: 'Terminating lease',
		renew: 'Renewing lease',
		complete: 'Completing request',
		assign: 'Assigning request',
		uploadImage: 'Uploading image',
		deleteImage: 'Deleting image'
	}
	return operationMap[operation] ?? `${operation} ${domainSingular}`
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Track all pending mutations across the application
 *
 * @returns Object with:
 * - mutations: Array of pending mutation info
 * - count: Number of pending mutations
 * - isPending: Boolean if any mutations are pending
 * - operations: Human-readable operation descriptions
 */
export function usePendingMutations() {
	const pendingMutations = useMutationState({
		filters: { status: 'pending' },
		select: mutation => {
			const key = mutation.options.mutationKey
			if (!key || !isMutationKey(key)) {
				return null
			}
			return describeMutation(key)
		}
	})

	// Filter out nulls (mutations without keys)
	const mutations = pendingMutations.filter(
		(m): m is MutationInfo => m !== null
	)

	return {
		mutations,
		count: mutations.length,
		isPending: mutations.length > 0,
		operations: mutations.map(m => formatOperation(m.domain, m.operation))
	}
}