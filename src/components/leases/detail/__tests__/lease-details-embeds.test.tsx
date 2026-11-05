/**
 * @vitest-environment jsdom
 * The lease page reads its tenant and its unit from the lease's own embeds
 * (66.2-39 fix round 3, part 7).
 *
 * It looked the tenant up in `tenantQueries.list()` and the unit in
 * `useUnitList()`, each the 50 newest non-inactive rows, so a lease on an
 * owner's 51st tenant or unit found neither: the Details tab read "No tenant
 * assigned to this lease" and "No unit linked to this lease", the sidebar had
 * no View Unit link, and a draft lease offered no Send for Signature (the
 * header offers it only with a tenant). F52 fixed the heading alone. The
 * detail query already embedded both; `leaseQueries.detail` now maps them
 * onto the lease (`LeaseDetailRow.tenant`, `.unit`).
 */
import { QueryClient } from "@tanstack/react-query";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { DEFAULT_LEASE } from "#test/utils/test-data";
import { render } from "#test/utils/test-render";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));
vi.mock("#hooks/api/use-lease-signature-mutations", () => ({
	useCancelSignatureRequestMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
	}),
}));
// The header's send button, by the tenant it would send to.
vi.mock("#components/leases/send-for-signature-button", () => ({
	SendForSignatureButton: ({ tenantName }: { tenantName?: string }) => (
		<span data-testid="send-for-signature">{tenantName ?? ""}</span>
	),
}));
for (const [path, name] of [
	["../lease-terms-tab", "LeaseTermsTab"],
	["../lease-timeline-tab", "LeaseTimelineTab"],
	["#components/ledger/ledger-tab", "LedgerTab"],
	["#components/documents/documents-section", "DocumentsSection"],
	["#components/leases/lease-signature-status", "LeaseSignatureStatus"],
	[
		"#components/leases/download-signed-lease-button",
		"DownloadSignedLeaseButton",
	],
	[
		"#components/leases/rent-increase-notice-dialog",
		"RentIncreaseNoticeDialog",
	],
	["#components/leases/sign-lease-button", "SignLeaseButton"],
] as const) {
	vi.doMock(path, () => ({ [name]: () => null }));
}

/** The detail row as PostgREST returns it, with its two embeds. */
function detailRow(leaseStatus: string) {
	return {
		...DEFAULT_LEASE,
		id: "lease-51",
		unit_id: "unit-51",
		primary_tenant_id: "tenant-51",
		lease_status: leaseStatus,
		tenants: {
			id: "tenant-51",
			name: null,
			first_name: "Sam",
			last_name: "Lee",
			email: "sam@example.com",
		},
		units: {
			id: "unit-51",
			unit_number: "4B",
			bedrooms: 2,
			bathrooms: 1,
			square_feet: 900,
			property_id: "property-1",
			properties: {
				name: "Maple Court",
				address_line1: "1 Maple Ave",
				city: "Austin",
				state: "TX",
			},
		},
	};
}

/** The owner's 50 newest tenants and units: the lease's are not among them. */
const OTHER_TENANTS = Array.from({ length: 50 }, (_, i) => ({
	id: `tenant-${i + 1}`,
	name: `Tenant ${i + 1}`,
	first_name: null,
	last_name: null,
	email: `tenant${i + 1}@example.com`,
	status: "active",
	lease_tenants: [],
}));
const OTHER_UNITS = Array.from({ length: 50 }, (_, i) => ({
	id: `unit-${i + 1}`,
	property_id: "property-1",
	unit_number: `${i + 1}`,
	bedrooms: 1,
	bathrooms: 1,
	square_feet: null,
	status: "occupied",
	properties: { name: "Maple Court", status: "active" },
}));

function answer(leaseStatus: string) {
	mockFrom.mockImplementation((table: string) => {
		if (table === "leases") {
			return createQueryChain({ data: detailRow(leaseStatus), error: null });
		}
		if (table === "tenants") {
			return createQueryChain({ data: OTHER_TENANTS, error: null, count: 51 });
		}
		if (table === "units") {
			return createQueryChain({ data: OTHER_UNITS, error: null, count: 51 });
		}
		return createQueryChain({ data: [], error: null, count: 0 });
	});
}

describe("the lease page reads its tenant and unit from the lease", () => {
	beforeEach(() => {
		mockFrom.mockReset();
	});

	it("names the 51st tenant and shows the 51st unit on the Details tab", async () => {
		answer("active");
		const { LeaseDetails } = await import("../lease-details.client");
		render(<LeaseDetails id="lease-51" />);
		const panel = within(await screen.findByRole("tabpanel"));
		expect(panel.queryByText("No tenant assigned to this lease")).toBeNull();
		expect(panel.queryByText("No unit linked to this lease")).toBeNull();
		expect(panel.getByText("Sam Lee")).toBeInTheDocument();
		expect(panel.getByText("sam@example.com")).toBeInTheDocument();
		expect(panel.getByText("Unit 4B")).toBeInTheDocument();
		expect(panel.getByText("2 bed, 1 bath | 900 sq ft")).toBeInTheDocument();
	});

	it("links the 51st unit from the sidebar", async () => {
		answer("active");
		const { LeaseDetails } = await import("../lease-details.client");
		render(<LeaseDetails id="lease-51" />);
		const link = await screen.findByRole("link", { name: /view unit/i });
		expect(link).toHaveAttribute("href", "/units/unit-51/edit");
	});

	it("offers a draft lease on the 51st tenant for signature", async () => {
		answer("draft");
		const { LeaseDetails } = await import("../lease-details.client");
		render(<LeaseDetails id="lease-51" />);
		expect((await screen.findByTestId("send-for-signature")).textContent).toBe(
			"Sam Lee",
		);
	});

	it("selects both embeds and maps them onto the lease", async () => {
		const chain = createQueryChain({ data: detailRow("active"), error: null });
		mockFrom.mockReturnValue(chain);
		const { leaseQueries } = await import("#hooks/api/query-keys/lease-keys");
		const lease = await new QueryClient().query(
			leaseQueries.detail("lease-51"),
		);
		const select = String(chain.select?.mock.calls[0]?.[0] ?? "");
		expect(select).toContain(
			"tenants:primary_tenant_id(id, name, first_name, last_name, email)",
		);
		expect(select).toContain(
			"units(id, unit_number, bedrooms, bathrooms, square_feet, property_id, properties(name, address_line1, city, state))",
		);
		expect(lease.tenant).toEqual(detailRow("active").tenants);
		expect(lease.unit).toEqual({
			id: "unit-51",
			unit_number: "4B",
			bedrooms: 2,
			bathrooms: 1,
			square_feet: 900,
			property_id: "property-1",
			property: detailRow("active").units.properties,
		});
		expect(lease).not.toHaveProperty("tenants");
		expect(lease).not.toHaveProperty("units");
	});

	it("heads the lease by the embedded unit and property", async () => {
		answer("active");
		const { LeaseDetails } = await import("../lease-details.client");
		render(<LeaseDetails id="lease-51" />);
		const heading = await screen.findByRole("heading", { level: 2 });
		expect(heading.textContent).toBe("Maple Court · Unit 4B");
	});
});
