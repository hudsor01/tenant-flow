import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import FeaturesSectionDemo from "#components/sections/features-section";
import { HeroDashboardMockup } from "#components/sections/hero-dashboard-mockup";
import { HomeFaq } from "#components/sections/home-faq";
import { HowItWorks } from "#components/sections/how-it-works";
import { LogoCloud } from "#components/sections/logo-cloud";
import { PremiumCta } from "#components/sections/premium-cta";
import { StatsShowcase } from "#components/sections/stats-showcase";
import { TestimonialsSection } from "#components/sections/testimonials-section";
import { Button } from "#components/ui/button";
import { ctaTrackAttributes } from "#lib/analytics/cta-attributes";
import { realTestimonials } from "../data/testimonials";

export default function MarketingHomePage() {
	return (
		<PageLayout showGridPattern={true} containerClass="flex flex-col">
			{/* Hero Section with Dashboard Mockup */}
			<section className="relative pt-8 lg:pt-12">
				<div className="w-full">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						{/* items-center + lg:min-h-150: the short copy column vertically
						    centers against the taller dashboard mockup (no dead void
						    beneath the CTAs) and the hero pins to a consistent height,
						    matching the shared HeroSection. */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center lg:min-h-150">
							{/* Content */}
							<div className="flex flex-col space-y-8">
								<div className="space-y-6">
									{/* The H1 carries the query the page answers, as an eyebrow
									    line above the hook (2026-11-24 SEO audit H7). */}
									<h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05] text-balance">
										<span className="mb-4 block text-base font-semibold leading-normal tracking-normal text-primary-text sm:text-lg">
											Property management software for independent landlords
										</span>{" "}
										Skip the{" "}
										<span className="hero-highlight">tenant portal</span>.
									</h1>

									<p className="mb-0 text-xl text-muted-foreground leading-relaxed max-w-lg">
										The operations tool for landlords with small portfolios.
										Track properties, leases, and maintenance in one place. No
										tenant logins, and no rent routed through a middleman.
									</p>
								</div>

								<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
									<Button asChild size="lg" className="w-full sm:w-auto">
										<Link href="/pricing" {...ctaTrackAttributes("home-hero")}>
											Start free — no card
											<ArrowRight className="ml-2 size-4" />
										</Link>
									</Button>
									<Button
										asChild
										variant="outline"
										size="lg"
										className="w-full sm:w-auto"
									>
										<Link href="/pricing">View Pricing</Link>
									</Button>
								</div>

								<p className="mb-0 text-muted-foreground text-sm">
									14-day free trial, no card to start.
								</p>
							</div>

							{/* Dashboard Mockup */}
							<div className="relative hidden lg:block">
								<HeroDashboardMockup className="w-full" />
							</div>
						</div>
					</div>
				</div>

				{/* Logo Cloud — trust strip: a subtle top divider + symmetric
				    padding separate it from the hero without a floating void. */}
				<LogoCloud className="mt-12 lg:mt-16" />
			</section>

			{/* Below-hero sections render directly (no LazySection). This page
			    is force-static with no data-fetching and no heavy libs, so
			    intersection-gated lazy loading only added skeleton pop-in +
			    layout shift and kept this content out of the prerendered HTML
			    (hurting SEO). Any genuinely heavy child lazy-loads at the
			    component level via next/dynamic. */}
			<HowItWorks />

			<FeaturesSectionDemo />

			<StatsShowcase />

			{/* CONS-14: "Why Landlords Choose TenantFlow" ComparisonTable
			    removed from homepage to de-duplicate with /features (which is
			    its natural home). Kept on /features only. */}

			{/* Testimonials (TRUST-01) — real-customer quotes; data source
			    in src/data/testimonials.ts gates honest provenance. */}
			{/* grid variant: 2-up on md+ (fills the width with the real quotes)
			    instead of a lone carousel card with empty flanks; also drops the
			    carousel auto-rotate (WCAG 2.2.2). */}
			<TestimonialsSection testimonials={realTestimonials} variant="grid" />

			<HomeFaq />

			<PremiumCta />
		</PageLayout>
	);
}
