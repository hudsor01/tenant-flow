import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
	useSubscriptionStatus: vi.fn(),
	createCheckoutSession: vi.fn(),
	createCustomerPortalSession: vi.fn(),
	toastError: vi.fn(),
	toastLoading: vi.fn(),
	toastDismiss: vi.fn(),
}));

vi.mock("#hooks/api/use-billing", () => ({
	useSubscriptionStatus: hooks.useSubscriptionStatus,
}));
vi.mock("#lib/stripe/stripe-client", () => ({
	createCheckoutSession: hooks.createCheckoutSession,
	createCustomerPortalSession: hooks.createCustomerPortalSession,
}));
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({ get: () => null }),
}));
vi.mock("sonner", () => ({
	toast: {
		error: hooks.toastError,
		loading: hooks.toastLoading,
		dismiss: hooks.toastDismiss,
	},
}));

import BillingPlansPage from "./page";

function mockStatus(data: Record<string, unknown> | null, isLoading = false) {
	hooks.useSubscriptionStatus.mockReturnValue({
		data,
		isLoading,
		isError: false,
		refetch: vi.fn(),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	hooks.createCustomerPortalSession.mockResolvedValue({
		url: "https://billing.stripe.test/portal",
	});
	hooks.createCheckoutSession.mockResolvedValue({
		url: "https://checkout.stripe.test/session",
	});
	// jsdom has no navigation; make window.location.href assignable + inert.
	Object.defineProperty(window, "location", {
		configurable: true,
		value: { href: "", origin: "http://localhost" },
	});
});

afterEach(() => cleanup());

describe("BillingPlansPage — BILL-01 portal-vs-checkout routing", () => {
	it("routes a past_due live subscriber to the billing PORTAL, never a second checkout", async () => {
		mockStatus({
			subscriptionStatus: "past_due",
			stripeCustomerId: "cus_test",
			stripePriceId: "price_test",
			currentPeriodEnd: "2026-06-15T12:00:00Z",
			cancelAtPeriodEnd: false,
		});
		render(<BillingPlansPage />);

		const manage = screen.getByRole("button", { name: /manage subscription/i });
		await userEvent.click(manage);

		expect(hooks.createCustomerPortalSession).toHaveBeenCalledTimes(1);
		expect(hooks.createCheckoutSession).not.toHaveBeenCalled();
	});

	it("shows the Manage Subscription button for a live subscriber whose plan is unresolved (legacy/comp price id)", () => {
		mockStatus({
			subscriptionStatus: "active",
			stripeCustomerId: "cus_test",
			// price id that matches no PRICING_PLANS entry -> currentPlan === null
			stripePriceId: "price_legacy_comp",
			currentPeriodEnd: "2026-06-15T12:00:00Z",
			cancelAtPeriodEnd: false,
		});
		render(<BillingPlansPage />);

		expect(
			screen.getByRole("button", { name: /manage subscription/i }),
		).toBeInTheDocument();
		// BILL-01 cycle-1 fix: no "undefined plan" text; generic active copy.
		expect(
			screen.getByText(/you have an active subscription/i),
		).toBeInTheDocument();
		expect(screen.queryByText(/undefined plan/i)).not.toBeInTheDocument();
	});

	it("keeps a DB-managed trial (trialing, no Stripe customer) on the checkout path — no portal button", () => {
		mockStatus({
			subscriptionStatus: "trialing",
			stripeCustomerId: null,
			stripePriceId: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
		});
		render(<BillingPlansPage />);

		expect(
			screen.queryByRole("button", { name: /manage subscription/i }),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(/choose a plan that fits your needs/i),
		).toBeInTheDocument();
	});
});

describe("BillingPlansPage — BILL-08 trial card excluded", () => {
	it("does not render the DB-managed Free Trial as a purchasable card", () => {
		mockStatus(null);
		render(<BillingPlansPage />);

		expect(screen.queryByText("Free Trial")).not.toBeInTheDocument();
		expect(screen.getByText("Starter")).toBeInTheDocument();
		expect(screen.getByText("Growth")).toBeInTheDocument();
		expect(screen.getByText("Max")).toBeInTheDocument();
	});
});
