import { usePrefetchQuery, useQuery } from "@tanstack/react-query";
import { useEntityDetail } from "#hooks/use-entity-detail";
import type { Lease } from "#types/core";
import { leaseQueries } from "./query-keys/lease-keys";

// Uses placeholderData from list cache for instant detail view
export function useLease(id: string) {
	return useEntityDetail<Lease>({
		queryOptions: leaseQueries.detail(id),
		listQueryKey: leaseQueries.lists(),
		id,
	});
}

export function useLeaseList(params?: {
	status?: string;
	limit?: number;
	offset?: number;
}) {
	const { status, limit = 50, offset = 0 } = params || {};

	// No list->detail seeding: the list row shape (aliased embeds) is NOT a
	// superset of the detail queryFn shape, so seeding it fresh via setQueryData
	// poisons the detail cache. useLease() already gets instant paint via
	// useEntityDetail's list-cache placeholderData (which does NOT mark fresh),
	// so the real detail queryFn still fetches the embed-carrying shape.
	return useQuery({
		...leaseQueries.list({
			...(status && { status }),
			limit,
			offset,
		}),
		structuralSharing: true,
	});
}

export function useExpiringLeases(daysUntilExpiry: number = 30) {
	return useQuery(leaseQueries.expiring(daysUntilExpiry));
}

export function useLeaseStats() {
	return useQuery(leaseQueries.stats());
}

// Declarative prefetch on mount. For hover/imperative prefetch, call queryClient.prefetchQuery directly.
export function usePrefetchLeaseDetail(id: string) {
	usePrefetchQuery(leaseQueries.detail(id));
}

export function useLeaseSignatureStatus(leaseId: string) {
	return useQuery(leaseQueries.signatureStatus(leaseId));
}

// Returns a short-lived signed URL minted from the tenant-documents bucket for
// the finalized signed PDF, or null when no signed document has been stored yet.
export function useSignedDocumentUrl(leaseId: string, enabled = true) {
	return useQuery(leaseQueries.signedDocument(leaseId, enabled));
}
