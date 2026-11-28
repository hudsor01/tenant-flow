/**
 * PricingCardFeatured component tests — Phase 7 CONS-05 / CONS-09 / CONS-10 regression pins.
 *
 * All three Phase 7 CONS fixes shipped in source already; these tests lock the
 * load-bearing className shapes and the Featured per-card savings render so a
 * future edit cannot silently revert them.
 *
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	createCheckoutSessionMock,
	getSessionMock,
	assignMock,
	toastErrorMock,
} = vi.hoisted(() => ({
	createCheckoutSessionMock: vi.fn(),
	getSessionMock: vi.fn(),
	assignMock: vi.fn(),
	toastErrorMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
	useMutation: (opts: {
		mutationFn: (o?: {
			customerEmail?: string;
			tenant_id?: string;
		}) => Promise<unknown>;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	}) => {
		// Like TanStack's: onError sees the failure, mutateAsync rethrows it and
		// mutate swallows it.
		const run = async (o?: { customerEmail?: string; tenant_id?: string }) => {
			try {
				return await opts.mutationFn(o);
			} catch (error) {
				opts.onError?.(error as Error);
				throw error;
			} finally {
				opts.onSettled?.();
			}
		};
		return {
			mutateAsync: run,
			mutate: (o?: { customerEmail?: string; tenant_id?: string }) => {
				run(o).catch(() => undefined);
			},
			isPending: false,
		};
	},
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
	toast: { loading: vi.fn(), error: toastErrorMock, dismiss: vi.fn() },
}));
vi.mock("../owner-subscribe-dialog", () => ({
	OwnerSubscribeDialog: () => null,
}));

import { expectConsole } from "#test/utils/expect-console";
import { PricingCardFeatured } from "../pricing-card-featured";

const originalLocation = window.location;

beforeEach(() => {
	getSessionMock.mockResolvedValue({ data: { session: null } });
	createCheckoutSessionMock.mockReset();
	assignMock.mockReset();
	toastErrorMock.mockReset();
	Object.defineProperty(window, "location", {
		configurable: true,
		writable: true,
		value: { href: "", assign: assignMock },
	});
});

afterEach(() => {
	Object.defineProperty(window, "location", {
		configurable: true,
		writable: true,
		value: originalLocation,
	});
});

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

	it("sends a signed-in owner to the Stripe Checkout URL", async () => {
		getSessionMock.mockResolvedValue({
			data: { session: { access_token: "token" } },
		});
		createCheckoutSessionMock.mockResolvedValue({
			url: "https://checkout.stripe.com/c/pay/cs_test_growth",
		});
		const user = userEvent.setup();
		render(<PricingCardFeatured plan={growthPlan} billingCycle="yearly" />);

		await user.click(screen.getByRole("button", { name: /Start free/ }));

		await waitFor(() =>
			expect(assignMock).toHaveBeenCalledWith(
				"https://checkout.stripe.com/c/pay/cs_test_growth",
			),
		);
		expect(createCheckoutSessionMock).toHaveBeenCalledWith(
			expect.objectContaining({ priceId: "price_test_annual" }),
		);
		expect(toastErrorMock).not.toHaveBeenCalled();
	});

	it.each([
		"https://checkout.example.com/session",
		"https://stripe.com.evil.com/c/pay/cs_test_growth",
		"data:text/html,<script>alert(1)</script>",
	])(
		"does not navigate to the non-Stripe checkout URL %s, and toasts instead",
		async (url) => {
			const consoleError = expectConsole("error");
			getSessionMock.mockResolvedValue({
				data: { session: { access_token: "token" } },
			});
			createCheckoutSessionMock.mockResolvedValue({ url });
			const user = userEvent.setup();
			render(<PricingCardFeatured plan={growthPlan} billingCycle="monthly" />);

			await user.click(screen.getByRole("button", { name: /Start free/ }));

			await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1));
			expect(createCheckoutSessionMock).toHaveBeenCalledTimes(1);
			expect(assignMock).not.toHaveBeenCalled();
			expect(consoleError).toHaveBeenCalledTimes(1);
			expect(consoleError).toHaveBeenCalledWith(
				"[mutation] Start checkout failed",
				expect.objectContaining({
					action: "start_checkout",
					error:
						"stripeRedirectUrl: refused a redirect URL that is not an https Stripe page",
				}),
			);
		},
	);
});
