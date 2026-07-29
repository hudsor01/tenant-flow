/**
 * Lease Mutation Options
 * mutationOptions() factories for lease domain mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files.
 *
 * Covers CRUD + lifecycle (terminate, renew) + signature mutations.
 * Signature mutations call the lease-signature Edge Function.
 */

import { mutationOptions } from "@tanstack/react-query";
import { omitUndefined } from "#lib/db-insert";
import { formatLocalYmd } from "#lib/formatters/date";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { requireOwnerUserId } from "#lib/require-owner-user-id";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { LeaseCreate, LeaseUpdateInput } from "#lib/validation/leases";
import type { Lease } from "#types/core";
import { mutationKeys } from "../mutation-keys";
import { PaywallError } from "./report-keys";

/**
 * Calls the lease-signature Edge Function with an action payload.
 * Reads the caller's JWT from the current Supabase session.
 */
async function callLeaseSignatureEdgeFunction(
	action: string,
	payload: Record<string, unknown>,
): Promise<{ success: boolean }> {
	const supabase = createClient();
	const { data: sessionData } = await supabase.auth.getSession();
	const token = sessionData.session?.access_token;
	if (!token) throw new Error("Not authenticated");

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(`${baseUrl}/functions/v1/lease-signature`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ action, ...payload }),
	});

	if (!response.ok) {
		const error = (await response
			.json()
			.catch(() => ({ error: response.statusText }))) as {
			error?: string;
			upgrade_url?: string;
		};
		const message = error.error ?? "Signature request failed";
		// Over-cap e-sign metering block (402): the edge fn returns an actionable
		// `upgrade_url`. Preserve it via PaywallError so the send mutation surfaces
		// an Upgrade CTA instead of discarding the status + url into a bare toast
		// (RESEARCH Pitfall 4). Every other error keeps the plain-message behavior.
		if (typeof error.upgrade_url === "string") {
			throw new PaywallError(message, error.upgrade_url, "esign");
		}
		throw new Error(message);
	}

	return response.json();
}

export const leaseMutations = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.create,
			mutationFn: async (data: LeaseCreate): Promise<Lease> => {
				const supabase = createClient();
				const user = await getCachedUser();
				const ownerId = requireOwnerUserId(user?.id);

				// Omit tenant_ids (form-only field) before inserting into DB
				const { tenant_ids: _tenant_ids, ...leaseData } = data;

				const { data: created, error } = await supabase
					.from("leases")
					.insert(omitUndefined({ ...leaseData, owner_user_id: ownerId }))
					.select()
					.single();

				if (error) handlePostgrestError(error, "leases");

				return created;
			},
		}),

	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.update,
			mutationFn: async ({
				id,
				data,
			}: {
				id: string;
				data: LeaseUpdateInput;
			}): Promise<Lease> => {
				const supabase = createClient();
				// `leases` has no `version` column (only notification_settings does),
				// so nothing here optimistic-locks — send the real lease columns only.
				const payload = omitUndefined({ ...data });
				const { data: updated, error } = await supabase
					.from("leases")
					.update(payload)
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "leases");

				return updated;
			},
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient();
				// Soft-delete: set lease_status to inactive (financial record retention)
				const { error } = await supabase
					.from("leases")
					.update({ lease_status: "inactive" })
					.eq("id", id);

				if (error) handlePostgrestError(error, "leases");
			},
		}),

	/** Optimistic delete returns the ID for rollback */
	deleteOptimistic: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.delete,
			mutationFn: async (id: string): Promise<string> => {
				const supabase = createClient();
				const { error } = await supabase
					.from("leases")
					.update({ lease_status: "inactive" })
					.eq("id", id);

				if (error) handlePostgrestError(error, "leases");
				return id;
			},
		}),

	terminate: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.terminate,
			mutationFn: async (id: string): Promise<Lease> => {
				const supabase = createClient();
				const { data: updated, error } = await supabase
					.from("leases")
					.update({
						lease_status: "terminated",
						end_date: formatLocalYmd(new Date()),
					})
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "leases");

				return updated;
			},
		}),

	renew: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.renew,
			mutationFn: async ({
				id,
				data,
			}: {
				id: string;
				// rent_amount is an optional whole-dollar integer — persisted only
				// when the owner adjusted the rent on an unsigned lease (26-02).
				data: { end_date: string; rent_amount?: number };
			}): Promise<Lease> => {
				const supabase = createClient();
				// Only overwrite the stored rent when a positive, finite adjustment
				// was supplied; an absent/zero/NaN value must never clobber it.
				const hasRentAdjustment =
					typeof data.rent_amount === "number" &&
					Number.isFinite(data.rent_amount) &&
					data.rent_amount > 0;
				const { data: updated, error } = await supabase
					.from("leases")
					.update({
						end_date: data.end_date,
						lease_status: "active",
						...(hasRentAdjustment ? { rent_amount: data.rent_amount } : {}),
					})
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "leases");

				return updated;
			},
		}),

	// Signature mutations (lease-signature Edge Function)
	sendForSignature: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.sendForSignature,
			mutationFn: ({
				leaseId,
				message,
				missingFields,
			}: {
				leaseId: string;
				message?: string;
				missingFields: {
					immediate_family_members: string;
					landlord_notice_address: string;
				};
			}) =>
				callLeaseSignatureEdgeFunction("send", {
					leaseId,
					message,
					missingFields,
				}),
		}),

	signAsOwner: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.sign,
			// The owner agrees to the terms (checkbox) before this fires, so the
			// consent is transmitted + enforced server-side, matching the tenant path.
			mutationFn: (leaseId: string) =>
				callLeaseSignatureEdgeFunction("sign-owner", {
					leaseId,
					consent: true,
				}),
		}),

	cancelSignature: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.cancelSignature,
			mutationFn: (leaseId: string) =>
				callLeaseSignatureEdgeFunction("cancel", { leaseId }),
		}),

	// Idempotent owner-triggered re-render/upload + one-time tenant email. Heals
	// a transient finalize failure without re-signing (SIGN-02).
	finalizeSignature: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.finalizeSignature,
			mutationFn: (leaseId: string) =>
				callLeaseSignatureEdgeFunction("finalize", { leaseId }),
		}),

	resendSignature: () =>
		mutationOptions({
			mutationKey: mutationKeys.leases.resendSignature,
			mutationFn: ({
				leaseId,
				message,
			}: {
				leaseId: string;
				message?: string;
			}) => callLeaseSignatureEdgeFunction("resend", { leaseId, message }),
		}),
};
