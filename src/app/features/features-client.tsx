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

export default function FeaturesClient() {
	return (
		<PageLayout>
			<HeroSection />
			<FeatureCallouts />
			<TestimonialsSection />
			<BentoFeaturesSection />

			<LogoCloud />

			<ResultsProofSection />

			<ComparisonTable />

			<FinalCtaSection />
		</PageLayout>
	);
}
