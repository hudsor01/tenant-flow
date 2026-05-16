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

const PLANS: Plan[] = getAllPricingPlans().map(toBillingPlan);

export default function BillingPlansPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
	const searchParams = useSearchParams();
	const source = searchParams?.get("source") ?? undefined;

	const { data: subscriptionStatus, isLoading: subscriptionLoading } =
		useSubscriptionStatus();
	const hasActiveSubscription =
		subscriptionStatus?.subscriptionStatus === "active" ||
		subscriptionStatus?.subscriptionStatus === "trialing";
	// `subscription_plan` can be a Stripe price_id OR a tier slug (per the
	// Stripe webhook handler: `tier ?? planLookup ?? priceId`). Match both.
	const currentPlan =
		hasActiveSubscription && subscriptionStatus?.stripePriceId
			? (PLANS.find((p) => p.priceId === subscriptionStatus.stripePriceId) ??
				PLANS.find((p) => p.id === subscriptionStatus.stripePriceId) ??
				null)
			: null;
	const hasSubscription = currentPlan !== null;

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
					"grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
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
						className="text-primary hover:underline underline-offset-4"
					>
						Contact our sales team
					</Link>
				</p>
				<p className="text-xs text-muted-foreground mt-2">
					All plans include a 14-day free trial. Cancel anytime.
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
