/**
 * @vitest-environment jsdom
 * Stripe Checkout's success page offers the dashboard only once the owner's
 * status is one the proxy admits (main session, 66.2-39 fix round 4, Part 8m).
 *
 * It offered "Go to Dashboard" at once, but Stripe sends the owner here before
 * its webhook has written `users.subscription_status`; pressed then, the link
 * reached the proxy with the old status, and a lapsed owner went to /pricing.
 * The page reads the status through the existing query, refetching at a
 * bounded interval for a bounded time, and offers Billing Settings, which
 * the proxy never gates by subscription, until then and after the bound.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscriptionStatusKey } from "#hooks/api/query-keys/subscription-keys";

const { reads, statuses } = vi.hoisted(() => ({
	reads: { count: 0 },
	/** The status each read returns, in order (the last one repeats). */
	statuses: { list: [] as (string | null)[] },
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "00000000-0000-4000-8000-000000000001" }),
}));

vi.mock("#lib/supabase/client", async () => {
	const { createQueryChain } = await import("#test/mocks/supabase-query-mock");
	return {
		createClient: () => ({
			from: () => {
				const status =
					statuses.list[Math.min(reads.count, statuses.list.length - 1)] ??
					null;
				reads.count += 1;
				return createQueryChain({
					data: {
						stripe_customer_id: null,
						trial_ends_at: null,
						subscription_status: status,
					},
					error: null,
				});
			},
		}),
	};
});

import CheckoutSuccessPage from "./page";

function renderPage(queryClient = newClient()) {
	return render(
		<QueryClientProvider client={queryClient}>
			<CheckoutSuccessPage />
		</QueryClientProvider>,
	);
}

function newClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
}

/**
 * Lets the timers and the reads they start run, `ms` of fake time. A read the
 * interval starts schedules its notification (TanStack's notifyManager) with
 * a zero-delay timer, which the fake clock sets 1 ms ahead when it is added
 * during a tick, so one more millisecond delivers it.
 */
async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
		await vi.advanceTimersByTimeAsync(1);
	});
}

const dashboardLink = () => screen.queryByRole("link", { name: /dashboard/i });
const billingLink = () =>
	screen.queryByRole("link", { name: "Go to Billing Settings" });

beforeEach(() => {
	vi.useFakeTimers();
	reads.count = 0;
	statuses.list = [];
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("/billing/checkout/success", () => {
	it("before the status is admitted: says the plan is being activated, offers Billing Settings, no dashboard", async () => {
		statuses.list = ["expired"];
		renderPage();
		await advance(0);

		expect(screen.getByText("Activating your plan")).toBeInTheDocument();
		expect(dashboardLink()).toBeNull();
		expect(billingLink()).toHaveAttribute("href", "/settings?tab=billing");
		expect(screen.queryByText(/Subscription Activated/)).toBeNull();
	});

	it("once a read says the status is admitted: the dashboard link, and the reads stop", async () => {
		statuses.list = ["expired", "active"];
		renderPage();
		await advance(0);
		expect(dashboardLink()).toBeNull();

		await advance(3_000);
		expect(dashboardLink()).toHaveAttribute("href", "/dashboard");
		expect(screen.getByText("Subscription Activated!")).toBeInTheDocument();
		expect(reads.count).toBe(2);

		await advance(30_000);
		expect(reads.count).toBe(2);
	});

	it.each(["active", "trialing", "past_due"])(
		"%s, which the proxy admits, offers the dashboard",
		async (status) => {
			statuses.list = [status];
			renderPage();
			await advance(0);
			expect(dashboardLink()).toHaveAttribute("href", "/dashboard");
		},
	);

	it.each(["unpaid", "canceled", "incomplete", "paused", "expired", null])(
		"%s, which the proxy does not admit, never offers it",
		async (status) => {
			statuses.list = [status];
			renderPage();
			await advance(0);
			expect(dashboardLink()).toBeNull();
			expect(billingLink()).toHaveAttribute("href", "/settings?tab=billing");
		},
	);

	it("does not trust a status cached before the page loaded", async () => {
		const queryClient = newClient();
		queryClient.setQueryData(
			subscriptionStatusKey,
			{
				subscriptionStatus: "active",
				stripeCustomerId: null,
				stripePriceId: null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false,
				trialEndsAt: null,
			},
			{ updatedAt: Date.now() - 60_000 },
		);
		statuses.list = ["expired"];
		renderPage(queryClient);
		expect(dashboardLink()).toBeNull();

		await advance(0);
		expect(reads.count).toBe(1);
		expect(dashboardLink()).toBeNull();
		expect(screen.getByText("Activating your plan")).toBeInTheDocument();
	});

	it("when the bound runs out: says activation is taking longer than usual, keeps Billing Settings, stops reading", async () => {
		statuses.list = ["expired"];
		renderPage();
		await advance(0);
		expect(
			screen.queryByText("Activation is taking longer than usual"),
		).toBeNull();

		await advance(60_000);
		expect(
			screen.getByText("Activation is taking longer than usual"),
		).toBeInTheDocument();
		expect(dashboardLink()).toBeNull();
		expect(billingLink()).toHaveAttribute("href", "/settings?tab=billing");
		const atBound = reads.count;
		expect(atBound).toBeGreaterThan(1);
		expect(atBound).toBeLessThanOrEqual(21);

		await advance(60_000);
		expect(reads.count).toBe(atBound);
	});
});
