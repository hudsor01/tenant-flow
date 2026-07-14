/**
 * LeaseSidebar tests
 *
 * DASH-11: the unit affordance links to the real per-unit route
 * `/units/[id]/edit` (relabeled "View Unit"), not the non-existent
 * `/properties/[id]/units/[unitId]` route that 404'd.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Lease } from "#types/core";
import { LeaseSidebar } from "./lease-sidebar";

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("#components/leases/lease-signature-status", () => ({
	LeaseSignatureStatus: () => null,
}));

const activeLease = {
	id: "lease-1",
	lease_status: "active",
	unit_id: "unit-9",
	primary_tenant_id: "tenant-1",
} as unknown as Lease;

describe("LeaseSidebar", () => {
	it("links 'View Unit' to /units/[id]/edit", () => {
		render(
			<LeaseSidebar
				lease={activeLease}
				unit={{ id: "unit-9", property_id: "prop-1", unit_number: "5" }}
			/>,
		);
		const link = screen.getByRole("link", { name: /view unit/i });
		expect(link).toHaveAttribute("href", "/units/unit-9/edit");
	});
});
