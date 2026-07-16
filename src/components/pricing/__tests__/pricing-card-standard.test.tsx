/**
 * PricingCardStandard component tests — Phase 7 CONS-09 / CONS-10 regression
 * pins plus the Phase 46 MKTUI-04 self-serve-checkout pin.
 *
 * Phase 7's CONS fixes shipped in source already; these tests lock the
 * price-row nowrap and the per-card annual-savings render. MKTUI-04 removed
 * the enterprise/contact-sales variant, so every standard card (including Max)
 * is self-serve checkout — the added pin proves Max reaches
 * createCheckoutSession with its configured Stripe price ID.
 *
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createCheckoutSessionMock, getSessionMock } = vi.hoisted(() => ({
	createCheckoutSessionMock: vi.fn(),
	getSessionMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
	useMutation: (opts: {
		mutationFn: (o?: {
			customerEmail?: string;
			tenant_id?: string;
		}) => Promise<unknown>;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	}) => ({
		mutateAsync: async (o?: { customerEmail?: string; tenant_id?: string }) => {
			try {
				return await opts.mutationFn(o);
			} catch (error) {
				opts.onError?.(error as Error);
				return undefined;
			} finally {
				opts.onSettled?.();
			}
		},
		isPending: false,
	}),
}));
vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		auth: { getSession: getSessionMock },
	}),
}));
vi.mock("#lib/stripe/stripe-client", () => ({
	createCheckoutSession: createCheckoutSessionMock,
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

const originalLocation = window.location;

beforeEach(() => {
	getSessionMock.mockResolvedValue({ data: { session: null } });
	createCheckoutSessionMock.mockReset();
	Object.defineProperty(window, "location", {
		configurable: true,
		writable: true,
		value: { href: "" },
	});
});

afterEach(() => {
	Object.defineProperty(window, "location", {
		configurable: true,
		writable: true,
		value: originalLocation,
	});
});

const starterPlan: ComponentProps<typeof PricingCardStandard>["plan"] = {
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
const maxPlan: ComponentProps<typeof PricingCardStandard>["plan"] = {
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
		render(<PricingCardStandard plan={starterPlan} billingCycle="monthly" />);
		// Anchor on the price text rather than a class-soup selector so the
		// assertion survives layout refactors that add other flex wrappers.
		const priceRow = screen.getByText("$19").closest("div");
		expect(priceRow).toBeTruthy();
		expect(priceRow).toHaveClass("whitespace-nowrap");
	});

	it('renders "Save $38/year" for Starter on annual (CONS-10)', () => {
		render(<PricingCardStandard plan={starterPlan} billingCycle="yearly" />);
		expect(screen.getByText(/Save\s+\$38\/year/)).toBeInTheDocument();
	});

	it('renders "Save $298/year" for Max on annual (CONS-10)', () => {
		render(<PricingCardStandard plan={maxPlan} billingCycle="yearly" />);
		expect(screen.getByText(/Save\s+\$298\/year/)).toBeInTheDocument();
	});

	it("hides the savings line on monthly (CONS-10)", () => {
		render(<PricingCardStandard plan={starterPlan} billingCycle="monthly" />);
		// Match the savings shape specifically so the assertion verifies the
		// savings paragraph is gone, not just any incidental "/year" string.
		expect(screen.queryByText(/Save\s+\$\d/)).toBeNull();
	});

	it("savings line uses the text-success-text token (CONS-10)", () => {
		const { container } = render(
			<PricingCardStandard plan={starterPlan} billingCycle="yearly" />,
		);
		const savings = container.querySelector(".text-success-text.font-semibold");
		expect(savings).toBeTruthy();
		expect(savings?.textContent).toMatch(/Save\s+\$38\/year/);
	});

	it("Max card is self-serve — renders 'Start free', not 'Contact Sales' (MKTUI-04)", () => {
		render(<PricingCardStandard plan={maxPlan} billingCycle="monthly" />);
		expect(
			screen.getByRole("button", { name: /Start free/ }),
		).toBeInTheDocument();
		expect(screen.queryByText(/Contact Sales/)).toBeNull();
	});

	it("Max card CTA starts checkout with the configured price ID (MKTUI-04)", async () => {
		getSessionMock.mockResolvedValue({
			data: { session: { access_token: "token" } },
		});
		createCheckoutSessionMock.mockResolvedValue({
			url: "https://checkout.stripe.test/session",
		});
		const user = userEvent.setup();
		render(<PricingCardStandard plan={maxPlan} billingCycle="yearly" />);

		await user.click(screen.getByRole("button", { name: /Start free/ }));

		await waitFor(() =>
			expect(createCheckoutSessionMock).toHaveBeenCalledWith(
				expect.objectContaining({
					priceId: "price_test_max_a",
					planName: "Max",
				}),
			),
		);
	});
});
