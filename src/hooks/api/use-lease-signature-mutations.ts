import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "#lib/frontend-logger";
import { handleMutationError } from "#lib/mutation-error-handler";

import { leaseQueries } from "./query-keys/lease-keys";
import { leaseMutations } from "./query-keys/lease-mutation-options";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import { PaywallError } from "./query-keys/report-keys";
import { unitQueries } from "./query-keys/unit-keys";
import { usageQueries } from "./query-keys/usage-keys";

/**
 * Over-cap e-sign send error handler. When the lease-signature edge fn returned
 * a 402 (Growth owner past the 25/month cap), the wrapper throws a PaywallError
 * carrying the upgrade_url — surface it as an actionable Upgrade toast CTA that
 * navigates to /billing/plans?source=esign_quota (keeping the Stripe checkout
 * source attribution). Any other error falls through to the shared handler.
 */
function handleSendSignatureError(err: unknown): void {
	if (err instanceof PaywallError) {
		toast.error("E-sign limit reached", {
			description: err.message,
			action: {
				label: "Upgrade",
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
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
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
