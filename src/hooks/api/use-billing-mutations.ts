/**
 * Billing & Subscription Mutation Hooks
 * TanStack Query mutation hooks for billing and subscription management
 *
 * Split from use-billing.ts for the 300-line file size rule.
 * Query hooks remain in use-billing.ts.
 *
 * Cancel/Reactivate mutations (Phase 42) call the dedicated
 * `stripe-cancel-subscription` Edge Function directly and mutate the
 * subscription-status cache using Stripe's authoritative response
 * (mitigates T-42-06: Stripe Sync Engine FDW staleness).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { handleMutationError } from "#lib/mutation-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { SubscriptionStatusResponse } from "#types/api-contracts";
import { mutationKeys } from "./mutation-keys";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import { subscriptionStatusKey } from "./query-keys/subscription-keys";

export interface CancelSubscriptionResponse {
	id: string;
	status: string;
	cancel_at_period_end: boolean;
	current_period_end: number;
}

async function callStripeCancelSubscription(
	action: "cancel" | "reactivate",
): Promise<CancelSubscriptionResponse> {
	const user = await getCachedUser();
	if (!user) throw new Error("Not authenticated");

	const supabase = createClient();
	const { data: sessionData } = await supabase.auth.getSession();
	const token = sessionData.session?.access_token;
	if (!token) throw new Error("No session token");

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(
		`${baseUrl}/functions/v1/stripe-cancel-subscription`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ action }),
		},
	);

	if (!response.ok) {
		const err = (await response
			.json()
			.catch(() => ({ error: response.statusText }))) as {
			error?: string;
		};
		throw new Error(
			err.error ?? `stripe-cancel-subscription failed: ${response.status}`,
		);
	}

	return response.json() as Promise<CancelSubscriptionResponse>;
}

// Map Edge Function response → SubscriptionStatusResponse shape used by useSubscriptionStatus
function mapCancelResponseToStatus(
	response: CancelSubscriptionResponse,
): Partial<SubscriptionStatusResponse> {
	return {
		subscriptionStatus:
			response.status as SubscriptionStatusResponse["subscriptionStatus"],
		// current_period_end may be absent/NaN if an edge fn is not yet
		// redeployed post-basil (the field moved onto the subscription item).
		// Guard with Number.isFinite — 0 is falsy but a valid epoch is huge, so a
		// truthy check would wrongly reject 0; map non-finite values to null
		// instead of letting new Date(NaN).toISOString() throw a RangeError.
		currentPeriodEnd: Number.isFinite(response.current_period_end)
			? new Date(response.current_period_end * 1000).toISOString()
			: null,
		cancelAtPeriodEnd: response.cancel_at_period_end,
	};
}

/**
 * Writes the Edge Function response into the subscription-status cache using
 * Stripe's authoritative data, BEFORE invalidation fires. Mitigates T-42-06
 * (Stripe Sync Engine FDW staleness) — without this, invalidateQueries would
 * re-fetch stale FDW data and the UI would not flip.
 */
function writeSubscriptionStatusCache(
	queryClient: ReturnType<typeof useQueryClient>,
	response: CancelSubscriptionResponse,
): void {
	const existing = queryClient.getQueryData<SubscriptionStatusResponse>(
		subscriptionStatusKey,
	);
	queryClient.setQueryData<SubscriptionStatusResponse>(subscriptionStatusKey, {
		...(existing ?? {
			subscriptionStatus: null,
			stripeCustomerId: null,
			stripePriceId: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
			trialEndsAt: null,
		}),
		...mapCancelResponseToStatus(response),
	});
}

export function useCancelSubscriptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.subscriptions.cancel,
		mutationFn: () => callStripeCancelSubscription("cancel"),
		onSuccess: (response) => {
			// Seed cache with Stripe's authoritative response BEFORE invalidation so the UI
			// flips instantly, regardless of FDW sync lag. We cannot use createMutationCallbacks
			// here because that factory replaces onSuccess rather than merging — we would lose
			// this setQueryData call.
			writeSubscriptionStatusCache(queryClient, response);
			queryClient.invalidateQueries({ queryKey: subscriptionStatusKey });
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
		},
		// FORMFIX-08: the built-in owns the single error toast; carry the friendly
		// fallback message here so the sole consumer needn't add its own onError.
		onError: (error) =>
			handleMutationError(
				error,
				"Cancel subscription",
				"Couldn't cancel your subscription. Please try again or contact support.",
			),
	});
}

export function useReactivateSubscriptionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: mutationKeys.subscriptions.reactivate,
		mutationFn: () => callStripeCancelSubscription("reactivate"),
		onSuccess: (response) => {
			// Seed cache with Stripe response before invalidation (matches cancel mutation).
			writeSubscriptionStatusCache(queryClient, response);
			queryClient.invalidateQueries({ queryKey: subscriptionStatusKey });
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
		},
		// FORMFIX-08: the built-in owns the single error toast; carry the friendly
		// fallback message here so the sole consumer needn't add its own onError.
		onError: (error) =>
			handleMutationError(
				error,
				"Reactivate subscription",
				"Couldn't reactivate. Please try again.",
			),
	});
}

/**
 * Opens the Stripe Customer Portal for subscription management.
 * Redirects the user to Stripe's hosted portal via full-page redirect.
 * Return URL is /dashboard?billing=updated (handled by dashboard return-journey toast).
 *
 * Note: This mutation uses an inline key because it is not covered by billingMutations
 * (it is a portal redirect, not a subscription CRUD operation).
 */
export function useBillingPortalMutation() {
	return useMutation({
		mutationKey: ["mutations", "billing", "portal"] as const,
		mutationFn: async () => {
			const user = await getCachedUser();
			if (!user) throw new Error("Not authenticated");

			const supabase = createClient();
			const { data: sessionData } = await supabase.auth.getSession();
			const token = sessionData.session?.access_token;
			if (!token) throw new Error("No session token");

			const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const response = await fetch(
				`${baseUrl}/functions/v1/stripe-billing-portal`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);

			if (!response.ok) {
				const err = await response
					.json()
					.catch(() => ({ error: response.statusText }));
				throw new Error(
					(err as { error?: string }).error ??
						`stripe-billing-portal failed: ${response.status}`,
				);
			}

			const result = (await response.json()) as { url: string };
			window.location.href = result.url;
			return result;
		},
		onError: (error) => handleMutationError(error, "Open billing portal"),
	});
}
