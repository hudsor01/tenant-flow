"use client";

import { Building2, Shield, Users } from "lucide-react";
import { useState } from "react";
import { Label } from "#components/ui/label";
import { Switch } from "#components/ui/switch";
import { getAllPricingPlans } from "#config/pricing";
import { PricingCardFeatured } from "./pricing-card-featured";
import { PricingCardStandard } from "./pricing-card-standard";
import { PricingComparisonTable } from "./pricing-comparison-table";

interface BentoPricingSectionProps {
	defaultBillingCycle?: "monthly" | "yearly";
}

export function BentoPricingSection({
	defaultBillingCycle = "monthly",
}: BentoPricingSectionProps) {
	const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
		defaultBillingCycle,
	);

	// Get pricing plans from config
	const allPlans = getAllPricingPlans()
		.filter((plan) => plan.planId !== "trial")
		.map((plan) => ({
			id: plan.planId,
			name: plan.name,
			description: plan.description,
			audienceTagline: plan.audienceTagline,
			price: {
				monthly: plan.price.monthly,
				yearly: Math.round((plan.price.annual / 12) * 100) / 100,
			},
			annualTotal: plan.price.annual,
			features: [...plan.features],
			popular: plan.planId === "growth",
			stripeMonthlyPriceId: plan.stripePriceIds.monthly,
			stripeAnnualPriceId: plan.stripePriceIds.annual,
		}));

	const starterPlan = allPlans.find((p) => p.id === "starter");
	const growthPlan = allPlans.find((p) => p.id === "growth");
	const maxPlan = allPlans.find((p) => p.id === "max");

	return (
		<div className="w-full">
			{/* Trust signals — feature-focused, not numeric claims */}
			<div className="flex-center gap-6 mb-8 flex-wrap">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Building2 className="size-4 text-primary" />
					<span>
						<strong className="text-foreground">Document vault</strong> on every
						plan
					</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Users className="size-4 text-primary" />
					<span>
						<strong className="text-foreground">Landlord-only</strong> (no
						tenant logins)
					</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Shield className="size-4 text-success" />
					<span>
						<strong className="text-foreground">14-day</strong> free trial, no
						credit card
					</span>
				</div>
			</div>

			{/* Enhanced Billing Toggle */}
			<div className="flex-center gap-4 mb-12">
				<Label
					htmlFor="billing-toggle"
					className={`text-sm font-medium transition-colors cursor-pointer ${
						billingCycle === "monthly"
							? "text-foreground"
							: "text-muted-foreground"
					}`}
				>
					Monthly
				</Label>
				<Switch
					id="billing-toggle"
					checked={billingCycle === "yearly"}
					onCheckedChange={(checked) =>
						setBillingCycle(checked ? "yearly" : "monthly")
					}
					className="data-[state=checked]:bg-primary"
				/>
				<Label
					htmlFor="billing-toggle"
					className={`text-sm font-medium transition-colors cursor-pointer ${
						billingCycle === "yearly"
							? "text-foreground"
							: "text-muted-foreground"
					}`}
				>
					Annual
				</Label>
				{/* CONS-10: per-card "Save $X/year" badges render inside each
				    PricingCard when billingCycle === 'yearly' — drops the
				    misleading global badge that previously showed only
				    Growth's $98 as if it applied to all tiers. */}
			</div>

			{/* Bento Grid Layout */}
			<div className="mx-auto max-w-6xl px-4">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
					{/* Starter - Left Column (1 col) */}
					{starterPlan && (
						<div className="lg:col-span-1">
							<PricingCardStandard
								plan={starterPlan}
								billingCycle={billingCycle}
							/>
						</div>
					)}

					{/* Growth - Center Column (2 cols) */}
					{growthPlan && (
						<div className="lg:col-span-2">
							<PricingCardFeatured
								plan={growthPlan}
								billingCycle={billingCycle}
							/>
						</div>
					)}

					{/* Max - Right Column (1 col) */}
					{maxPlan && (
						<div className="lg:col-span-1">
							<PricingCardStandard plan={maxPlan} billingCycle={billingCycle} />
						</div>
					)}
				</div>

				{/* Feature Comparison Table */}
				<PricingComparisonTable className="mt-12" />
			</div>
		</div>
	);
}
