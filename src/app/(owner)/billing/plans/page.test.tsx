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

	// 66.2-39 fix round 4, Part 8l: a live but locked subscription is not
	// "active" (the proxy sends unpaid, paused and incomplete to /pricing).
	it.each([
		["unpaid", "Your subscription is unpaid"],
		["past_due", "Your subscription is past due"],
		["paused", "Your subscription is paused"],
	])(
		"names a %s subscription whose plan is unresolved by its status, not as active",
		(status, copy) => {
			mockStatus({
				subscriptionStatus: status,
				stripeCustomerId: "cus_test",
				stripePriceId: "price_legacy_comp",
				currentPeriodEnd: "2026-06-15T12:00:00Z",
				cancelAtPeriodEnd: false,
			});
			render(<BillingPlansPage />);

			expect(screen.getByText(copy)).toBeInTheDocument();
			expect(
				screen.queryByText(/you have an active subscription/i),
			).not.toBeInTheDocument();
		},
	);

	// Main session, Part 8m: a known plan is named with its status beside it.
	// "You are currently on the Growth plan" read the same for an unpaid owner,
	// whom the proxy locks out, as for an active one.
	it.each([
		["active", "You are currently on the Growth plan"],
		["trialing", "You are currently on the Growth plan"],
		["past_due", "Your Growth subscription is past due"],
		["unpaid", "Your Growth subscription is unpaid"],
		["paused", "Your Growth subscription is paused"],
		["incomplete", "Your Growth subscription is incomplete"],
	])(
		"names a %s subscription's known plan with its status: %s",
		(status, copy) => {
			mockStatus({
				subscriptionStatus: status,
				stripeCustomerId: "cus_test",
				stripePriceId: "price_1TVTaIP3WCR53SdoqnUe1Inv",
				currentPeriodEnd: "2026-06-15T12:00:00Z",
				cancelAtPeriodEnd: false,
			});
			render(<BillingPlansPage />);

			expect(screen.getByText(copy)).toBeInTheDocument();
			expect(screen.getByText("Current Plan: Growth")).toBeInTheDocument();
		},
	);

	it("goes back to billing settings, which an owner whose plan has lapsed still reaches", () => {
		mockStatus({
			subscriptionStatus: "canceled",
			stripeCustomerId: "cus_test",
			stripePriceId: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
		});
		render(<BillingPlansPage />);

		expect(
			screen.getByRole("link", { name: /back to billing settings/i }),
		).toHaveAttribute("href", "/settings?tab=billing");
		expect(screen.queryByRole("link", { name: /dashboard/i })).toBeNull();
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
