import { useQuery } from "@tanstack/react-query";
import { leaseQueries } from "./query-keys/lease-keys";

export function useLeaseList(params?: {
	status?: string;
	limit?: number;
	offset?: number;
}) {
	const { status, limit = 50, offset = 0 } = params || {};

	// No list->detail seeding: the list row shape (aliased embeds) is NOT a
	// superset of the detail queryFn shape, so seeding it fresh via setQueryData
	// would poison the detail cache with a shape its queryFn never returns.
	return useQuery({
		...leaseQueries.list({
			...(status && { status }),
			limit,
			offset,
		}),
		structuralSharing: true,
	});
}

export function useLeaseSignatureStatus(leaseId: string) {
	return useQuery(leaseQueries.signatureStatus(leaseId));
}

// Returns a short-lived signed URL minted from the tenant-documents bucket for
// the finalized signed PDF, or null when no signed document has been stored yet.
export function useSignedDocumentUrl(leaseId: string, enabled = true) {
	return useQuery(leaseQueries.signedDocument(leaseId, enabled));
}
