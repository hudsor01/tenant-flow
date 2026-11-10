import { BlurFade } from "#components/ui/blur-fade";
import { NumberTicker } from "#components/ui/number-ticker";
import { cn } from "#lib/utils";

interface StatsShowcaseProps {
	className?: string;
}

export function StatsShowcase({ className }: StatsShowcaseProps) {
	// Phase 67 cleanup: replaced unsubstantiated numeric claims with
	// verifiable feature counts pulled from the live product. Anything
	// with a number here must map to a real product capability — no
	// marketing-only stats.
	const stats = [
		{
			value: 5,
			label: "Entity Branches",
			description: "Property, lease, tenant, maintenance, inspection",
			suffix: "",
			prefix: "",
		},
		{
			value: 7,
			label: "Default Categories",
			description: "Plus unlimited custom categories per landlord",
			suffix: "",
			prefix: "",
		},
		{
			value: 500,
			label: "Tax-Season Bulk Zip",
			description: "Up to 500 docs per zip export",
			suffix: "",
			prefix: "",
		},
		{
			value: 14,
			label: "Day Free Trial",
			description: "No credit card required",
			suffix: "",
			prefix: "",
		},
	];

	return (
		<section
			className={cn(
				"section-spacing relative overflow-hidden bg-transparent",
				className,
			)}
		>
			<div className="@container/showcase-stats max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
				<div className="text-center mb-16 max-w-3xl mx-auto">
					<BlurFade delay={0.1}>
						<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-4 leading-tight">
							Made for real
							<span className="text-primary-text block">owner workflows</span>
						</h2>
						<p className="text-xl text-muted-foreground leading-relaxed">
							Every feature ships against a real owner workflow — from upload to
							tax-season export.
						</p>
					</BlurFade>
				</div>

				{/* The columns step on the section's own width, never the
				    viewport's: one until two cards are 10rem wide (two at 320 left
				    each 70px, and every label wrapped onto three lines), four from
				    where four are (66.2-39 fix round 4, Part 8d). */}
				<div className="grid grid-cols-1 @min-[22rem]/showcase-stats:grid-cols-2 @min-[46rem]/showcase-stats:grid-cols-4 gap-8">
					{stats.map((stat, index) => (
						<BlurFade key={stat.label} delay={0.2 + index * 0.1}>
							<div className="relative">
								<div className="showcase-card">
									<div className="relative z-10">
										<div className="whitespace-nowrap text-3xl lg:typography-h1 text-primary-text mb-2 tracking-tight">
											{stat.prefix}
											<NumberTicker
												value={stat.value}
												delay={0.3 + index * 0.1}
												className="font-bold"
											/>
											{stat.suffix}
										</div>

										<div className="typography-large text-foreground mb-1">
											{stat.label}
										</div>

										<div className="text-muted-foreground">
											{stat.description}
										</div>
									</div>
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</div>
		</section>
	);
}
