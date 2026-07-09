/**
 * @vitest-environment jsdom
 * A11Y-02: row-select checkbox accessible name (LeaseRow)
 *
 * Proves the row-select <input type="checkbox"> has an accessible name
 * derived from aria-label. getByRole('checkbox', { name }) resolves ONLY
 * if the accessible-name association is correct.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { Lease } from "#types/core";
import type { LeaseDisplay } from "../lease-utils";
import { LeaseRow } from "../leases-table-columns";

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

function renderRow() {
	return render(
		<table>
			<tbody>
				<LeaseRow
					lease={stubLease}
					virtualRow={{
						index: 0,
						start: 0,
						size: 72,
						end: 72,
						key: 0,
						lane: 0,
					}}
					measureElement={() => {}}
					isSelected={false}
					onToggleSelect={vi.fn()}
					onView={vi.fn()}
					onEdit={vi.fn()}
					onRenew={vi.fn()}
					onTerminate={vi.fn()}
				/>
			</tbody>
		</table>,
	);
}

describe("LeaseRow a11y (A11Y-02)", () => {
	test("row-select checkbox has an accessible name", () => {
		renderRow();
		const checkbox = screen.getByRole("checkbox", { name: /select/i });
		expect(checkbox).toBeInTheDocument();
	});

	test("accessible name includes the lease tenant identifier", () => {
		renderRow();
		expect(
			screen.getByRole("checkbox", { name: /select lease jane doe/i }),
		).toBeInTheDocument();
	});

	test("icon-only action buttons expose aria-label accessible names", () => {
		renderRow();
		// status:"active" renders all four; each resolves ONLY via its aria-label
		// (the lucide icons are aria-hidden, so title alone is not a reliable name).
		expect(
			screen.getByRole("button", { name: /view lease for jane doe/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /edit lease for jane doe/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /renew lease for jane doe/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /terminate lease for jane doe/i }),
		).toBeInTheDocument();
	});
});
