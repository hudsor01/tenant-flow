/**
 * PricingCardFeatured component tests — Phase 7 CONS-05 / CONS-09 / CONS-10 regression pins.
 *
 * All three Phase 7 CONS fixes shipped in source already; these tests lock the
 * load-bearing className shapes and the Featured per-card savings render so a
 * future edit cannot silently revert them.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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

import { PricingCardFeatured } from "../pricing-card-featured";

const growthPlan: ComponentProps<typeof PricingCardFeatured>["plan"] = {
	id: "growth",
	name: "Growth",
	description: "For growing portfolios",
	audienceTagline: "Built for landlords with 6-15 rentals",
	price: { monthly: 49, yearly: 49 },
	annualTotal: 490,
	features: ["Document vault", "E-sign", "Bulk export"],
	popular: true,
	stripeMonthlyPriceId: "price_test_monthly",
	stripeAnnualPriceId: "price_test_annual",
};

describe("PricingCardFeatured", () => {
	it("Most Popular badge wrapper uses top-0 + -translate-y-1/2, not -top-4 (CONS-05)", () => {
		const { container } = render(
			<PricingCardFeatured plan={growthPlan} billingCycle="monthly" />,
		);
		const badgeWrapper = container.querySelector(".absolute.top-0");
		expect(badgeWrapper).toBeTruthy();
		expect(badgeWrapper).toHaveClass("-translate-y-1/2");
		expect(badgeWrapper).not.toHaveClass("-top-4");
	});

	it("renders the Most Popular badge text (CONS-05 sanity)", () => {
		render(<PricingCardFeatured plan={growthPlan} billingCycle="monthly" />);
		expect(screen.getByText("Most Popular")).toBeInTheDocument();
	});

	it("Featured price-row container carries whitespace-nowrap (CONS-09)", () => {
		render(<PricingCardFeatured plan={growthPlan} billingCycle="monthly" />);
		// Anchor on the price text rather than a class-soup selector so the
		// assertion survives layout refactors that add other flex wrappers.
		const priceRow = screen.getByText("$49").closest("div");
		expect(priceRow).toBeTruthy();
		expect(priceRow).toHaveClass("whitespace-nowrap");
	});

	it('renders "Save $98/year" for Growth on annual (CONS-10)', () => {
		render(<PricingCardFeatured plan={growthPlan} billingCycle="yearly" />);
		expect(screen.getByText(/Save\s+\$98\/year/)).toBeInTheDocument();
	});

	it("hides the savings line on monthly (CONS-10)", () => {
		render(<PricingCardFeatured plan={growthPlan} billingCycle="monthly" />);
		// Match the savings shape specifically so the assertion verifies the
		// savings paragraph is gone, not just any incidental "/year" string.
		expect(screen.queryByText(/Save\s+\$\d/)).toBeNull();
	});
});
