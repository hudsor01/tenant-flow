/**
 * @vitest-environment jsdom
 * The lease page heads a lease by its own embedded unit (66.2-39 fix round
 * 3, cycle 2, F52).
 *
 * The heading took its unit from `useUnitList()`, which holds only the 50
 * newest non-inactive units, so a lease on an owner's 51st-newest unit, or
 * on a deleted one, was headed by its property alone ("Maple Court"), the
 * same for every lease there. The detail query already embeds the unit.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

const LEASE = {
	...DEFAULT_LEASE,
	id: "lease-51",
	unit_id: "unit-51",
	units: {
		id: "unit-51",
		unit_number: "4B",
		properties: {
			name: "Maple Court",
			address_line1: "1 Maple Ave",
			city: "Austin",
			state: "TX",
		},
	},
};

vi.mock("#hooks/api/query-keys/lease-keys", () => ({
	leaseQueries: {
		detail: () => ({
			queryKey: ["lease-details-heading-test"],
			queryFn: async () => LEASE,
		}),
	},
}));
vi.mock("#hooks/api/query-keys/tenant-keys", () => ({
	tenantQueries: {
		list: () => ({
			queryKey: ["lease-details-heading-tenants"],
			queryFn: async () => ({ data: [] }),
		}),
	},
}));
// The unit is not among the unit list's 50 newest.
vi.mock("#hooks/api/use-unit", () => ({
	useUnitList: () => ({ data: [] }),
}));
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
