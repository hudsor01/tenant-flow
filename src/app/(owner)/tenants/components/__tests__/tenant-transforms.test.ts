import { describe, expect, it } from "vitest";
import type { TenantWithLeaseInfo } from "#types/core";
import { transformToTenantSectionDetail } from "../tenant-transforms";

// Regression: MONEY-02 — currentLease.rentAmount must be in whole DOLLARS
// (rendered with formatCurrency on the tenant detail sheet). A prior `* 100`
// showed rent 100x too high.

function tenant(
	currentLease: NonNullable<TenantWithLeaseInfo["currentLease"]>,
): TenantWithLeaseInfo {
	return {
		id: "tenant-1",
		owner_user_id: "owner-1",
		status: "active",
		created_at: "2026-01-01T00:00:00Z",
		date_of_birth: null,
		emergency_contact_name: null,
		emergency_contact_phone: null,
		emergency_contact_relationship: null,
		identity_verified: false,
		ssn_last_four: null,
		updated_at: "2026-01-01T00:00:00Z",
		name: "Alice Tenant",
		email: "alice@example.com",
		phone: null,
		first_name: "Alice",
		last_name: "Tenant",
		currentLease,
	};
}

describe("transformToTenantSectionDetail currentLease.rentAmount", () => {
	it("carries the lease rent through in whole dollars (not 100x)", () => {
		const detail = transformToTenantSectionDetail(
			tenant({
				id: "lease-1",
				start_date: "2026-01-01",
				end_date: "2026-12-31",
				rent_amount: 1500,
				security_deposit: 1500,
				status: "active",
				primary_tenant_id: "tenant-1",
				unit_id: "unit-1",
			}),
		);

		// 1500 dollars — NOT 150000 (the old cents-conversion bug).
		expect(detail.currentLease?.rentAmount).toBe(1500);
	});
});
