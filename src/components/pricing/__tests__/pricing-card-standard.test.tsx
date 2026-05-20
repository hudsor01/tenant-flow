/**
 * PricingCardStandard component tests — Phase 7 CONS-09 / CONS-10 regression pins.
 *
 * Phase 7's CONS fixes shipped in source already; these tests lock the
 * price-row nowrap and the per-card annual-savings render.
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

import { PricingCardStandard } from "../pricing-card-standard";

const starterPlan = {
	id: "starter",
	name: "Starter",
	description: "Ideal for landlords with 1-5 rentals",
	audienceTagline: "Built for landlords with 1-5 rentals",
	price: { monthly: 19, yearly: 19 },
	annualTotal: 190,
	features: ["Document vault", "E-sign"],
	popular: false,
	stripeMonthlyPriceId: "price_test_starter_m",
	stripeAnnualPriceId: "price_test_starter_a",
};
const maxPlan = {
	id: "max",
	name: "Max",
	description: "For large portfolios",
	audienceTagline: "Built for landlords with 15+ rentals",
	price: { monthly: 149, yearly: 149 },
	annualTotal: 1490,
	features: ["Document vault", "E-sign", "Priority support"],
	popular: false,
	stripeMonthlyPriceId: "price_test_max_m",
	stripeAnnualPriceId: "price_test_max_a",
};

describe("PricingCardStandard", () => {
	it("price-row container carries whitespace-nowrap (CONS-09)", () => {
		const { container } = render(
			<PricingCardStandard
				plan={starterPlan}
				billingCycle="monthly"
				variant="starter"
			/>,
		);
		const priceRow = container.querySelector(".flex.items-baseline");
		expect(priceRow).toBeTruthy();
		expect(priceRow).toHaveClass("whitespace-nowrap");
	});

	it('renders "Save $38/year" for Starter on annual (CONS-10)', () => {
		render(
			<PricingCardStandard
				plan={starterPlan}
				billingCycle="yearly"
				variant="starter"
			/>,
		);
		expect(screen.getByText(/Save\s+\$38\/year/)).toBeInTheDocument();
	});

	it('renders "Save $298/year" for Max on annual (CONS-10)', () => {
		render(
			<PricingCardStandard
				plan={maxPlan}
				billingCycle="yearly"
				variant="enterprise"
			/>,
		);
		expect(screen.getByText(/Save\s+\$298\/year/)).toBeInTheDocument();
	});

	it("hides the savings line on monthly (CONS-10)", () => {
		render(
			<PricingCardStandard
				plan={starterPlan}
				billingCycle="monthly"
				variant="starter"
			/>,
		);
		expect(screen.queryByText(/\/year/)).toBeNull();
	});

	it("savings line uses the text-success token (CONS-10)", () => {
		const { container } = render(
			<PricingCardStandard
				plan={starterPlan}
				billingCycle="yearly"
				variant="starter"
			/>,
		);
		const savings = container.querySelector(".text-success.font-semibold");
		expect(savings).toBeTruthy();
		expect(savings?.textContent).toMatch(/Save\s+\$38\/year/);
	});
});
