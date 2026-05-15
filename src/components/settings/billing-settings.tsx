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

function findPlanByStripePriceId(priceId: string | null): {
	plan: PricingConfig | null;
	period: "monthly" | "annual" | null;
} {
	if (!priceId) return { plan: null, period: null };
	for (const plan of getAllPricingPlans()) {
		if (plan.stripePriceIds.monthly === priceId) {
			return { plan, period: "monthly" };
		}
		if (plan.stripePriceIds.annual === priceId) {
			return { plan, period: "annual" };
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
	cancelled: {
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
	"cancelled",
	"incomplete",
	"incomplete_expired",
	"paused",
]);

export function BillingSettings() {
	const router = useRouter();
	const { data: subscriptionStatus, isLoading: statusLoading } =
		useSubscriptionStatus();
	const { data: user } = useUser();

	const createPortalSession = useBillingPortalMutation();

	const isLoading = statusLoading;
	const status = subscriptionStatus?.subscriptionStatus ?? null;
	const isActive = status === "active" || status === "trialing";
	const stripePriceId = subscriptionStatus?.stripePriceId ?? null;
	const { plan: currentPlan, period: currentPeriod } =
		findPlanByStripePriceId(stripePriceId);
	const nextBillingDate = formatNextBillingDate(
		subscriptionStatus?.currentPeriodEnd ?? null,
	);
	const hasUnknownPriceId =
		isActive && stripePriceId !== null && currentPlan === null;
	const isResubscribeState =
		status !== null && RESUBSCRIBE_STATUSES.has(status);
	const hasStripeCustomer = Boolean(user?.stripe_customer_id);
	const statusVariant = getStatusVariant(status);

	useEffect(() => {
		if (hasUnknownPriceId) {
			Sentry.captureMessage(
				"BillingSettings: stripePriceId did not match any PRICING_PLANS entry",
				{
					level: "warning",
					tags: { component: "BillingSettings" },
					extra: { stripePriceId, subscriptionStatus: status },
				},
			);
		}
	}, [hasUnknownPriceId, stripePriceId, status]);

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
									{isActive && currentPlan ? currentPlan.name : "No plan"}
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
									{nextBillingDate && (
										<p className="text-xs text-muted-foreground mt-2">
											Next billing date: {nextBillingDate}
										</p>
									)}
								</>
							)}
							{hasUnknownPriceId && (
								<p className="text-sm text-muted-foreground mt-1">
									Subscription details unavailable.{" "}
									<Link
										href="/contact"
										className="text-primary hover:underline underline-offset-4"
									>
										Contact support
									</Link>{" "}
									to confirm your plan.
								</p>
							)}
							{status === "trialing" && !currentPlan && !stripePriceId && (
								<p className="text-sm text-muted-foreground mt-1">
									Your trial is active.{" "}
									<Link
										href="/billing/plans"
										className="text-primary hover:underline underline-offset-4"
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
										className="text-primary hover:underline underline-offset-4"
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
