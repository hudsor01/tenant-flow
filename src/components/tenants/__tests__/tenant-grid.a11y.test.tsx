/**
 * Accessibility unit test for TenantGrid (A11Y-02)
 *
 * Proves the per-row select checkbox exposes an accessible name via aria-label.
 * getByRole('checkbox', { name: /select/i }) resolves ONLY if the aria-label
 * association is correct, so this is the deterministic axe "label" proof.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TenantItem } from "#types/sections/tenants";
import { render } from "../../../test/utils/test-render";
import { TenantGrid } from "../tenant-grid";

const stubTenant: TenantItem = {
	id: "tenant-1",
	fullName: "Jane Doe",
	email: "jane@example.com",
	totalPaid: 0,
};

describe("TenantGrid accessibility (A11Y-02)", () => {
	it("exposes an accessible name on the row-select checkbox", () => {
		render(
			<TenantGrid
				tenants={[stubTenant]}
				selectedIds={new Set<string>()}
				onSelectChange={vi.fn()}
				onView={vi.fn()}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
				onContact={vi.fn()}
			/>,
		);

		const checkbox = screen.getByRole("checkbox", { name: /select/i });
		expect(checkbox).toBeInTheDocument();
		expect(checkbox).toHaveAccessibleName("Select Jane Doe");
	});

	// The lease status is a role-less span, so it carries no accessible name;
	// whose lease it is reads from sr-only text in the badge (TEN-03, 66.2-39).
	// Both branches are rendered: the stub had no lease status, so only the
	// no-status branch ran, and deleting the status chip's prefix passed every
	// unit test (cycle 2, F69).
	it.each([
		[undefined, "—Lease status for Jane Doe: none"],
		["active", "Lease status for Jane Doe: Active"],
	] as const)(
		"says whose lease status it is, with status %s, in sr-only text",
		(leaseStatus, badgeText) => {
			render(
				<TenantGrid
					tenants={[{ ...stubTenant, ...(leaseStatus ? { leaseStatus } : {}) }]}
					selectedIds={new Set<string>()}
					onSelectChange={vi.fn()}
					onView={vi.fn()}
					onEdit={vi.fn()}
					onDelete={vi.fn()}
					onContact={vi.fn()}
				/>,
			);
			const prefix = screen.getByText(/^lease status for jane doe:/i);
			expect(prefix).toHaveClass("sr-only");
			const badge = prefix.parentElement as HTMLElement;
			expect(badge).not.toHaveAttribute("aria-label");
			expect(badge.textContent).toBe(badgeText);
		},
	);
});
