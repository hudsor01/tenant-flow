/**
 * @vitest-environment jsdom
 * A11Y-02: select-all checkbox accessible name (LeasesTable header)
 *
 * Proves the header "select all" <input type="checkbox"> exposes an accessible
 * name via aria-label. getByRole('checkbox', { name }) resolves ONLY if the
 * aria-label is present, so removing it makes this test FAIL.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { Lease } from "#types/core";
import type { LeaseDisplay } from "../lease-utils";
import { LeasesTable } from "../leases-table";

const stubLease: LeaseDisplay = {
	id: "lease-1",
	tenantName: "Jane Doe",
	propertyName: "Maple Apartments",
	unitNumber: "4B",
	status: "active",
	startDate: "2026-01-01",
	endDate: "2026-12-31",
	rentAmount: 1500,
	original: { id: "lease-1" } as Lease,
};

describe("LeasesTable a11y (A11Y-02)", () => {
	test("select-all checkbox has an accessible name", () => {
		render(
			<LeasesTable
				leases={[stubLease]}
				paginatedLeases={[stubLease]}
				searchQuery=""
				statusFilter="all"
				sortField="tenant"
				sortDirection="asc"
				selectedRows={new Set<string>()}
				currentPage={1}
				totalPages={1}
				itemsPerPage={10}
				onSearchChange={vi.fn()}
				onStatusFilterChange={vi.fn()}
				onSort={vi.fn()}
				onToggleSelectAll={vi.fn()}
				onToggleSelect={vi.fn()}
				onPageChange={vi.fn()}
				onView={vi.fn()}
				onEdit={vi.fn()}
				onRenew={vi.fn()}
				onTerminate={vi.fn()}
				onClearSelection={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("checkbox", { name: /select all leases/i }),
		).toBeInTheDocument();
	});
});
