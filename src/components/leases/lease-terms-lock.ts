import type { Lease } from "#types/core";

/**
 * A lease's financial terms are locked once it has been sent out for tenant
 * signature (`lease_status === "pending_signature"`) or the tenant has already
 * signed (`tenant_signed_at` set).
 *
 * The server-side BEFORE UPDATE trigger from plan 26-06
 * (`reject_signed_lease_term_edits`) rejects any financial-term column edit in
 * that state. This shared helper lets the UI mirror the same condition (renew
 * dialog rent adjustment in 26-02, edit-lease gate in 26-07) so owners are
 * never led into a server-rejected write.
 */
export function isLeaseTermsLocked(
	lease: Pick<Lease, "lease_status" | "tenant_signed_at">,
): boolean {
	return (
		lease.lease_status === "pending_signature" || lease.tenant_signed_at != null
	);
}
