import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "#lib/frontend-logger";
import { handleMutationError } from "#lib/mutation-error-handler";

import { leaseQueries } from "./query-keys/lease-keys";
import { leaseMutations } from "./query-keys/lease-mutation-options";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";

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
			logger.info("Lease sent for signature", { leaseId });
		},
		onError: (err) => {
			handleMutationError(err, "Send lease for signature");
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
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
			logger.info("Lease signed by owner", { leaseId });
		},
		onError: (err) => {
			handleMutationError(err, "Sign lease");
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
