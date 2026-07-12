"use client";

import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	type Plan,
	PlanCard,
	type PlanFeature,
} from "#components/billing/plan-card";
import { UpgradeDialog } from "#components/billing/upgrade-dialog";
import { Button } from "#components/ui/button";
import { Skeleton } from "#components/ui/skeleton";
import { getAllPricingPlans, type PricingConfig } from "#config/pricing";
import { useSubscriptionStatus } from "#hooks/api/use-billing";
import {
	createCheckoutSession,
	createCustomerPortalSession,
} from "#lib/stripe/stripe-client";
import { cn } from "#lib/utils";

const TIER_BY_PLAN_ID: Record<PricingConfig["planId"], number> = {
	trial: 0,
	starter: 1,
	growth: 2,
	max: 3,
};

function toPlanFeatures(features: readonly string[]): PlanFeature[] {
	return features.map((name) => ({ name, included: true }));
}

function toBillingPlan(config: PricingConfig): Plan {
	return {
		id: config.planId,
		name: config.name,
		description: config.description,
		price: config.price.monthly,
		priceId: config.stripePriceIds.monthly,
		tier: TIER_BY_PLAN_ID[config.planId],
		features: toPlanFeatures(config.features),
	};
}

// Trials are DB-managed and deliberately excluded from ALLOWED_CHECKOUT_PRICE_IDS,
// so rendering the trial as a purchasable card only produces a guaranteed
// "price_id not allowed" rejection (BILL-08). Filter it out; every remaining
// card carries an allowlisted price id.
const PLANS: Plan[] = getAllPricingPlans()
	.filter((p) => p.planId !== "trial")
	.map(toBillingPlan);

// A live Stripe subscription still exists on the customer even in
// past_due/unpaid/paused/incomplete — it must be managed via the billing
// portal, never via a second checkout (which would mint a duplicate
// subscription and double-bill). Mirrors the server-side guard set in
// `stripe-checkout/index.ts` (BILL-05) — keep the two sets in lockstep.
const LIVE_SUBSCRIPTION_STATUSES = new Set([
	"active",
	"trialing",
	"past_due",
	"unpaid",
	"paused",
	"incomplete",
]);

export default function BillingPlansPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
	const searchParams = useSearchParams();
	const source = searchParams?.get("source") ?? undefined;

	const { data: subscriptionStatus, isLoading: subscriptionLoading } =
		useSubscriptionStatus();
	const status = subscriptionStatus?.subscriptionStatus ?? null;
	// Portal-vs-checkout routing keys on "does a live Stripe subscription
	// exist", NOT on a successful price-id→plan match. The `stripeCustomerId`
	// clause keeps DB-managed trials (trialing with no Stripe customer) on the
	// checkout path, which is correct for them.
	const hasLiveSubscription =
		status !== null &&
		LIVE_SUBSCRIPTION_STATUSES.has(status) &&
		subscriptionStatus?.stripeCustomerId != null;
	// `subscription_plan` can be a Stripe price_id OR a tier slug (per the
	// Stripe webhook handler: `tier ?? planLookup ?? priceId`). Match both.
	// Gated on `hasLiveSubscription` (not just "active") so the "Current Plan"
	// info card still renders for a past_due/unpaid owner.
	const currentPlan =
		hasLiveSubscription && subscriptionStatus?.stripePriceId
			? (PLANS.find((p) => p.priceId === subscriptionStatus.stripePriceId) ??
				PLANS.find((p) => p.id === subscriptionStatus.stripePriceId) ??
				null)
			: null;
	// Decoupled from `currentPlan`: a live subscriber whose stored plan doesn't
	// match PRICING_PLANS (legacy/comp price id) must still route to the portal,
	// never into a second checkout.
	const hasSubscription = hasLiveSubscription;

	const handlePlanSelect = (plan: Plan) => {
		setSelectedPlan(plan);
		setDialogOpen(true);
	};

	const handleConfirmPlanChange = async (plan: Plan) => {
		setLoadingPlanId(plan.id);
		setIsLoading(true);

		try {
			if (hasSubscription) {
				const returnUrl = `${window.location.origin}/billing/plans`;
				const { url } = await createCustomerPortalSession(returnUrl);
				window.location.href = url;
			} else {
				if (!plan.priceId) {
					toast.error("This plan is not available for purchase");
					setDialogOpen(false);
					return;
				}

				toast.loading("Creating checkout session...", { id: "checkout" });

				const { url } = await createCheckoutSession({
					priceId: plan.priceId,
					planName: plan.name,
					description: plan.description,
					...(source ? { source } : {}),
				});

				toast.dismiss("checkout");

				if (url) {
					window.location.href = url;
				} else {
					throw new Error("No checkout URL returned");
				}
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "An error occurred";
			toast.error(message);
			setDialogOpen(false);
		} finally {
			setIsLoading(false);
			setLoadingPlanId(null);
		}
	};

	const handleManageSubscription = async () => {
		setIsLoading(true);

		try {
			const returnUrl = `${window.location.origin}/billing/plans`;
			const { url } = await createCustomerPortalSession(returnUrl);
			window.location.href = url;
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to open billing portal";
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDialogClose = () => {
		if (!isLoading) {
			setDialogOpen(false);
			setSelectedPlan(null);
		}
	};

	if (subscriptionLoading) {
		return (
			<div className="container max-w-7xl py-8">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	return (
		<div className="container max-w-7xl py-8">
			<div className="mb-8">
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-11"
				>
					<ArrowLeft className="size-4" />
					Back to Dashboard
				</Link>

				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							Subscription Plans
						</h1>
						<p className="text-muted-foreground mt-1">
							{hasSubscription
								? `You are currently on the ${currentPlan?.name} plan`
								: "Choose a plan that fits your needs"}
						</p>
					</div>

					{hasSubscription && (
						<Button
							variant="outline"
							size="lg"
							className="min-h-11"
							onClick={handleManageSubscription}
							disabled={isLoading}
						>
							<Settings className="mr-2 size-4" />
							Manage Subscription
						</Button>
					)}
				</div>
			</div>

			{hasSubscription && currentPlan && (
				<div className="mb-8 p-4 rounded-lg border border-primary/20 bg-primary/5">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
							<Settings className="size-5 text-primary" />
						</div>
						<div>
							<p className="font-medium text-foreground">
								Current Plan: {currentPlan.name}
							</p>
							<p className="text-sm text-muted-foreground">
								{currentPlan.price === 0
									? "Free"
									: `$${currentPlan.price}/month`}
							</p>
						</div>
					</div>
				</div>
			)}

			<div
				className={cn(
					"grid gap-6",
					"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
				)}
			>
				{PLANS.map((plan) => (
					<PlanCard
						key={plan.id}
						plan={plan}
						isCurrentPlan={plan.id === currentPlan?.id}
						isMostPopular={plan.id === "growth"}
						currentTier={currentPlan?.tier ?? null}
						onSelect={handlePlanSelect}
						isLoading={loadingPlanId === plan.id}
					/>
				))}
			</div>

			<div className="mt-12 text-center">
				<p className="text-sm text-muted-foreground">
					Need help choosing a plan?{" "}
					<Link
						href="/contact"
						className="text-primary-text hover:underline underline-offset-4"
					>
						Contact our sales team
					</Link>
				</p>
				<p className="text-xs text-muted-foreground mt-2">
					New accounts include a 14-day free trial. Cancel anytime.
				</p>
			</div>

			<UpgradeDialog
				targetPlan={selectedPlan}
				currentPlan={currentPlan}
				isOpen={dialogOpen}
				onClose={handleDialogClose}
				onConfirm={handleConfirmPlanChange}
			/>
		</div>
	);
}
