/**
 * Tests for BillingSettings empty-state branches.
 *
 * The component has 5 mutually-exclusive empty-state branches plus a loading
 * skeleton: active-with-plan, unknown-priceId (Sentry-logged), trialing-
 * without-priceId, resubscribe (7 statuses), and no-subscription. Each
 * branch is exercised below.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	captureMessageMock,
	useSubscriptionStatusMock,
	useUserMock,
	portalMutate,
	routerPush,
} = vi.hoisted(() => ({
	captureMessageMock: vi.fn(),
	useSubscriptionStatusMock: vi.fn(),
	useUserMock: vi.fn(),
	portalMutate: vi.fn(),
	routerPush: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
	captureMessage: captureMessageMock,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: routerPush, replace: vi.fn() }),
}));

vi.mock("#hooks/api/use-billing", () => ({
	useSubscriptionStatus: (...args: unknown[]) =>
		useSubscriptionStatusMock(...args),
	useBillingHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock("#hooks/api/use-billing-mutations", () => ({
	useBillingPortalMutation: () => ({ mutate: portalMutate, isPending: false }),
}));

vi.mock("#hooks/api/use-auth", () => ({
	useUser: (...args: unknown[]) => useUserMock(...args),
}));

vi.mock("#components/settings/sections/subscription-cancel-section", () => ({
	SubscriptionCancelSection: () => null,
}));

vi.mock("#components/settings/sections/billing-history-section", () => ({
	BillingHistorySection: () => null,
}));

vi.mock("#components/ui/border-beam", () => ({
	BorderBeam: () => null,
}));

function renderWithProviders(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}

async function getBillingSettings() {
	const mod = await import("../billing-settings");
	return mod.BillingSettings;
}

describe("BillingSettings empty-state branches", () => {
	beforeEach(() => {
		useSubscriptionStatusMock.mockReset();
		useUserMock.mockReset();
		portalMutate.mockReset();
		routerPush.mockReset();
		captureMessageMock.mockReset();
	});

	it("renders the active-with-plan branch (Growth)", async () => {
		useSubscriptionStatusMock.mockReturnValue({
			data: {
				subscriptionStatus: "active",
				stripePriceId: "price_1TVTaIP3WCR53SdoqnUe1Inv",
				currentPeriodEnd: "2026-06-01T00:00:00.000Z",
				stripeCustomerId: "cus_growth",
				cancelAtPeriodEnd: false,
				trialEndsAt: null,
			},
			isLoading: false,
		});
		useUserMock.mockReturnValue({
			data: { stripe_customer_id: "cus_growth" },
		});

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(screen.getByText("Growth")).toBeInTheDocument();
		expect(screen.getByText("$49")).toBeInTheDocument();
		expect(screen.getByText(/Up to 100 units/)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Manage Plan" }),
		).toBeInTheDocument();
	});

	it("renders the trialing-without-priceId branch with Choose a plan link", async () => {
		useSubscriptionStatusMock.mockReturnValue({
			data: {
				subscriptionStatus: "trialing",
				stripePriceId: null,
				currentPeriodEnd: null,
				stripeCustomerId: null,
				cancelAtPeriodEnd: false,
				trialEndsAt: "2026-06-01T00:00:00.000Z",
			},
			isLoading: false,
		});
		useUserMock.mockReturnValue({ data: { stripe_customer_id: null } });

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(screen.getByText("Free trial")).toBeInTheDocument();
		expect(screen.getByText("Trial")).toBeInTheDocument();
		expect(screen.getByText(/Your trial is active/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Choose a plan/ })).toHaveAttribute(
			"href",
			"/billing/plans",
		);
		expect(
			screen.getByRole("button", { name: "Choose a Plan" }),
		).toBeInTheDocument();
	});

	it("renders the trialing-with-unknown-priceId branch (no copy gap)", async () => {
		// Cycle-1 P2 regression guard: prior to this fix, a trialing user with
		// an unknown stripePriceId fell through to no helper copy (the trialing
		// branch required `!stripePriceId`, the unified branch required
		// `status === "active"`). Both now widen to cover this state.
		useSubscriptionStatusMock.mockReturnValue({
			data: {
				subscriptionStatus: "trialing",
				stripePriceId: "price_1LegacyTrialingFoo",
				currentPeriodEnd: "2026-06-01T00:00:00.000Z",
				stripeCustomerId: "cus_legacy_trial",
				cancelAtPeriodEnd: false,
				trialEndsAt: "2026-06-01T00:00:00.000Z",
			},
			isLoading: false,
		});
		useUserMock.mockReturnValue({
			data: { stripe_customer_id: "cus_legacy_trial" },
		});

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(screen.getByText("Free trial")).toBeInTheDocument();
		expect(screen.getByText("Trial")).toBeInTheDocument();
		expect(screen.getByText(/Your trial is active/)).toBeInTheDocument();
	});

	it("renders the unknown-priceId branch and logs the unrecoverable state to Sentry", async () => {
		useSubscriptionStatusMock.mockReturnValue({
			data: {
				subscriptionStatus: "active",
				stripePriceId: "price_1LegacyBeta00",
				currentPeriodEnd: "2026-06-01T00:00:00.000Z",
				stripeCustomerId: "cus_legacy",
				cancelAtPeriodEnd: false,
				trialEndsAt: null,
			},
			isLoading: false,
		});
		useUserMock.mockReturnValue({
			data: { stripe_customer_id: "cus_legacy" },
		});

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(screen.getByText("Active subscription")).toBeInTheDocument();
		expect(screen.getByText("Active")).toBeInTheDocument();
		expect(
			screen.getByText(/Plan details will sync shortly/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Contact support/ }),
		).toHaveAttribute("href", "/contact");

		expect(captureMessageMock).toHaveBeenCalledWith(
			"BillingSettings: planIdentifier did not match any PRICING_PLANS entry",
			expect.objectContaining({
				level: "warning",
				tags: { component: "BillingSettings" },
				extra: {
					planIdentifier: "price_1LegacyBeta00",
					subscriptionStatus: "active",
				},
			}),
		);
	});

	const RESUBSCRIBE_CASES = [
		{
			status: "past_due",
			badge: "Past Due",
			copy: /Your subscription is past due/,
		},
		{ status: "unpaid", badge: "Unpaid", copy: /Your subscription is unpaid/ },
		{
			status: "canceled",
			badge: "Canceled",
			copy: /Your subscription is canceled/,
		},
		{
			status: "cancelled",
			badge: "Canceled",
			copy: /Your subscription is canceled/,
		},
		{
			status: "incomplete",
			badge: "Incomplete",
			copy: /Your subscription is incomplete/,
		},
		{
			status: "incomplete_expired",
			badge: "Expired",
			copy: /Your subscription is expired/,
		},
		{ status: "paused", badge: "Paused", copy: /Your subscription is paused/ },
	] as const;

	it.each(
		RESUBSCRIBE_CASES,
	)("renders the resubscribe branch for $status subscriptions", async ({
		status,
		badge,
		copy,
	}) => {
		useSubscriptionStatusMock.mockReturnValue({
			data: {
				subscriptionStatus: status,
				stripePriceId: "price_1TVTaIP3WCR53SdoqnUe1Inv",
				currentPeriodEnd: null,
				stripeCustomerId: `cus_${status}`,
				cancelAtPeriodEnd: false,
				trialEndsAt: null,
			},
			isLoading: false,
		});
		useUserMock.mockReturnValue({
			data: { stripe_customer_id: `cus_${status}` },
		});

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(screen.getByText(badge)).toBeInTheDocument();
		expect(screen.getByText(copy)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Resubscribe" })).toHaveAttribute(
			"href",
			"/billing/plans",
		);
	});

	it("renders the no-subscription branch (Upgrade to unlock copy)", async () => {
		useSubscriptionStatusMock.mockReturnValue({
			data: {
				subscriptionStatus: null,
				stripePriceId: null,
				currentPeriodEnd: null,
				stripeCustomerId: null,
				cancelAtPeriodEnd: false,
				trialEndsAt: null,
			},
			isLoading: false,
		});
		useUserMock.mockReturnValue({ data: { stripe_customer_id: null } });

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(screen.getByText("No plan")).toBeInTheDocument();
		expect(screen.getByText("No Subscription")).toBeInTheDocument();
		expect(
			screen.getByText(/Upgrade to unlock premium features/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Choose a Plan" }),
		).toBeInTheDocument();
	});

	it("shows loading skeleton while subscription status is fetching", async () => {
		useSubscriptionStatusMock.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		useUserMock.mockReturnValue({ data: null });

		const BillingSettings = await getBillingSettings();
		const { container } = renderWithProviders(<BillingSettings />);

		const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
		expect(skeletons.length).toBeGreaterThanOrEqual(3);
		expect(
			screen.queryByText(/Billing & Subscription/),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Current Plan")).not.toBeInTheDocument();
	});

	it("renders the auth-error branch with a Sign in again link", async () => {
		// Battle-test Session 6 P2: when useSubscriptionStatus throws an
		// auth error, the plan card must NOT silently fall through to
		// "No plan" — it must surface the auth failure with a recovery path.
		useSubscriptionStatusMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Not authenticated"),
			refetch: vi.fn(),
		});
		useUserMock.mockReturnValue({ data: undefined });

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(
			screen.getByText(/Your session appears to have expired/),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Sign in again/ })).toHaveAttribute(
			"href",
			"/login?redirect=%2Fsettings%3Ftab%3Dbilling",
		);
		// "No plan" empty-state must NOT render alongside the error.
		expect(screen.queryByText("No plan")).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Upgrade to unlock premium features/),
		).not.toBeInTheDocument();
	});

	it("renders the generic-error branch with a working Retry button", async () => {
		const refetchMock = vi.fn();
		useSubscriptionStatusMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("PGRST116: network failure"),
			refetch: refetchMock,
		});
		useUserMock.mockReturnValue({ data: undefined });

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		expect(
			screen.getByText(/Subscription details unavailable/),
		).toBeInTheDocument();
		const retry = screen.getByRole("button", { name: /Retry/ });
		expect(retry).toBeInTheDocument();
		retry.click();
		expect(refetchMock).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("link", { name: /contact support/ }),
		).toHaveAttribute("href", "/contact");
	});

	it("classifies non-Error thrown values via String() coercion", async () => {
		// Defensive: TanStack Query can hold any thrown value, not just
		// Error instances. The regex runs against String(statusError).
		useSubscriptionStatusMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: "JWT expired",
			refetch: vi.fn(),
		});
		useUserMock.mockReturnValue({ data: undefined });

		const BillingSettings = await getBillingSettings();
		renderWithProviders(<BillingSettings />);

		// "JWT expired" matches the auth-error regex even as a raw string.
		expect(
			screen.getByText(/Your session appears to have expired/),
		).toBeInTheDocument();
	});
});
