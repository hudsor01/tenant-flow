import { ArrowRight, Check, Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { Button } from "#components/ui/button";
import type { CompetitorData, FeatureSupport } from "#types/sections/compare";

function FeatureIcon({ support }: { support: FeatureSupport }) {
	switch (support) {
		case "yes":
			return <Check className="size-5 text-success" />;
		case "no":
			return <X className="size-5 text-destructive" />;
		case "partial":
			return <Minus className="size-5 text-warning" />;
		case "addon":
			return <Plus className="size-5 text-info" />;
		case "na":
			// CONS-07: neutral framing for "by design" feature absences
			// (ACH/Payment, HOA Management) — these are positioning
			// choices on the landlord-only platform, not gaps.
			return (
				<Minus
					className="size-5 text-muted-foreground"
					aria-label="Not applicable"
				/>
			);
	}
}

export function PricingComparison({ data }: { data: CompetitorData }) {
	return (
		<section className="section-spacing bg-muted/30">
			<div className="max-w-4xl mx-auto px-6 lg:px-8">
				<h2 className="text-3xl font-bold text-center mb-12">
					Pricing Comparison
				</h2>
				<div className="grid md:grid-cols-2 gap-8">
					<div className="rounded-2xl border-2 border-primary bg-background p-8">
						<h3 className="text-xl font-bold text-foreground mb-1">
							TenantFlow
						</h3>
						<p className="text-sm text-muted-foreground mb-6">
							Transparent, flat-rate pricing
						</p>
						<div className="space-y-4">
							{data.tenantflowPricing.map((tier) => (
								<div
									key={tier.name}
									className="flex items-center justify-between border-b border-border pb-3"
								>
									<div>
										<p className="font-medium text-foreground">{tier.name}</p>
										{tier.note && (
											<p className="text-sm text-muted-foreground">
												{tier.note}
											</p>
										)}
									</div>
									<p className="text-lg font-bold text-primary-text">
										{tier.price}
									</p>
								</div>
							))}
						</div>
						<p className="mt-4 text-sm text-muted-foreground">
							14-day free trial, no credit card required
						</p>
					</div>

					<div className="rounded-2xl border border-border bg-background p-8">
						<h3 className="text-xl font-bold text-foreground mb-1">
							{data.name}
						</h3>
						<p className="text-sm text-muted-foreground mb-6">{data.bestFor}</p>
						<div className="space-y-4">
							{data.competitorPricing.map((tier) => (
								<div
									key={tier.name}
									className="flex items-center justify-between border-b border-border pb-3"
								>
									<div>
										<p className="font-medium text-foreground">{tier.name}</p>
										{tier.note && (
											<p className="text-sm text-muted-foreground">
												{tier.note}
											</p>
										)}
									</div>
									<p className="text-lg font-bold text-foreground">
										{tier.price}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export function FeatureTable({ data }: { data: CompetitorData }) {
	return (
		<section id="comparison" className="section-spacing scroll-mt-20">
			<div className="max-w-4xl mx-auto px-6 lg:px-8">
				<h2 className="text-3xl font-bold text-center mb-12">
					Feature-by-Feature Comparison
				</h2>
				<div className="overflow-x-auto rounded-xl border border-border">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border bg-muted/50">
								<th className="text-left p-4 font-semibold text-foreground">
									Feature
								</th>
								<th className="text-center p-4 font-semibold text-primary-text w-40">
									TenantFlow
								</th>
								<th className="text-center p-4 font-semibold text-foreground w-40">
									{data.name}
								</th>
							</tr>
						</thead>
						<tbody>
							{data.features.map((feature, i) => (
								<tr
									key={feature.name}
									className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
								>
									<td className="p-4 font-medium text-foreground">
										{feature.name}
									</td>
									<td className="p-4 text-center">
										<div className="flex flex-col items-center gap-1">
											<FeatureIcon support={feature.tenantflow} />
											{feature.tenantflowNote && (
												<span className="text-xs text-muted-foreground">
													{feature.tenantflowNote}
												</span>
											)}
										</div>
									</td>
									<td className="p-4 text-center">
										<div className="flex flex-col items-center gap-1">
											<FeatureIcon support={feature.competitor} />
											{feature.competitorNote && (
												<span className="text-xs text-muted-foreground">
													{feature.competitorNote}
												</span>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}

export function WhySwitchSection({ data }: { data: CompetitorData }) {
	return (
		<section className="section-spacing bg-muted/30">
			<div className="max-w-4xl mx-auto px-6 lg:px-8">
				<div className="grid md:grid-cols-2 gap-12">
					<div>
						<h2 className="text-2xl font-bold text-foreground mb-6">
							Why Switch to TenantFlow
						</h2>
						<ul className="space-y-4">
							{data.whySwitch.map((reason) => (
								<li key={reason} className="flex gap-3 text-muted-foreground">
									<Check className="size-5 text-success mt-0.5 shrink-0" />
									<span>{reason}</span>
								</li>
							))}
						</ul>
					</div>
					<div>
						<h2 className="text-2xl font-bold text-foreground mb-6">
							Where {data.name} Excels
						</h2>
						<ul className="space-y-4">
							{data.competitorStrengths.map((strength) => (
								<li key={strength} className="flex gap-3 text-muted-foreground">
									<Check className="size-5 text-info mt-0.5 shrink-0" />
									<span>{strength}</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}

// `data` prop dropped here in AUDIT-2 cycle-2: the deeper-dive blog
// CTA that consumed `data.blogSlug` + `data.name` was removed pending
// publication of the comparison post cohort, and nothing in the
// remaining "Ready to make the switch?" block references the
// competitor. Reintroduce the prop when restoring the deeper-dive CTA.
export function BottomCta() {
	return (
		<section className="section-spacing">
			<div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
				<div className="p-10 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl">
					<h2 className="text-3xl font-bold text-foreground mb-4">
						Ready to make the switch?
					</h2>
					<p className="text-lg text-muted-foreground mb-8">
						Manage your rentals with the document vault, lease e-sign, and
						reports built for landlords. Start your 14-day free trial today.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button size="lg" className="px-8" asChild>
							<Link href="/pricing">
								Start free — no card
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<Link href="/compare">See All Comparisons</Link>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
