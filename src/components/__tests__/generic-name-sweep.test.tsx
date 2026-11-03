/**
 * @vitest-environment jsdom
 * aria-label on role-less elements (66.2-39).
 *
 * ARIA 1.2 prohibits naming the generic role, so an aria-label on a plain div
 * or span is not announced. The sweep gave each such element a role that can
 * be named (group, status, img) or moved the words into sr-only text. These
 * cases have no other unit home.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";

vi.mock("#hooks/api/use-billing", () => ({
	useSubscriptionStatus: () => ({
		data: undefined,
		isLoading: true,
		isError: false,
		refetch: vi.fn(),
	}),
}));

import { PortfolioGrid } from "#components/dashboard/components/portfolio-grid";
import { SubscriptionCancelSection } from "#components/settings/sections/subscription-cancel-section";

describe("named roles for labelled elements", () => {
	it("announces the subscription loading placeholder as a named status", () => {
		render(<SubscriptionCancelSection />);
		expect(
			screen.getByRole("status", { name: "Loading subscription status" }),
		).toBeInTheDocument();
	});

	it("says what the portfolio grid's dash placeholders mean in sr-only text", () => {
		render(
			<PortfolioGrid
				data={[
					{
						id: "p1",
						property: "12 Oak St",
						address: "12 Oak St",
						units: { occupied: 0, total: 1 },
						tenant: null,
						occupancy: "vacant",
						rent: 0,
						maintenanceOpen: 0,
					},
				]}
			/>,
		);
		for (const text of ["No tenants", "No open requests"]) {
			const sr = screen.getByText(text);
			expect(sr).toHaveClass("sr-only");
			expect(sr.parentElement).not.toHaveAttribute("aria-label");
		}
	});
});
