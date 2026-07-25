"use client";

/**
 * Rent-ledger hooks (LEDGER-02/03/04/05/06) — the only surface the ledger UI
 * touches. Query keys, typed RPC mappers, and mutation options live in
 * `query-keys/rent-ledger-keys.ts` and `query-keys/rent-ledger-mutation-options.ts`;
 * these are thin wrappers over those factories.
 *
 * INVALIDATION FANOUT: every mutation invalidates `rentLedgerKeys.forLease(id)`
 * (the summary + entry stream for the lease being edited) AND
 * `ownerDashboardKeys.all` — the collection-rate KPI and the revenue
 * scheduled/collected split are derived from ledger receipts, so a recorded
 * payment must not leave a stale dashboard behind.
 *
 * APPEND-ONLY (D-06): nothing here does an optimistic edit or rollback. A ledger
 * write only ever APPENDS a row, and a correction appends an offsetting row, so
 * there is no prior value to restore. The single success toast is fired by
 * `createMutationCallbacks` — dialogs must not toast again.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import { leaseQueries } from "./query-keys/lease-keys";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";
import {
	rentLedgerKeys,
	rentLedgerQueries,
} from "./query-keys/rent-ledger-keys";
import { rentLedgerMutations } from "./query-keys/rent-ledger-mutation-options";

/** Derived balance-strip figures for one lease (dollars). */
export function useLedgerSummary(leaseId: string) {
	return useQuery(rentLedgerQueries.summary(leaseId));
}

/**
 * Chronological charge + receipt stream for one lease. The running balance and
 * the paid/partial/unpaid/late badges are derived from this by `ledger-math`
 * (55-03) at render time, not stored.
 */
export function useLedgerEntries(leaseId: string) {
	return useQuery(rentLedgerQueries.entries(leaseId));
}

export function useRecordReceiptMutation(leaseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...rentLedgerMutations.recordReceipt(),
		...createMutationCallbacks(queryClient, {
			invalidate: [rentLedgerKeys.forLease(leaseId), ownerDashboardKeys.all],
			successMessage: "Payment recorded",
			errorContext: "Record payment",
		}),
	});
}

export function useAddLineMutation(leaseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...rentLedgerMutations.addLine(),
		...createMutationCallbacks(queryClient, {
			invalidate: [rentLedgerKeys.forLease(leaseId), ownerDashboardKeys.all],
			successMessage: "Line added",
			errorContext: "Add ledger line",
		}),
	});
}

export function useStartTrackingMutation(leaseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...rentLedgerMutations.startTracking(),
		...createMutationCallbacks(queryClient, {
			// `start_lease_ledger` also writes `leases.ledger_start_date`, which is
			// what the ledger tab reads to decide between the empty state and the
			// ledger itself — without the lease keys here the tab would keep showing
			// "No rent ledger yet" until the lease cache went stale on its own.
			invalidate: [
				rentLedgerKeys.forLease(leaseId),
				ownerDashboardKeys.all,
				leaseQueries.all(),
			],
			successMessage: "Rent tracking started",
			errorContext: "Start rent tracking",
		}),
	});
}

export function useReverseEntryMutation(leaseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		...rentLedgerMutations.reverseEntry(),
		...createMutationCallbacks(queryClient, {
			invalidate: [rentLedgerKeys.forLease(leaseId), ownerDashboardKeys.all],
			successMessage: "Entry reversed",
			errorContext: "Reverse entry",
		}),
	});
}
