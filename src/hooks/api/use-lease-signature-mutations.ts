import {
	type QueryClient,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "#lib/frontend-logger";
import {
	handleMutationError,
	PAYWALL_BILLING_TOAST,
	userFacingErrorMessage,
} from "#lib/mutation-error-handler";

import { documentQueries } from "./query-keys/document-keys";
import { documentSearchQueries } from "./query-keys/document-search-keys";
import { leaseQueries } from "./query-keys/lease-keys";
import { leaseMutations } from "./query-keys/lease-mutation-options";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import { PaywallError } from "./query-keys/report-keys";
import { unitQueries } from "./query-keys/unit-keys";
import { usageQueries } from "./query-keys/usage-keys";

/**
 * E-sign send 402 handler. The lease-signature edge fn returns a 402 for its
 * tier gate or its monthly meter, and the wrapper throws a PaywallError
 * carrying the upgrade_url; surface it as an actionable toast CTA that keeps
 * the URL's checkout source attribution. The title follows the 402's reason:
 * the meter's (no reason: a Growth owner past the 25/month cap) is "E-sign
 * limit reached"; the gate's `plan` (a plan without e-sign) is "Upgrade
 * required", since no limit was reached; its `subscription_inactive` (Growth
 * or Max, the subscription not active) opens Billing Settings, not a plan
 * (66.2-39 fix round 4, Part 8n). Any other error falls through to the shared
 * handler.
 */
function handleSendSignatureError(err: unknown): void {
	if (err instanceof PaywallError) {
		const copy =
			err.reason === "subscription_inactive"
				? PAYWALL_BILLING_TOAST
				: {
						title:
							err.reason === "plan"
								? "Upgrade required"
								: "E-sign limit reached",
						action: "Upgrade",
					};
		toast.error(copy.title, {
			description: userFacingErrorMessage(err),
			action: {
				label: copy.action,
				onClick: () => {
					window.location.assign(err.upgradeUrl);
				},
			},
		});
		return;
	}
	handleMutationError(err, "Send lease for signature");
}

export function useSendLeaseForSignatureMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.sendForSignature(),
		onSuccess: (_result, { leaseId }) => {
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey,
			});
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() });
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
			// A metered send consumes one of the owner's monthly e-sign slots
			// (Plan 01 RPC). Refresh the Settings usage widget so the new count
			// is reflected immediately. Wired here (wave 3) rather than in Plan
			// 02 (wave 2) because usageQueries did not exist yet — importing it
			// keeps this a factory key, not a string literal (CLAUDE.md rule 9).
			queryClient.invalidateQueries({
				queryKey: usageQueries.esign().queryKey,
			});
			logger.info("Lease sent for signature", { leaseId });
		},
		onError: (err) => {
			handleSendSignatureError(err);
		},
	});
}

/**
 * Signing completes when finalize writes leases.signed_document_path, and the
 * trg_file_signed_lease_in_vault trigger files the executed PDF in the vault in
 * that same statement. Refresh the lease's Documents card and the vault search
 * (both cached for 45 minutes and persisted) so the filed copy shows at once,
 * and the dashboard, whose recent activity gains the "Signed lease filed" row.
 */
export function invalidateSignedLeaseVaultCopy(
	queryClient: QueryClient,
	leaseId: string,
): void {
	queryClient.invalidateQueries({
		queryKey: documentQueries.list({ entityType: "lease", entityId: leaseId })
			.queryKey,
	});
	queryClient.invalidateQueries({ queryKey: documentSearchQueries.all() });
	queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
}

export function useSignLeaseAsOwnerMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.signAsOwner(),
		onSuccess: (_result, leaseId) => {
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey,
			});
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() });
			// Owner-signing can complete signing and ACTIVATE the lease, which
			// occupies the unit — refresh the units views (incl. by-property).
			queryClient.invalidateQueries({ queryKey: unitQueries.all() });
			// Also refreshes the dashboard. The response does not say whether this
			// was the second signature; when it was, finalize has already filed the
			// signed copy.
			invalidateSignedLeaseVaultCopy(queryClient, leaseId);
			logger.info("Lease signed by owner", { leaseId });
		},
		onError: (err) => {
			handleMutationError(err, "Sign lease");
		},
	});
}

// Idempotent owner-triggered heal for a stuck finalize (SIGN-02): re-renders +
// re-uploads the signed PDF and re-attempts the one-time tenant email. Safe to
// re-run; the edge action no-ops unless the lease is fully signed with an
// outstanding PDF pointer or tenant email.
export function useFinalizeSignedLeaseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.finalizeSignature(),
		onSuccess: (_result, leaseId) => {
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signedDocument(leaseId).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey,
			});
			invalidateSignedLeaseVaultCopy(queryClient, leaseId);
		},
		onError: (err) => {
			handleMutationError(err, "Finalize signed lease");
		},
	});
}

// Revokes the tenant signing token and reverts the lease to draft.
export function useCancelSignatureRequestMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.cancelSignature(),
		onSuccess: (_result, leaseId) => {
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey,
			});
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() });
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
			logger.info("Signature request cancelled", { leaseId });
		},
		onError: (err) => {
			handleMutationError(err, "Cancel signature request");
		},
	});
}

export function useResendSignatureRequestMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		...leaseMutations.resendSignature(),
		onSuccess: (_result, { leaseId }) => {
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(leaseId).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: leaseQueries.signatureStatus(leaseId).queryKey,
			});
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() });
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
			logger.info("Signature request resent", { leaseId });
		},
		onError: (err) => {
			handleMutationError(err, "Resend signature request");
		},
	});
}
