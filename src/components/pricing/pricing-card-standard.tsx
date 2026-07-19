"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { calculateAnnualSavings } from "#config/pricing";
import { createLogger } from "#lib/frontend-logger";
import { checkoutRateLimiter } from "#lib/security";
import { createCheckoutSession } from "#lib/stripe/stripe-client";
import { createClient } from "#lib/supabase/client";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";
import { OwnerSubscribeDialog } from "./owner-subscribe-dialog";
import { completeSubscribeSignup } from "./subscribe-complete";

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
	includesPrevious?: string;
	popular: boolean;
	stripeMonthlyPriceId?: string | null;
	stripeAnnualPriceId?: string | null;
}

interface PricingCardStandardProps {
	plan: PricingPlan;
	billingCycle: "monthly" | "yearly";
	className?: string;
}

export function PricingCardStandard({
	plan,
	billingCycle,
	className,
}: PricingCardStandardProps) {
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
					{/* AUDIT-2 P2 (2026-05-18): show the explicit annual total
					    ($X/year) alongside the per-month-equivalent. The yearly
					    per-month rate is stored as `annual/12` (e.g. $15.83 for
					    Starter) and rendered via `formatCurrency({ maximumFractionDigits:
					    0 })` which rounds to `$16/mo`. Without `($190/year)` next
					    to it, "$16/mo" + "Save $38/year" reads as $16 × 12 = $192,
					    which doesn't match the canonical $190 — the savings + the
					    displayed monthly rate become arithmetically inconsistent.
					    The featured card has shipped this format since PR #725;
					    standard now matches. */}
					<p className="text-xs text-muted-foreground mt-1">
						{billingCycle === "yearly"
							? `Billed annually (${formatCurrency(plan.annualTotal, { maximumFractionDigits: 0, minimumFractionDigits: 0 })}/year)`
							: "Billed monthly"}
					</p>
					{/* CONS-10: per-card savings — via calculateAnnualSavings
					    (2 months free on annual). Phase 5 math: Starter $38 /
					    Max $298. formatCurrency so 4-digit savings render with
					    thousands separator (AUDIT-2 cycle-2 P3). */}
					{billingCycle === "yearly" && plan.price.monthly > 0 && (
						<p className="text-xs font-semibold text-success-text mt-1">
							Save{" "}
							{formatCurrency(calculateAnnualSavings(plan.price.monthly), {
								maximumFractionDigits: 0,
								minimumFractionDigits: 0,
							})}
							/year
						</p>
					)}
				</div>

				{/* Features */}
				<div className="space-y-2.5 mb-6 flex-1">
					{plan.includesPrevious && (
						<p className="text-sm font-medium text-foreground pb-1">
							{plan.includesPrevious}
						</p>
					)}
					{plan.features.map((feature) => (
						<div
							key={feature}
							className="flex items-start gap-2 text-sm text-muted-foreground"
						>
							<BadgeCheck className="size-4 text-success shrink-0 mt-0.5" />
							<span>{feature}</span>
						</div>
					))}
				</div>

				{/* CTA */}
				<Button
					variant="outline"
					size="lg"
					className="w-full group transition-all duration-300 border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary-text"
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
							Start free
							<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
						</>
					)}
				</Button>
			</div>

			<OwnerSubscribeDialog
				open={subscribeDialogOpen}
				onOpenChange={setSubscribeDialogOpen}
				planName={plan.name}
				planCta={`Subscribe to ${plan.name}`}
				onComplete={(payload) =>
					completeSubscribeSignup(payload, {
						startCheckout: (o) => subscriptionMutation.mutateAsync(o),
						closeDialog: () => setSubscribeDialogOpen(false),
					})
				}
			/>
		</>
	);
}
