/**
 * BreakdownList tests
 *
 * DASH-13: the "View details" link renders only when a real `detailsHref` is
 * supplied — no dead `href="#"` affordance.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BreakdownList } from "./breakdown-list";

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

describe("BreakdownList", () => {
	it("renders the View details link when detailsHref is provided", () => {
		render(
			<BreakdownList
				title="Revenue Sources"
				rows={[]}
				detailsHref="/financials/income-statement"
			/>,
		);
		expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute(
			"href",
			"/financials/income-statement",
		);
	});

	it("omits the View details link when no detailsHref is provided", () => {
		render(<BreakdownList title="Expense Categories" rows={[]} />);
		expect(screen.queryByText("View details")).not.toBeInTheDocument();
	});
});
