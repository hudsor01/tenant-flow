/**
 * @vitest-environment jsdom
 * Billing history names each invoice's status by the four values
 * mapInvoiceStatus gives it (66.2-39 fix round 3, cycle 2, F61).
 *
 * The labels were keyed on Stripe's raw statuses (Draft, Open,
 * Uncollectible, Void) behind a ReadonlyMap<string, string>, but the row's
 * status is already mapped, so only "pending" reached them: the rest, and the
 * raw-status fallback, could never show. The labels are now typed by the
 * mapped status, so a raw-status key no longer compiles.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mapInvoiceStatus } from "#hooks/api/query-keys/billing-keys";
import { render } from "#test/utils/test-render";
import type { BillingHistoryItem } from "#types/api-contracts";

const STRIPE_STATUSES = ["paid", "open", "draft", "void", "uncollectible"];

const { history } = vi.hoisted(() => ({
	history: { current: [] as BillingHistoryItem[] },
}));
vi.mock("#hooks/api/use-billing", () => ({
	useBillingHistory: () => ({ data: history.current }),
}));
vi.mock("#hooks/api/use-billing-mutations", () => ({
	useBillingPortalMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { BillingHistorySection } from "#components/settings/sections/billing-history-section";

describe("billing history's status labels", () => {
	it("reads each Stripe status through the mapped label", () => {
		history.current = STRIPE_STATUSES.map((raw, index) => ({
			id: `in_${index}`,
			amount: 4900,
			currency: "usd",
			status: mapInvoiceStatus(raw),
			created_at: "2026-10-01T00:00:00Z",
			formattedAmount: "$49.00",
			formattedDate: `Oct ${index + 1}, 2026`,
			isSuccessful: raw === "paid",
			invoice_pdf: null,
			hosted_invoice_url: null,
		}));
		render(<BillingHistorySection />);
		expect(
			STRIPE_STATUSES.map(
				(_raw, index) =>
					screen.getByText(`Oct ${index + 1}, 2026`).closest("div.border")
						?.textContent,
			).map((text) => text?.match(/Paid|Pending|Cancelled|Failed/)?.[0]),
		).toEqual(["Paid", "Pending", "Pending", "Cancelled", "Failed"]);
		expect(document.body.textContent).not.toMatch(
			/Open|Draft|Void|Uncollectible/,
		);
	});
});
