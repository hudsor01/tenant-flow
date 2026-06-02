/**
 * BentoPricingSection tests — Phase 7 CONS-10 regression pin.
 *
 * CONS-10 deleted the global "Save $X" badge from the billing-toggle bar
 * (it showed only Growth's $98 as if it were an all-plans figure). The
 * per-card savings line replaced it. This test locks the global badge's
 * removal so it cannot be re-added by accident.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
	useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: { getSession: async () => ({ data: { session: null } }) },
	}),
}));
vi.mock("#lib/stripe/stripe-client", () => ({
	createCheckoutSession: vi.fn(),
}));
vi.mock("#lib/security", () => ({
	checkoutRateLimiter: { canMakeRequest: () => true },
}));
vi.mock("#lib/frontend-logger", () => ({
	createLogger: () => ({ error: vi.fn(), info: vi.fn() }),
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));
vi.mock("../owner-subscribe-dialog", () => ({
	OwnerSubscribeDialog: () => null,
}));

import { BentoPricingSection } from "../bento-pricing-section";

describe("BentoPricingSection", () => {
	it("renders exactly 3 per-card savings lines on yearly, none in the toggle bar (CONS-10)", () => {
		const { container } = render(
			<BentoPricingSection defaultBillingCycle="yearly" />,
		);
		// CONS-10 removed the misleading global "Save $X" badge from the
		// billing-toggle row in favor of one per-card savings paragraph.
		// Positive structural target: exactly 3 savings paragraphs render
		// (Starter $38, Growth $98, Max $298). This fails if any per-card
		// line goes missing (count drops below 3).
		const savingsLines = Array.from(
			container.querySelectorAll("p.text-success-text.font-semibold"),
		).filter((el) => /Save\s+\$[\d,]+\/year/.test(el.textContent ?? ""));
		expect(savingsLines).toHaveLength(3);
		expect(savingsLines.map((el) => el.textContent)).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/Save\s+\$38\/year/),
				expect.stringMatching(/Save\s+\$98\/year/),
				expect.stringMatching(/Save\s+\$298\/year/),
			]),
		);
		// Negative target: the toggle-bar row must contain no savings text —
		// fails if a global badge is re-added there.
		const toggleRow = container
			.querySelector("#billing-toggle")
			?.closest("div");
		expect(toggleRow?.textContent ?? "").not.toMatch(/Save\s+\$/);
	});

	it("renders the Monthly and Annual toggle labels", () => {
		render(<BentoPricingSection defaultBillingCycle="monthly" />);
		expect(screen.getByText("Monthly")).toBeInTheDocument();
		expect(screen.getByText("Annual")).toBeInTheDocument();
	});
});
