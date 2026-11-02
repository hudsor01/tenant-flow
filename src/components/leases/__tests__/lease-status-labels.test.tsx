/**
 * The same lease reads under one status label on every surface (66.2-39 fix
 * round 1, part P): "Pending Signature" on the leases page, its CSV and its
 * detail, and until now "Pending" on the tenants page, its CSV, its filter, the
 * tenant sheet, the lease form's status select and both stat tiles. The leases
 * page's pseudo-status read "Expiring" in its badge and "Expiring Soon" in its
 * filter and tile; the onboarding step offered MULTI_UNIT as "Multi Unit".
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeasesStatCards } from "#app/(owner)/leases/leases-stat-cards";
import { getStatusConfig } from "#components/leases/detail/lease-detail-utils";
import { LeasesTableToolbar } from "#components/leases/table/leases-table-toolbar";
import { OnboardingStepProperty } from "#components/onboarding/onboarding-step-property";
import { TenantStats } from "#components/tenants/tenant-stats";
import { TenantLeaseStatusBadge } from "#components/tenants/tenant-table-helpers";
import { TenantToolbar } from "#components/tenants/tenant-toolbar";
import { buildTenantsCsv } from "#components/tenants/tenants-csv";
import {
	EXPIRING_LEASE_LABEL,
	LEASE_STATUS_LABELS,
} from "#lib/constants/status-types";
import type { LeaseStatus } from "#types/core";

vi.mock("#hooks/api/use-property-mutations", () => ({
	useCreatePropertyMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const STATUSES = Object.keys(LEASE_STATUS_LABELS) as LeaseStatus[];

function optionTexts(select: HTMLElement): string[] {
	return within(select)
		.getAllByRole("option")
		.map((option) => option.textContent ?? "");
}

describe("one label per lease status", () => {
	afterEach(() => cleanup());

	it("names each status the same in the leases badge and the tenants badge", () => {
		for (const status of STATUSES) {
			render(<TenantLeaseStatusBadge status={status} />);
			expect(screen.getByText(LEASE_STATUS_LABELS[status])).toBeInTheDocument();
			cleanup();
			expect(getStatusConfig(status).label).toBe(LEASE_STATUS_LABELS[status]);
		}
		expect(getStatusConfig("expiring").label).toBe(EXPIRING_LEASE_LABEL);
	});

	it("writes the tenants CSV's lease status under the same label", () => {
		const csv = buildTenantsCsv([
			{
				id: "t1",
				fullName: "Ada Tenant",
				email: "ada@example.com",
				leaseStatus: "pending_signature",
				totalPaid: 0,
			},
		]);
		expect(csv.split("\r\n")[1]).toContain(",Pending Signature,");
	});

	it("offers the same labels in the tenants and leases filters", () => {
		render(
			<TenantToolbar
				searchQuery=""
				onSearchChange={vi.fn()}
				statusFilter="all"
				onStatusFilterChange={vi.fn()}
				viewMode="table"
				onViewModeChange={vi.fn()}
				filteredCount={0}
			/>,
		);
		expect(
			optionTexts(screen.getByRole("combobox", { name: "Filter by status" })),
		).toEqual([
			"All Statuses",
			"Active",
			"Pending Signature",
			"Ended",
			"Expired",
			"Terminated",
		]);
		cleanup();
		render(
			<LeasesTableToolbar
				searchQuery=""
				statusFilter="all"
				onSearchChange={vi.fn()}
				onStatusFilterChange={vi.fn()}
			/>,
		);
		expect(
			optionTexts(screen.getByRole("combobox", { name: "Filter by status" })),
		).toEqual([
			"All Statuses",
			"Active",
			"Expiring Soon",
			"Pending Signature",
			"Ended",
			"Expired",
			"Terminated",
		]);
	});

	it("titles the pending count the same on the leases and tenants pages", () => {
		render(
			<LeasesStatCards
				totalLeases={3}
				activeLeases={1}
				expiringLeases={1}
				pendingLeases={1}
			/>,
		);
		expect(screen.getByText("Pending Signature")).toBeInTheDocument();
		expect(screen.getByText("Expiring Soon")).toBeInTheDocument();
		expect(screen.queryByText("Pending")).toBeNull();
		cleanup();
		render(
			<TenantStats
				totalTenants={3}
				activeTenants={1}
				pendingTenants={1}
				endedTenants={1}
			/>,
		);
		expect(screen.getByText("Pending Signature")).toBeInTheDocument();
		expect(screen.queryByText("Pending")).toBeNull();
	});
});

describe("one label per property type", () => {
	afterEach(() => cleanup());

	it("offers MULTI_UNIT as Multi Family in onboarding, as the property form does", async () => {
		const { userEvent } = await import("@testing-library/user-event");
		const user = userEvent.setup();
		render(<OnboardingStepProperty onNext={vi.fn()} onSkip={vi.fn()} />);
		await user.click(screen.getByRole("combobox", { name: "Property Type" }));
		const options = screen
			.getAllByRole("option")
			.map((option) => option.textContent);
		expect(options).toEqual([
			"Single Family",
			"Multi Family",
			"Apartment",
			"Commercial",
			"Condo",
			"Townhouse",
			"Other",
		]);
	});
});
