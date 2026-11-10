/**
 * @vitest-environment jsdom
 * The lease page heads a lease by its own embedded unit (66.2-39 fix round
 * 3, cycle 2, F52).
 *
 * The heading took its unit from `useUnitList()`, which holds only the 50
 * newest non-inactive units, so a lease on an owner's 51st-newest unit, or
 * on a deleted one, was headed by its property alone ("Maple Court"), the
 * same for every lease there. The detail query already embeds the unit, and
 * `leaseQueries.detail` maps it onto the lease (`LeaseDetailRow.unit`).
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { render } from "#test/utils/test-render";

vi.mock("#lib/supabase/client", async () => {
	const { DEFAULT_LEASE } = await import("#test/utils/test-data");
	/** The detail row as PostgREST returns it, with its unit embed. */
	const leaseRow = {
		...DEFAULT_LEASE,
		id: "lease-51",
		unit_id: "unit-51",
		tenants: null,
		units: {
			id: "unit-51",
			unit_number: "4B",
			bedrooms: 1,
			bathrooms: 1,
			square_feet: null,
			property_id: "property-1",
			properties: {
				name: "Maple Court",
				address_line1: "1 Maple Ave",
				city: "Austin",
				state: "TX",
			},
		},
	};
	return {
		createClient: () => ({
			from: () => createQueryChain({ data: leaseRow, error: null }),
		}),
	};
});
vi.mock("#hooks/api/use-lease-signature-mutations", () => ({
	useCancelSignatureRequestMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
}));
for (const [path, name] of [
	["../lease-details-tab", "LeaseDetailsTab"],
	["../lease-sidebar", "LeaseSidebar"],
	["../lease-terms-tab", "LeaseTermsTab"],
	["../lease-timeline-tab", "LeaseTimelineTab"],
	["#components/ledger/ledger-tab", "LedgerTab"],
	["#components/documents/documents-section", "DocumentsSection"],
	[
		"#components/leases/download-signed-lease-button",
		"DownloadSignedLeaseButton",
	],
	[
		"#components/leases/rent-increase-notice-dialog",
		"RentIncreaseNoticeDialog",
	],
	["#components/leases/send-for-signature-button", "SendForSignatureButton"],
	["#components/leases/sign-lease-button", "SignLeaseButton"],
] as const) {
	vi.doMock(path, () => ({ [name]: () => null }));
}

describe("the lease page's heading", () => {
	it("names the lease's unit from its own embed", async () => {
		const { LeaseDetails } = await import("../lease-details.client");
		render(<LeaseDetails id="lease-51" />);
		const heading = await screen.findByRole("heading", { level: 2 });
		expect(heading.textContent).toBe("Maple Court · Unit 4B");
	});
});
