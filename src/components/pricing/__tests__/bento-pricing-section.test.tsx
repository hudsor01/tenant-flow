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
	it("toggle bar renders no global 'Save $98' badge on yearly (CONS-10 — removed)", () => {
		render(<BentoPricingSection defaultBillingCycle="yearly" />);
		// the toggle row previously held a global "Save $98" badge labeled as an
		// all-plans figure; CONS-10 removed it in favor of per-card savings lines.
		// Per-card savings ("Save $98/year" on the Growth card) still render — so
		// assert against the bare "Save $98" with no "/year" suffix, which only
		// the deleted global badge produced.
		const globalBadge = screen
			.queryAllByText(/Save \$98/)
			.filter((el) => !/\/year/.test(el.textContent ?? ""));
		expect(globalBadge).toHaveLength(0);
	});

	it("renders the Monthly and Annual toggle labels", () => {
		render(<BentoPricingSection defaultBillingCycle="monthly" />);
		expect(screen.getByText("Monthly")).toBeInTheDocument();
		expect(screen.getByText("Annual")).toBeInTheDocument();
	});
});
