/**
 * @vitest-environment jsdom
 * RenewLeaseDialog Component Tests (LEASE-03)
 *
 * Verifies the renew dialog now persists an adjusted rent on UNSIGNED leases,
 * omits rent_amount when the toggle is off, and on a SIGNED / pending_signature
 * lease disables the rent-adjustment control and never sends rent_amount (the
 * 26-06 server term-lock rejects rent changes on signed leases by design, so the
 * UI must not attempt one — extending end_date still works).
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "#test/utils/test-render";
import type { Lease } from "#types/core";
import { RenewLeaseDialog } from "../renew-lease-dialog";

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const mockRenewLease = {
	mutateAsync: vi.fn().mockResolvedValue({ id: "lease-123" }),
	isPending: false,
};

vi.mock("#hooks/api/use-lease-lifecycle-mutations", () => ({
	useRenewLeaseMutation: () => mockRenewLease,
}));

const createMockLease = (overrides: Partial<Lease> = {}): Lease => ({
	id: "lease-123",
	unit_id: "unit-101",
	primary_tenant_id: "tenant-123",
	owner_user_id: "owner-123",
	start_date: "2024-01-01",
	end_date: "2024-12-31",
	rent_amount: 2500,
	rent_currency: "USD",
	security_deposit: 5000,
	lease_status: "active",
	payment_day: 1,
	grace_period_days: null,
	late_fee_amount: null,
	late_fee_days: null,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-06-01T00:00:00Z",
	owner_signature_user_agent: null,
	tenant_signature_user_agent: null,
	tenant_signature_name: null,
	owner_signature_consent_at: null,
	tenant_signature_consent_at: null,
	signed_document_path: null,
	signed_document_hash: null,
	signed_lease_emailed_at: null,
	landlord_notice_address: null,
	immediate_family_members: null,
	owner_signed_at: null,
	owner_signature_ip: null,
	owner_signature_method: null,
	tenant_signed_at: null,
	tenant_signature_ip: null,
	tenant_signature_method: null,
	sent_for_signature_at: null,
	max_occupants: null,
	pets_allowed: null,
	pet_deposit: null,
	pet_rent: null,
	utilities_included: null,
	tenant_responsible_utilities: null,
	property_rules: null,
	property_built_before_1978: null,
	lead_paint_disclosure_acknowledged: null,
	governing_state: null,
	...overrides,
});

describe("RenewLeaseDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRenewLease.mutateAsync.mockResolvedValue({ id: "lease-123" });
	});

	test("unsigned lease + adjust rent toggled on sends the entered whole-dollar rent_amount", async () => {
		const user = userEvent.setup();
		render(
			<RenewLeaseDialog
				open
				onOpenChange={vi.fn()}
				lease={createMockLease()}
			/>,
		);

		// Reveal the rent input, then enter a whole-dollar amount.
		await user.click(screen.getByRole("button", { name: /adjust rent/i }));
		const rentInput = screen.getByRole("spinbutton");
		await user.type(rentInput, "3000");

		await user.click(screen.getByRole("button", { name: /renew lease/i }));

		await waitFor(() => {
			expect(mockRenewLease.mutateAsync).toHaveBeenCalled();
		});
		expect(mockRenewLease.mutateAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "lease-123",
				data: expect.objectContaining({ rent_amount: 3000 }),
			}),
		);
	});

	test("unsigned lease + toggle off omits rent_amount from the payload", async () => {
		const user = userEvent.setup();
		render(
			<RenewLeaseDialog
				open
				onOpenChange={vi.fn()}
				lease={createMockLease()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /renew lease/i }));

		await waitFor(() => {
			expect(mockRenewLease.mutateAsync).toHaveBeenCalled();
		});
		const payload = mockRenewLease.mutateAsync.mock.calls[0]?.[0] as {
			id: string;
			data: Record<string, unknown>;
		};
		expect(payload.data).not.toHaveProperty("rent_amount");
		expect(payload.data).toHaveProperty("end_date");
	});

	test("signed lease disables the rent-adjustment control and never sends rent_amount", async () => {
		const user = userEvent.setup();
		render(
			<RenewLeaseDialog
				open
				onOpenChange={vi.fn()}
				lease={createMockLease({
					tenant_signed_at: "2024-02-01T00:00:00Z",
				})}
			/>,
		);

		// The rent-adjustment toggle is disabled and no rent input is rendered.
		const lockedToggle = screen.getByRole("button", {
			name: /rent is locked/i,
		});
		expect(lockedToggle).toBeDisabled();
		expect(screen.queryByRole("spinbutton")).toBeNull();

		// Extending end_date still submits — with no rent_amount.
		await user.click(screen.getByRole("button", { name: /renew lease/i }));

		await waitFor(() => {
			expect(mockRenewLease.mutateAsync).toHaveBeenCalled();
		});
		const payload = mockRenewLease.mutateAsync.mock.calls[0]?.[0] as {
			id: string;
			data: Record<string, unknown>;
		};
		expect(payload.data).not.toHaveProperty("rent_amount");
		expect(payload.data).toHaveProperty("end_date");
	});
});
