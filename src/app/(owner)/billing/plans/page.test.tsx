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

	it("keeps an abandoned-checkout trial (trialing, customer set, no synced period) on the checkout path", () => {
		// stripe-checkout persists stripe_customer_id BEFORE the session, so a
		// DB-trial owner who abandons checkout returns with a customer id but no
		// live subscription (currentPeriodEnd null). Must NOT be treated as a live
		// subscriber (which would strand them in an empty portal).
		mockStatus({
			subscriptionStatus: "trialing",
			stripeCustomerId: "cus_leftover",
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

	it("treats a Stripe-checkout trial (trialing, customer + synced period) as a live subscriber", () => {
		mockStatus({
			subscriptionStatus: "trialing",
			stripeCustomerId: "cus_test",
			stripePriceId: "price_test",
			currentPeriodEnd: "2026-06-15T12:00:00Z",
			cancelAtPeriodEnd: false,
		});
		render(<BillingPlansPage />);

		expect(
			screen.getByRole("button", { name: /manage subscription/i }),
		).toBeInTheDocument();
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

describe("BillingPlansPage — plan-card confirm routing (BILL-01 anti-double-billing)", () => {
	it("routes a live subscriber's plan-card selection to the PORTAL via UpgradeDialog, never createCheckoutSession", async () => {
		// active subscriber whose stored price id matches no PRICING_PLANS entry
		// (legacy/comp) -> currentPlan === null but hasLiveSubscription === true.
		mockStatus({
			subscriptionStatus: "active",
			stripeCustomerId: "cus_test",
			stripePriceId: "price_legacy_comp",
			currentPeriodEnd: "2026-06-15T12:00:00Z",
			cancelAtPeriodEnd: false,
		});
		render(<BillingPlansPage />);

		// currentTier is null for an unresolved plan, so every card CTA reads
		// "Get Started". Click the first to open the dialog.
		const cta = screen.getAllByRole("button", { name: /get started/i })[0];
		await userEvent.click(cta as HTMLElement);

		// isManagedSwitch copy: not a "new subscription".
		expect(
			await screen.findByText(
				/review and manage your subscription in the billing portal/i,
			),
		).toBeInTheDocument();
		const confirm = screen.getByRole("button", {
			name: /continue to billing portal/i,
		});
		await userEvent.click(confirm);

		expect(hooks.createCustomerPortalSession).toHaveBeenCalledTimes(1);
		expect(hooks.createCheckoutSession).not.toHaveBeenCalled();
	});

	it("routes a DB-managed trial's plan-card selection to createCheckoutSession, not the portal", async () => {
		mockStatus({
			subscriptionStatus: "trialing",
			stripeCustomerId: null,
			stripePriceId: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
		});
		render(<BillingPlansPage />);

		const cta = screen.getAllByRole("button", { name: /get started/i })[0];
		await userEvent.click(cta as HTMLElement);

		// isNewSubscription copy for a user with no live subscription.
		const confirm = await screen.findByRole("button", {
			name: /start subscription/i,
		});
		await userEvent.click(confirm);

		expect(hooks.createCheckoutSession).toHaveBeenCalledTimes(1);
		expect(hooks.createCustomerPortalSession).not.toHaveBeenCalled();
	});
});
