"use client";

import * as Sentry from "@sentry/nextjs";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BillingHistorySection } from "#components/settings/sections/billing-history-section";
import { SubscriptionCancelSection } from "#components/settings/sections/subscription-cancel-section";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import { Skeleton } from "#components/ui/skeleton";
import { getAllPricingPlans, type PricingConfig } from "#config/pricing";
import { useUser } from "#hooks/api/use-auth";
import { useSubscriptionStatus } from "#hooks/api/use-billing";
import { useBillingPortalMutation } from "#hooks/api/use-billing-mutations";

// Resolve a plan from the `subscription_plan` column. The Stripe webhook
// handlers write `subscription_plan: tier ?? planLookup ?? priceId`, so the
// stored value can be a tier slug ("max", "growth", "starter", "trial"), a
// Stripe price_id ("price_1TVT..."), or the raw price_id from Stripe — in
// roughly that order of preference. Match all three forms so the Billing UI
// never falls through to "No plan" just because the column happens to hold a
// slug instead of a price_id (battle-test Session 10/11 P1: a paid user
// with `subscription_plan = "max"` was mislabeled as "No plan" because the
// lookup only recognized price_ids).
function findPlanByPlanIdentifier(identifier: string | null): {
	plan: PricingConfig | null;
	period: "monthly" | "annual" | null;
} {
	if (!identifier) return { plan: null, period: null };
	for (const plan of getAllPricingPlans()) {
		if (plan.stripePriceIds.monthly === identifier) {
			return { plan, period: "monthly" };
		}
		if (plan.stripePriceIds.annual === identifier) {
			return { plan, period: "annual" };
		}
		// Tier-slug match. We don't know the period (slug doesn't encode
		// month vs annual); leave it null and let downstream code render
		// the plan name without a period qualifier.
		if (plan.planId === identifier) {
			return { plan, period: null };
		}
	}
	return { plan: null, period: null };
}

function formatUnitLimit(units: number): string {
	return units === -1 ? "Unlimited units" : `Up to ${units} units`;
}

function formatNextBillingDate(currentPeriodEnd: string | null): string | null {
	if (!currentPeriodEnd) return null;
	const date = new Date(currentPeriodEnd);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

// Resolve the plan-card title so the heading never contradicts the status
// badge (the prior "No plan" + "Active" bug). Cases ordered by specificity:
// known plan → trial → active-without-plan (synthetic / sync-lag) → no plan.
function resolvePlanTitle(
	status: string | null,
	isActive: boolean,
	currentPlan: PricingConfig | null,
): string {
	if (isActive && currentPlan) return currentPlan.name;
	if (status === "trialing") return "Free trial";
	if (isActive) return "Active subscription";
	return "No plan";
}

const STATUS_BADGE_VARIANTS = {
	active: {
		label: "Active",
		className:
			"bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
	},
	trialing: {
		label: "Trial",
		className:
			"bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
	},
	past_due: {
		label: "Past Due",
		className:
			"bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
	},
	unpaid: {
		label: "Unpaid",
		className:
			"bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
	},
	canceled: {
		label: "Canceled",
		className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
	},
	incomplete: {
		label: "Incomplete",
		className: "bg-muted text-muted-foreground",
	},
	incomplete_expired: {
		label: "Expired",
		className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
	},
	paused: { label: "Paused", className: "bg-muted text-muted-foreground" },
	// Written by `expire_trials()` when a DB-managed trial lapses — the cohort
	// that most needs the resubscribe treatment (BILL-11).
	expired: {
		label: "Trial Expired",
		className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
	},
} as const satisfies Record<string, { label: string; className: string }>;

const NO_SUBSCRIPTION_VARIANT = {
	label: "No Subscription",
	className: "bg-muted text-muted-foreground",
} as const;

function getStatusVariant(status: string | null): {
	label: string;
	className: string;
} {
	if (status && status in STATUS_BADGE_VARIANTS) {
		return STATUS_BADGE_VARIANTS[status as keyof typeof STATUS_BADGE_VARIANTS];
	}
	return NO_SUBSCRIPTION_VARIANT;
}

function StatusBadge({ status }: { status: string | null }) {
	const variant = getStatusVariant(status);
	return (
		<span className={`text-xs ${variant.className} px-2 py-0.5 rounded-full`}>
			{variant.label}
		</span>
	);
}

const RESUBSCRIBE_STATUSES = new Set([
	"past_due",
	"unpaid",
	"canceled",
	"incomplete",
	"incomplete_expired",
	"paused",
	"expired",
]);

export function BillingSettings() {
	const router = useRouter();
	const {
		data: subscriptionStatus,
		isLoading: statusLoading,
		isError: statusIsError,
		error: statusError,
		refetch: refetchStatus,
	} = useSubscriptionStatus();
	const { data: user } = useUser();

	const createPortalSession = useBillingPortalMutation();

	const isLoading = statusLoading;
	const status = subscriptionStatus?.subscriptionStatus ?? null;
	const isActive = status === "active" || status === "trialing";
	// `planIdentifier` is whatever the Stripe webhook last wrote to
	// users.subscription_plan: a tier slug ('starter'/'growth'/'max') OR
	// a Stripe price_id (`price_*`). Cycle-1 review caught the legacy
	// name `stripePriceId` was misleading after #1+#2+#5 fixed the
	// predicate to accept both shapes.
	const planIdentifier = subscriptionStatus?.stripePriceId ?? null;
	const { plan: currentPlan, period: currentPeriod } =
		findPlanByPlanIdentifier(planIdentifier);
	const nextBillingDate = formatNextBillingDate(
		subscriptionStatus?.currentPeriodEnd ?? null,
	);
	const hasUnknownPlanIdentifier =
		isActive && planIdentifier !== null && currentPlan === null;
	const isResubscribeState =
		status !== null && RESUBSCRIBE_STATUSES.has(status);
	const hasStripeCustomer = Boolean(user?.stripe_customer_id);
	const statusVariant = getStatusVariant(status);

	useEffect(() => {
		if (hasUnknownPlanIdentifier) {
			Sentry.captureMessage(
				"BillingSettings: planIdentifier did not match any PRICING_PLANS entry",
				{
					level: "warning",
					tags: { component: "BillingSettings" },
					extra: { planIdentifier, subscriptionStatus: status },
				},
			);
		}
	}, [hasUnknownPlanIdentifier, planIdentifier, status]);

	const handlePrimaryAction = () => {
		if (hasStripeCustomer) {
			createPortalSession.mutate();
		} else {
			router.push("/billing/plans");
		}
	};

	const primaryActionLabel = hasStripeCustomer
		? "Manage Plan"
		: "Choose a Plan";

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="mb-6">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-40 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		);
	}

	// Surface query errors explicitly instead of falling through to the
	// "No plan" empty state — silently rendering "No plan" when the query
	// actually errored hides auth/network problems and looks like a data
	// issue the user can't act on (battle-test Session 6 P2: synthetic
	// owner whose getCachedUser() fallback failed saw "No plan" instead
	// of a real error). The auth-error variant offers a re-sign-in path;
	// other errors offer retry.
	if (statusIsError) {
		const errorMessage =
			statusError instanceof Error ? statusError.message : String(statusError);
		const isAuthError = /not authenticated|jwt|unauthorized/i.test(
			errorMessage,
		);
		return (
			<div className="space-y-6">
				<BlurFade delay={0.1} inView>
					<div className="mb-6">
						<h2 className="text-lg font-semibold">Billing & Subscription</h2>
						<p className="text-sm text-muted-foreground">
							We couldn&apos;t load your subscription details.
						</p>
					</div>
				</BlurFade>
				<section className="rounded-lg border bg-card p-6">
					<p className="text-sm text-muted-foreground">
						{isAuthError ? (
							<>
								Your session appears to have expired.{" "}
								<Link
									href="/login?redirect=%2Fsettings%3Ftab%3Dbilling"
									className="text-primary-text hover:underline underline-offset-4"
								>
									Sign in again
								</Link>{" "}
								to view your subscription.
							</>
						) : (
							<>
								Subscription details unavailable.{" "}
								<button
									type="button"
									onClick={() => refetchStatus()}
									className="text-primary-text hover:underline underline-offset-4"
								>
									Retry
								</button>{" "}
								or{" "}
								<Link
									href="/contact"
									className="text-primary-text hover:underline underline-offset-4"
								>
									contact support
								</Link>{" "}
								if this persists.
							</>
						)}
					</p>
				</section>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Billing & Subscription</h2>
					<p className="text-sm text-muted-foreground">
						Manage your subscription and payment methods
					</p>
				</div>
			</BlurFade>

			{/* Current Plan */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6 relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="var(--color-primary)"
						colorTo="oklch(from var(--color-primary) l c h / 0.3)"
					/>
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Current Plan
					</h3>

					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<h4 className="text-xl font-bold">
									{resolvePlanTitle(status, isActive, currentPlan)}
								</h4>
								<StatusBadge status={status} />
							</div>
							{isActive && currentPlan && (
								<>
									<p className="text-2xl font-bold text-primary">
										$
										{currentPeriod === "annual"
											? currentPlan.price.annual
											: currentPlan.price.monthly}
										<span className="text-sm font-normal text-muted-foreground">
											/{currentPeriod === "annual" ? "year" : "month"}
										</span>
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{formatUnitLimit(currentPlan.limits.units)} · Unlimited
										tenant records
									</p>
									{/* Session 12 P3: don't drop the row entirely when
									    subscription_current_period_end is null — that reads as
									    "missing" instead of "syncing". Surface a deferred
									    helper string so the user knows it's pending. Cycle-1
									    review added the Contact-support escape hatch so an
									    indefinitely-stale webhook isn't masked as "still
									    syncing" forever (mirrors the "Plan details will sync
									    shortly" copy below). */}
									{nextBillingDate ? (
										<p className="text-xs text-muted-foreground mt-2">
											Next billing date: {nextBillingDate}
										</p>
									) : (
										<p className="text-xs text-muted-foreground mt-2">
											Billing cycle syncing from Stripe…{" "}
											<Link
												href="/contact"
												className="text-primary-text hover:underline underline-offset-4"
											>
												Contact support
											</Link>{" "}
											if this persists.
										</p>
									)}
								</>
							)}
							{/* Active without a known plan — covers two paths:
							    (1) stripePriceId present but unknown to the local
							        pricing config (legacy/comp plan ID), and
							    (2) no stripePriceId at all (synthetic/internal
							        accounts waiting on billing webhook sync).
							    Single helpful message for both. Sentry-warns the
							    unknown-priceId variant for ops follow-up. */}
							{isActive && !currentPlan && status === "active" && (
								<p className="text-sm text-muted-foreground mt-1">
									Your account has active access. Plan details will sync
									shortly.{" "}
									<Link
										href="/contact"
										className="text-primary-text hover:underline underline-offset-4"
									>
										Contact support
									</Link>{" "}
									if this persists.
								</p>
							)}
							{/* Trialing without a known plan — fires for both
							    no-priceId AND unknown-priceId variants (the latter is
							    Sentry-warned by hasUnknownPriceId above). Either way,
							    the user is on a trial without a committed plan choice,
							    so the "Choose a plan" prompt applies. */}
							{status === "trialing" && !currentPlan && (
								<p className="text-sm text-muted-foreground mt-1">
									Your trial is active.{" "}
									<Link
										href="/billing/plans"
										className="text-primary-text hover:underline underline-offset-4"
									>
										Choose a plan
									</Link>{" "}
									to keep your account when the trial ends.
								</p>
							)}
							{isResubscribeState && (
								<p className="text-sm text-muted-foreground mt-1">
									Your subscription is {statusVariant.label.toLowerCase()}.{" "}
									<Link
										href="/billing/plans"
										className="text-primary-text hover:underline underline-offset-4"
									>
										Resubscribe
									</Link>{" "}
									to restore access.
								</p>
							)}
							{!status && (
								<p className="text-sm text-muted-foreground mt-1">
									Upgrade to unlock premium features
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={handlePrimaryAction}
								disabled={createPortalSession.isPending}
								className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
							>
								{createPortalSession.isPending ? (
									<span className="flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading...
									</span>
								) : (
									primaryActionLabel
								)}
							</button>
							<Link
								href="/billing/plans"
								className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
							>
								View All Plans
							</Link>
						</div>
					</div>
				</section>
			</BlurFade>

			<BillingHistorySection />
			<SubscriptionCancelSection />
		</div>
	);
}
