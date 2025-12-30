'use client'

import { PageLayout } from '#components/layout/page-layout'
import { LogoCloud } from '#components/sections/logo-cloud'
import { ComparisonTable } from '#components/sections/comparison-table'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import { getBreadcrumbSchema } from '#components/landing/features-data'

// Page sections
import { StickyCta } from '#components/landing/sticky-cta'
import { HeroSection } from '#components/landing/hero-section'
import { FeatureCallouts } from '#components/landing/feature-callouts'
import { TestimonialsSection } from '#components/landing/testimonials-section'
import { BentoFeaturesSection } from '#components/landing/bento-features-section'
import { ResultsProofSection } from '#components/landing/results-proof-section'
import { FinalCtaSection } from '#components/landing/final-cta-section'

export default function FeaturesPage() {
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')

	const breadcrumbSchema = getBreadcrumbSchema(baseUrl)

	return (
		<PageLayout>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>

			<StickyCta />
			<HeroSection />
			<FeatureCallouts />
			<TestimonialsSection />
			<BentoFeaturesSection />

			<LogoCloud
				title="Powered by best-in-class integrations"
				subtitle="Seamlessly connect with the tools you already use"
			/>

			<ResultsProofSection />

			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<ComparisonTable />
			</LazySection>

			<FinalCtaSection />
		</PageLayout>
	)
}
