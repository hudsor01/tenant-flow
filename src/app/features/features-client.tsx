"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BentoFeaturesSection } from "#components/landing/bento-features-section";
import { FeatureCallouts } from "#components/landing/feature-callouts";
import { FinalCtaSection } from "#components/landing/final-cta-section";
// Page sections
import { HeroSection } from "#components/landing/hero-section";
import { ResultsProofSection } from "#components/landing/results-proof-section";
import { TestimonialsSection } from "#components/landing/testimonials-section";
import { PageLayout } from "#components/layout/page-layout";
import { ComparisonTable } from "#components/sections/comparison-table";
import { LogoCloud } from "#components/sections/logo-cloud";
import { Button } from "#components/ui/button";
import { LazySection } from "#components/ui/lazy-section";
import { SectionSkeleton } from "#components/ui/section-skeleton";
import { cn } from "#lib/utils";

export default function FeaturesClient() {
	const [stickyCtaVisible, setStickyCtaVisible] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setStickyCtaVisible(window.scrollY > 800);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<PageLayout>
			{/* Sticky CTA */}
			<div
				className={cn(
					"fixed top-4 right-4 z-50 transition-all duration-500 transform",
					stickyCtaVisible
						? "translate-y-0 opacity-100"
						: "-translate-y-2 opacity-0 pointer-events-none",
				)}
			>
				<Button
					size="lg"
					className="shadow-2xl shadow-primary/25 font-semibold"
					asChild
				>
					<Link href="/pricing" aria-label="Get started free">
						Start free — no card
						<ArrowRight className="size-4 ml-2" />
					</Link>
				</Button>
			</div>
			<HeroSection />
			<FeatureCallouts />
			<TestimonialsSection />
			<BentoFeaturesSection />

			<LogoCloud />

			<ResultsProofSection />

			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<ComparisonTable />
			</LazySection>

			<FinalCtaSection />
		</PageLayout>
	);
}
