import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeAnchorRuleReach } from "#test/utils/base-rule-cascade";
import { SubscriptionStatusBanner } from "../subscription-status-banner";

const mockUseSubscriptionStatus = vi.fn();

vi.mock("#hooks/api/use-billing", () => ({
	useSubscriptionStatus: () => mockUseSubscriptionStatus(),
}));

describe("SubscriptionStatusBanner", () => {
	it("renders nothing when loading", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		const { container } = render(<SubscriptionStatusBanner />);
		expect(container.innerHTML).toBe("");
	});

	it("renders nothing when the subscription query errors (does not fall through to upsell)", () => {
		// Battle-test Session 9 P1 regression guard: paid users with a
		// transient subscription-query failure were seeing the blue
		// "Start your subscription" upsell. Fix: skip the banner on
		// isError. BillingSettings owns the explicit error UI surface.
		mockUseSubscriptionStatus.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("PGRST301: JWT expired"),
		});

		const { container } = render(<SubscriptionStatusBanner />);
		expect(container.innerHTML).toBe("");
		expect(
			screen.queryByText(/start your subscription/i),
		).not.toBeInTheDocument();
	});

	it("renders info banner when subscription is null (no stripe customer)", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: null,
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/start your subscription/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /view plans/i });
		expect(link).toHaveAttribute("href", "/pricing");
	});

	it("renders info banner when subscriptionStatus is null (has stripe customer but no sub)", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: null,
				stripeCustomerId: "cus_123",
				stripePriceId: null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/start your subscription/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /view plans/i });
		expect(link).toHaveAttribute("href", "/pricing");
	});

	it("renders nothing when status is active", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "active",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		});

		const { container } = render(<SubscriptionStatusBanner />);
		expect(container.innerHTML).toBe("");
	});

	it("renders warning banner when status is past_due", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "past_due",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /update billing/i });
		expect(link).toHaveAttribute("href", "/settings?tab=billing");
	});

	it("renders trial banner with days remaining when status is trialing", () => {
		const trialEndsAt = new Date(
			Date.now() + 5 * 24 * 60 * 60 * 1000,
		).toISOString();
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "trialing",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
				trialEndsAt,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/5 days left in your trial/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /upgrade/i });
		expect(link).toHaveAttribute("href", "/billing/plans?source=trial_banner");
	});

	it('uses singular "day" when one day remains', () => {
		const trialEndsAt = new Date(
			Date.now() + 12 * 60 * 60 * 1000,
		).toISOString();
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "trialing",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
				trialEndsAt,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/1 day left in your trial/i)).toBeInTheDocument();
	});

	it("shows ended message when trial is in the past", () => {
		const trialEndsAt = new Date(
			Date.now() - 2 * 24 * 60 * 60 * 1000,
		).toISOString();
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "trialing",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
				trialEndsAt,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/your trial ended/i)).toBeInTheDocument();
	});

	it("renders generic trial banner when trialing but trial_ends_at is missing", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "trialing",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
				trialEndsAt: null,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/on a free trial/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /upgrade/i });
		expect(link).toHaveAttribute("href", "/billing/plans?source=trial_banner");
	});

	it("renders destructive lock banner when status is unpaid", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "unpaid",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/subscription is inactive/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /reactivate/i });
		expect(link).toHaveAttribute("href", "/billing/plans");
	});

	it("renders destructive lock banner when status is canceled", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "canceled",
				stripeCustomerId: "cus_123",
				stripePriceId: "price_123",
				currentPeriodEnd: "2026-04-01",
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/subscription is inactive/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /reactivate/i });
		expect(link).toHaveAttribute("href", "/billing/plans");
	});

	it("renders destructive lock banner when status is expired (trial lapsed)", () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "expired",
				stripeCustomerId: null,
				stripePriceId: null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		});

		render(<SubscriptionStatusBanner />);

		expect(screen.getByText(/subscription is inactive/i)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /reactivate/i });
		expect(link).toHaveAttribute("href", "/billing/plans");
	});

	// The base `a` rule (globals.css) colors a text link primary, which beat the
	// banner color the link was meant to inherit: in the rendered app
	// "Reactivate" read 3.99:1 (primary on destructive/10) and "Upgrade" 4.13:1
	// (primary on primary/10), light theme (66.2-39 fix round 4, Part 8i). Each
	// link the rule reaches carries its banner's AA -text color itself.
	it("gives each banner link its banner's -text color, which the base link rule would override", () => {
		const states: [string, unknown, RegExp][] = [
			["null", null, /view plans/i],
			[
				"trialing",
				{
					subscriptionStatus: "trialing",
					stripeCustomerId: null,
					stripePriceId: null,
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false,
					trialEndsAt: null,
				},
				/upgrade/i,
			],
			[
				"past_due",
				{
					subscriptionStatus: "past_due",
					stripeCustomerId: "cus_123",
					stripePriceId: null,
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false,
					trialEndsAt: null,
				},
				/update billing/i,
			],
			[
				"canceled",
				{
					subscriptionStatus: "canceled",
					stripeCustomerId: "cus_123",
					stripePriceId: null,
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false,
					trialEndsAt: null,
				},
				/reactivate/i,
			],
		];
		for (const [label, data, name] of states) {
			cleanup();
			mockUseSubscriptionStatus.mockReturnValue({ data, isLoading: false });
			render(<SubscriptionStatusBanner />);
			const link = screen.getByRole("link", { name });
			const reach = computeAnchorRuleReach(link);
			expect(reach.baseline.rest, label).toBe(true);
			expect(reach.rest, label).toBe(true);
			const banner = link.parentElement as HTMLElement;
			const tone = banner.className.match(/\btext-(\w+)-text\b/)?.[0];
			expect(tone, label).toMatch(
				/^text-(info|primary|warning|destructive)-text$/,
			);
			expect(link.className.split(/\s+/), label).toContain(tone);
		}
	});
});
