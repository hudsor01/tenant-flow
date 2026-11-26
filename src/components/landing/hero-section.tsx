import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { BlurFade } from "#components/ui/blur-fade";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";
import { Button } from "#components/ui/button";
import {
	contactTrackAttributes,
	ctaTrackAttributes,
} from "#lib/analytics/cta-attributes";

export function HeroSection() {
	return (
		<section className="relative pb-20 overflow-hidden">
			<div className="absolute inset-0 bg-[color-mix(in_oklch,var(--color-primary)_5%,transparent)]" />
			<div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_1px_1px,var(--color-foreground)_1px,transparent_0)] bg-size-[32px_32px]" />

			<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
				{/* The /features breadcrumb, on the hero's tint; matches the page's
				    BreadcrumbList JSON-LD (2026-11-24 SEO audit F3). */}
				<Breadcrumb className="pt-6 pb-10">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href="/">Home</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>Features</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<BlurFade delay={0.1}>
					<div className="text-center max-w-5xl mx-auto space-y-8">
						{/* The H1 names the query; the vault line is the subline
						    (2026-11-24 SEO audit F9). */}
						<h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
							<span className="text-foreground">
								Property management features built for independent
							</span>{" "}
							{/* One word: the highlighter band draws under the whole
							    span, so a span that wraps gets one wide band. */}
							<span className="hero-highlight">landlords</span>
						</h1>

						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl font-medium">
							Run your rentals from a single document vault, with per-entity
							storage, global search, filters by record type, category and date,
							and tax-season ZIP downloads.{" "}
							<span className="text-foreground font-semibold">
								Lease e-sign on Growth and Max plans. Tenants are records, never
								users.
							</span>
						</p>

						<div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
							<Button
								size="lg"
								className="shrink group relative overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 typography-large px-8 py-4"
								asChild
							>
								<Link
									href="/pricing"
									aria-label="Start free — no card"
									{...ctaTrackAttributes("features-hero")}
								>
									<span className="relative z-10 flex items-center">
										Start free — no card
										<ArrowRight className="size-5 ml-3 transition-transform group-hover:translate-x-1" />
									</span>
								</Link>
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 dark:border-muted-foreground/30 dark:hover:bg-primary/5 typography-large px-8 py-4 transition-all duration-300"
								asChild
							>
								<Link
									href="/contact?topic=demo"
									{...contactTrackAttributes("features-hero-demo")}
								>
									<ArrowRight className="size-5 mr-3 opacity-70 group-hover:opacity-100" />
									Request a demo
								</Link>
							</Button>
						</div>

						<p className="mb-0 text-muted-foreground typography-small">
							<Check className="size-4 inline text-primary mr-2" />
							14-day free trial, no card to start
						</p>
					</div>
				</BlurFade>
			</div>
		</section>
	);
}
