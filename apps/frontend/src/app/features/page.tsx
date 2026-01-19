'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '#components/ui/button'
import { cn } from '#lib/utils'
import { PageLayout } from '#components/layout/page-layout'
import { LogoCloud } from '#components/sections/logo-cloud'
import { ComparisonTable } from '#components/sections/comparison-table'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import { getBreadcrumbSchema } from '#components/landing/features-data'

// Page sections
import { HeroSection } from '#components/landing/hero-section'
import { FeatureCallouts } from '#components/landing/feature-callouts'
import { TestimonialsSection } from '#components/landing/testimonials-section'
import { BentoFeaturesSection } from '#components/landing/bento-features-section'
import { ResultsProofSection } from '#components/landing/results-proof-section'
import { FinalCtaSection } from '#components/landing/final-cta-section'

export default function FeaturesPage() {
	const [stickyCtaVisible, setStickyCtaVisible] = useState(false)

	useEffect(() => {
		const handleScroll = () => {
			setStickyCtaVisible(window.scrollY > 800)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

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

			{/* Sticky CTA */}
			<div
				className={cn(
					'fixed top-4 right-4 z-50 transition-all duration-500 transform',
					stickyCtaVisible
						? 'translate-y-0 opacity-100'
						: '-translate-y-2 opacity-0 pointer-events-none'
				)}
			>
				<Button
					size="lg"
					className="shadow-2xl shadow-primary/25 font-semibold"
					asChild
				>
					<Link href="/pricing" aria-label="Get started free">
						Start Free Trial
						<ArrowRight className="size-4 ml-2" />
					</Link>
				</Button>
			</div>
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
