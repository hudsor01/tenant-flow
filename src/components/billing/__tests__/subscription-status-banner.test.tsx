import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeAnchorRuleReach } from "#test/utils/base-rule-cascade";
import { SubscriptionStatusBanner } from "../subscription-status-banner";

const mockUseSubscriptionStatus = vi.fn();

vi.mock("#hooks/api/use-billing", () => ({
	useSubscriptionStatus: () => mockUseSubscriptionStatus(),
}));

// What the proxy does for these statuses: every owner page but Settings (and
// the plan pages) sends them to /pricing (66.2-39 fix round 4, Part 8l).
const LAPSED_COPY =
	"Your subscription is inactive. Other pages need an active plan; Settings stays open so you can download your data, request account deletion or resubscribe.";

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

		// Stripe's failed-payment setting decides whether its retries end in
		// unpaid or canceled, and both lock the owner out: the copy says what is
		// true either way (main session, Part 8m). It said access was lost "when
		// your subscription is canceled".
		expect(
			screen.getByText(
				"Your subscription payment failed. Update your payment method to keep access.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText(/canceled/i)).toBeNull();
		const link = screen.getByRole("link", { name: /update billing/i });
		expect(link).toHaveAttribute("href", "/settings?tab=billing");
	});

	// A signup trial names no plan (set_trial_on_signup sets only the status
	// and its end), so it is told to choose one.
	it("renders trial banner with days remaining when status is trialing", () => {
		const trialEndsAt = new Date(
			Date.now() + 5 * 24 * 60 * 60 * 1000,
		).toISOString();
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: "trialing",
				stripeCustomerId: "cus_123",
				stripePriceId: null,
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
				stripePriceId: null,
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
				stripePriceId: null,
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
				stripePriceId: null,
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

	// 66.2-39 fix round 4, Part 8n: a trial of a chosen plan (stripe-checkout's
	// carry-over trial, whose row names the plan) needs no upgrade; Stripe
	// cancels it at the end without a payment method on file and bills the
	// plan with one. It was told to "upgrade to keep access".
	it.each([
		[
			5 * 24 * 60 * 60 * 1000,
			"5 days left in your trial. Without a payment method on file when the trial ends, your subscription is canceled.",
		],
		[
			12 * 60 * 60 * 1000,
			"1 day left in your trial. Without a payment method on file when the trial ends, your subscription is canceled.",
		],
		[
			-2 * 24 * 60 * 60 * 1000,
			"Your trial has ended. Without a payment method on file, your subscription is canceled.",
		],
		[
			null,
			"Your plan's trial is on. Without a payment method on file when the trial ends, your subscription is canceled.",
		],
	])(
		"tells a trial of a chosen plan what happens at its end (%s ms left)",
		(offset, copy) => {
			mockUseSubscriptionStatus.mockReturnValue({
				data: {
					subscriptionStatus: "trialing",
					stripeCustomerId: "cus_123",
					stripePriceId: "growth",
					currentPeriodEnd: "2026-04-01",
					cancelAtPeriodEnd: false,
					trialEndsAt:
						offset === null
							? null
							: new Date(Date.now() + offset).toISOString(),
				},
				isLoading: false,
			});

			render(<SubscriptionStatusBanner />);

			expect(screen.getByText(copy)).toBeInTheDocument();
			expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument();
			const link = screen.getByRole("link", { name: "Update billing" });
			expect(link).toHaveAttribute("href", "/settings?tab=billing");
		},
	);

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

		expect(screen.getByText(LAPSED_COPY)).toBeInTheDocument();
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

		expect(screen.getByText(LAPSED_COPY)).toBeInTheDocument();
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

		expect(screen.getByText(LAPSED_COPY)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /reactivate/i });
		expect(link).toHaveAttribute("href", "/billing/plans");
	});

	// Main session, Part 8m: at 320 the lapsed banner's text ran 8 lines in a
	// 144px column beside the icon and the link. All four banners share one
	// layout: a grid that puts the link under the text, beside the icon, until
	// the banner is 22rem wide, where the row with the link beside the text is
	// no taller (measured on the rendered banners), and the row from there.
	it("lays every banner out once: the link under the text until 22rem, then beside it", () => {
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
				"trialing a chosen plan",
				{
					subscriptionStatus: "trialing",
					stripeCustomerId: "cus_123",
					stripePriceId: "growth",
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false,
					trialEndsAt: null,
				},
				/update billing/i,
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
		const layouts = new Set<string>();
		for (const [label, data, name] of states) {
			cleanup();
			mockUseSubscriptionStatus.mockReturnValue({ data, isLoading: false });
			render(<SubscriptionStatusBanner />);
			const link = screen.getByRole("link", { name });
			const banner = link.parentElement as HTMLElement;
			const classes = banner.className.split(/\s+/);
			for (const cls of [
				"grid",
				"grid-cols-[auto_1fr]",
				"gap-x-3",
				"gap-y-2",
				"@min-[22rem]/status-banner:flex",
			]) {
				expect(classes, `${label}: ${cls}`).toContain(cls);
			}
			expect(classes, label).not.toContain("flex");
			expect(link.className.split(/\s+/), label).toContain("col-start-2");
			expect(
				(banner.parentElement as HTMLElement).className.split(/\s+/),
				label,
			).toContain("@container/status-banner");
			// One class set: the layout classes are the same on all four.
			layouts.add(
				classes
					.filter(
						(c) =>
							!/^(border|bg|text)-(info|primary|warning|destructive)/.test(c),
					)
					.join(" "),
			);
		}
		expect([...layouts]).toHaveLength(1);
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
				"trialing a chosen plan",
				{
					subscriptionStatus: "trialing",
					stripeCustomerId: "cus_123",
					stripePriceId: "growth",
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false,
					trialEndsAt: null,
				},
				/update billing/i,
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
