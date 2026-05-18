"use client";

import { useMutation } from "@tanstack/react-query";
import {
	ArrowRight,
	BadgeCheck,
	ChevronDown,
	Loader2,
	MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import { createLogger } from "#lib/frontend-logger";
import { checkoutRateLimiter } from "#lib/security";
import { createCheckoutSession } from "#lib/stripe/stripe-client";
import { createClient } from "#lib/supabase/client";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";
import { OwnerSubscribeDialog } from "./owner-subscribe-dialog";

const logger = createLogger({ component: "PricingCardStandard" });

interface PricingPlan {
	id: string;
	name: string;
	description: string;
	/** Short audience-targeting badge string. Same shape as
	 *  PricingConfig in #config/pricing. PR #725 introduced this on the
	 *  featured card; PR #726 (Session 13 #2) brings it to standard
	 *  Starter/Max cards so all three tiers carry segment framing. */
	audienceTagline: string;
	price: {
		monthly: number;
		yearly: number;
	};
	annualTotal: number;
	features: string[];
	popular: boolean;
	stripeMonthlyPriceId?: string | null;
	stripeAnnualPriceId?: string | null;
}

interface PricingCardStandardProps {
	plan: PricingPlan;
	billingCycle: "monthly" | "yearly";
	variant: "starter" | "enterprise";
	className?: string;
}

export function PricingCardStandard({
	plan,
	billingCycle,
	variant,
	className,
}: PricingCardStandardProps) {
	const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
	const [showAllFeatures, setShowAllFeatures] = useState(false);
	const isEnterprise = variant === "enterprise";

	const subscriptionMutation = useMutation({
		mutationFn: async (overrides?: {
			customerEmail?: string;
			tenant_id?: string;
		}) => {
			if (isEnterprise) {
				window.location.href = "/contact";
				return { success: true };
			}

			if (!checkoutRateLimiter.canMakeRequest()) {
				throw new Error(
					"Too many requests. Please wait a moment before trying again.",
				);
			}

			const stripePriceId =
				billingCycle === "yearly"
					? plan.stripeAnnualPriceId
					: plan.stripeMonthlyPriceId;

			if (!stripePriceId) {
				throw new Error(`No ${billingCycle} price configured for ${plan.name}`);
			}

			toast.loading("Creating checkout session...", { id: "checkout" });

			const result = await createCheckoutSession({
				priceId: stripePriceId,
				planName: plan.name,
				...(overrides?.customerEmail && {
					customerEmail: overrides.customerEmail,
				}),
				...(overrides?.tenant_id && { tenant_id: overrides.tenant_id }),
			});

			if (!result.url) {
				throw new Error("Failed to create checkout session");
			}

			window.location.href = result.url;
			return { success: true };
		},
		onError: (error: Error) => {
			logger.error("Checkout failed", {
				metadata: { error: error.message },
			});
			toast.error(
				error.message || "Failed to start checkout. Please try again.",
			);
		},
		onSettled: () => {
			toast.dismiss("checkout");
		},
	});

	const handleSubscribe = async () => {
		if (subscriptionMutation.isPending) return;

		if (isEnterprise) {
			await subscriptionMutation.mutateAsync({});
			return;
		}

		// Use getSession() — reads from local cookie cache, no network call.
		// Avoids the silent dialog-open path that hid CTA failures when
		// getUser() failed for a transient reason. If no local session, prompt
		// new-visitor signup; otherwise let the mutation hit the Edge Function
		// (which JWT-validates and surfaces a real error via toast on failure).
		const supabase = createClient();
		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session) {
			setSubscribeDialogOpen(true);
			return;
		}

		await subscriptionMutation.mutateAsync({});
	};

	const currentPrice = plan.price[billingCycle];
	const initialFeatureCount = 6;
	const displayFeatures = showAllFeatures
		? plan.features
		: plan.features.slice(0, initialFeatureCount);
	const hiddenFeatureCount = plan.features.length - initialFeatureCount;

	return (
		<>
			<div
				className={cn(
					"h-full rounded-2xl border border-border/50 bg-card p-6 flex flex-col",
					"hover:border-primary/30 hover:shadow-lg transition-all duration-300",
					className,
				)}
			>
				{/* Header */}
				<div className="mb-4">
					<h3 className="text-xl font-bold text-foreground mb-1">
						{plan.name}
					</h3>
					<p className="text-sm text-muted-foreground">{plan.description}</p>
				</div>

				{/* Price — CONS-09: whitespace-nowrap keeps `$XX` + `/mo` on the
				    same line at narrow grid columns. */}
				<div className="mb-6">
					<div className="flex items-baseline gap-1 whitespace-nowrap">
						<span className="text-3xl font-bold text-foreground">
							{formatCurrency(currentPrice, {
								maximumFractionDigits: 0,
								minimumFractionDigits: 0,
							})}
						</span>
						<span className="text-sm text-muted-foreground">/mo</span>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						{billingCycle === "yearly" ? `Billed annually` : "Billed monthly"}
					</p>
					{/* CONS-10: per-card savings — monthly × 2 (2 months free
					    on annual). Phase 5 math: Starter $38 / Max $298. */}
					{billingCycle === "yearly" && plan.price.monthly > 0 && (
						<p className="text-xs font-semibold text-success mt-1">
							Save ${plan.price.monthly * 2}/year
						</p>
					)}
				</div>

				{/* Social-proof audience badge (PR #726 Session 13 #2: same
				    treatment the featured card got in PR #725, but for
				    Starter and Max so every tier carries segment framing). */}
				<Badge
					variant="trustIndicator"
					size="trust"
					className="w-full justify-center mb-6"
				>
					<BadgeCheck className="size-4" aria-hidden="true" />
					{plan.audienceTagline}
				</Badge>

				{/* Features */}
				<div className="space-y-2.5 mb-6 flex-1">
					{displayFeatures.map((feature) => (
						<div
							key={feature}
							className="flex items-start gap-2 text-sm text-muted-foreground"
						>
							<BadgeCheck className="size-4 text-success shrink-0 mt-0.5" />
							<span>{feature}</span>
						</div>
					))}
					{hiddenFeatureCount > 0 && (
						<button
							type="button"
							onClick={() => setShowAllFeatures(!showAllFeatures)}
							className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 pl-6 transition-colors"
						>
							<ChevronDown
								className={cn(
									"size-3 transition-transform duration-200",
									showAllFeatures && "rotate-180",
								)}
							/>
							{showAllFeatures
								? "Show less"
								: `+${hiddenFeatureCount} more features`}
						</button>
					)}
				</div>

				{/* CTA */}
				<Button
					variant={isEnterprise ? "outline" : "default"}
					size="lg"
					className={cn(
						"w-full group transition-all duration-300",
						isEnterprise
							? "hover:bg-primary/5 hover:border-primary/50"
							: "bg-foreground text-background hover:bg-foreground/90",
					)}
					disabled={subscriptionMutation.isPending}
					onClick={handleSubscribe}
				>
					{subscriptionMutation.isPending ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Processing...
						</>
					) : isEnterprise ? (
						<>
							<MessageSquare className="mr-2 size-4" />
							Contact Sales
						</>
					) : (
						<>
							Start Free
							<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
						</>
					)}
				</Button>
			</div>

			{!isEnterprise && (
				<OwnerSubscribeDialog
					open={subscribeDialogOpen}
					onOpenChange={setSubscribeDialogOpen}
					planName={plan.name}
					planCta={`Subscribe to ${plan.name}`}
					onComplete={async ({ email, tenant_id }) => {
						await subscriptionMutation.mutateAsync({
							customerEmail: email,
							...(tenant_id && { tenant_id }),
						});
						setSubscribeDialogOpen(false);
					}}
				/>
			)}
		</>
	);
}
