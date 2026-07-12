import { queryOptions } from "@tanstack/react-query";
import { createLogger } from "#lib/frontend-logger";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { BillingHistoryItem } from "#types/api-contracts";

const logger = createLogger({ component: "BillingKeys" });

const billingKeys = {
	all: ["billing"] as const,
	history: () => [...billingKeys.all, "history"] as const,
};

// Typed mapper at the RPC boundary (CLAUDE.md mapper rule): `get_user_invoices`
// passes stripe.invoices.status through verbatim, so map every DB-observable
// Stripe status into the 4-value UI union instead of casting. Unknown values
// fall to "pending" with a warning rather than throwing the whole history query
// for one odd row.
export function mapInvoiceStatus(raw: string): BillingHistoryItem["status"] {
	switch (raw) {
		case "paid":
			return "succeeded";
		case "open":
		case "draft":
			return "pending";
		case "void":
			return "cancelled";
		case "uncollectible":
			return "failed";
		default:
			logger.warn("Unknown Stripe invoice status; defaulting to pending", {
				status: raw,
			});
			return "pending";
	}
}

// Billing data is the landlord's own TenantFlow SaaS invoices, proxied via
// public.get_user_invoices RPC which reads stripe.invoices through the
// Supabase Stripe Foreign Data Wrapper (see
// 20260528223546_install_stripe_wrapper.sql).
//
// Legacy `invoices()` / `failed()` / `historyBySubscription()` /
// `failedBySubscription()` factories were deleted as part of post-#749
// cleanup -- they queried the demolished public.rent_payments table and
// had no live consumers anywhere (see cycle-1 review BL-1).
export const billingQueries = {
	history: () =>
		queryOptions({
			queryKey: billingKeys.history(),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { data, error } = await supabase.rpc("get_user_invoices", {
					p_limit: 50,
				});
				if (error) handlePostgrestError(error, "billing.history");
				return (data ?? []).map((row): BillingHistoryItem => {
					// An unpaid invoice has amount_paid = 0, which would win over the
					// real amount_due under a plain `??`. Show amount_due unless paid.
					const amount =
						row.status === "paid"
							? Number(row.amount_paid)
							: Number(row.amount_due ?? row.amount_paid ?? 0);
					return {
						id: row.invoice_id,
						amount,
						currency: "USD",
						status: mapInvoiceStatus(row.status),
						created_at: row.created_at,
						formattedAmount: `$${amount.toFixed(2)}`,
						formattedDate: new Date(row.created_at).toLocaleDateString(),
						isSuccessful: row.status === "paid",
						invoice_pdf: row.invoice_pdf ?? null,
						hosted_invoice_url: row.hosted_invoice_url ?? null,
					};
				});
			},
			staleTime: 60 * 1000,
		}),
};
