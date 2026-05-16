"use client";

import NumberFlow from "@number-flow/react";
import { useMutation } from "@tanstack/react-query";
import {
	ArrowRight,
	BadgeCheck,
	Loader2,
	Shield,
	Sparkles,
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
import { OwnerSubscribeDialog } from "./owner-subscribe-dialog";

const logger = createLogger({ component: "PricingCardFeatured" });

interface PricingPlan {
	id: string;
	name: string;
	description: string;
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

interface PricingCardFeaturedProps {
	plan: PricingPlan;
	billingCycle: "monthly" | "yearly";
	className?: string;
}

export function PricingCardFeatured({
	plan,
	billingCycle,
	className,
}: PricingCardFeaturedProps) {
	// React Compiler bailout. MUST remain the first statement in the function
	// body — a `const x = ...` line inserted above it silently disables the
	// directive. NumberFlow 0.6.0 triggers a useMemo hook-count mismatch
	// (React error #310) under the compiler's auto-memoization.
	"use no memo";

	const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);

	const subscriptionMutation = useMutation({
		mutationFn: async (overrides?: {
			customerEmail?: string;
			tenant_id?: string;
		}) => {
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

		// Use getSession() — reads from local cookie cache, no network call,
		// no silent dialog-open when getUser() returns false due to a transient
		// auth-server hiccup. If a local session exists, attempt checkout; the
		// Edge Function validates the JWT and surfaces a real error via toast
		// if the session is rejected. If no local session, prompt new-visitor
		// signup via the dialog.
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
	const monthlyEquivalent = plan.price.monthly;

	return (
		<>
			<div
				className={cn(
					"relative h-full rounded-2xl p-[2px] bg-gradient-to-br from-primary via-accent to-primary",
					"animate-gradient-x",
					className,
				)}
			>
				{/* Most Popular Badge — CONS-05: top-0 + -translate-y-1/2 keeps the
				    badge cleanly centered on the card's top edge across all
				    breakpoints (was `-top-4` which created ~12px overhang on
				    narrow viewports). */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
					<Badge className="bg-primary text-primary-foreground shadow-lg px-4 py-1.5 text-sm font-semibold">
						<Sparkles className="size-3.5 mr-1.5" />
						Most Popular
					</Badge>
				</div>

				<div className="relative h-full rounded-[14px] bg-card/95 backdrop-blur-sm p-8 flex flex-col">
					{/* Header */}
					<div className="text-center mb-6">
						<h3 className="text-2xl font-bold text-foreground mb-2">
							{plan.name}
						</h3>
						<p className="text-muted-foreground">{plan.description}</p>
					</div>

					{/* Price */}
					<div className="text-center mb-6">
						{billingCycle === "yearly" && (
							<div className="text-muted-foreground line-through text-lg mb-1">
								${monthlyEquivalent}/mo
							</div>
						)}
						<div className="flex items-baseline justify-center gap-2 whitespace-nowrap">
							<NumberFlow
								className="text-5xl font-bold text-foreground"
								format={{
									style: "currency",
									currency: "USD",
									maximumFractionDigits: 0,
								}}
								value={currentPrice}
							/>
							<span className="text-muted-foreground font-medium">/mo</span>
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							{billingCycle === "yearly"
								? `Billed annually ($${plan.annualTotal}/year)`
								: "Billed monthly"}
						</p>
						{/* CONS-10: per-card savings — monthly × 2 (2 months free
						    on annual). Phase 5 math: Growth $98. */}
						{billingCycle === "yearly" && plan.price.monthly > 0 && (
							<p className="text-sm font-semibold text-success mt-1">
								Save ${plan.price.monthly * 2}/year
							</p>
						)}
					</div>

					{/* Social Proof */}
					<Badge
						variant="trustIndicator"
						size="trust"
						className="w-full justify-center mb-6"
					>
						<BadgeCheck className="size-4" aria-hidden="true" />
						Built for landlords with 1–15 rentals
					</Badge>

					{/* Features - 2 column grid for featured card */}
					<div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-8 flex-1">
						{plan.features.map((feature) => (
							<div
								key={feature}
								className="flex items-start gap-2 text-sm text-muted-foreground"
							>
								<BadgeCheck className="size-4 text-primary shrink-0 mt-0.5" />
								<span>{feature}</span>
							</div>
						))}
					</div>

					{/* CTA */}
					<div className="space-y-3">
						<Button
							size="lg"
							className="w-full group relative overflow-hidden shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
							disabled={subscriptionMutation.isPending}
							onClick={handleSubscribe}
						>
							{subscriptionMutation.isPending ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Processing...
								</>
							) : (
								<>
									Start 14-Day Free Trial
									<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
								</>
							)}
						</Button>
						<div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
							<span className="flex items-center gap-1">
								<Shield className="size-3" />
								No credit card required
							</span>
							<span>Cancel anytime</span>
						</div>
					</div>
				</div>
			</div>

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
		</>
	);
}
