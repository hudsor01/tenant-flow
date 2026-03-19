'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '#components/ui/button'
import { PageLayout } from '#components/layout/page-layout'
import { HeroDashboardMockup } from '#components/sections/hero-dashboard-mockup'
import { LogoCloud } from '#components/sections/logo-cloud'
import { HowItWorks } from '#components/sections/how-it-works'
import { TestimonialsSection } from '#components/sections/testimonials-section'
import { ComparisonTable } from '#components/sections/comparison-table'
import { HomeFaq } from '#components/sections/home-faq'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import FeaturesSectionDemo from '#components/sections/features-section'
import { StatsShowcase } from '#components/sections/stats-showcase'
import { PremiumCta } from '#components/sections/premium-cta'
import { SOCIAL_PROOF } from '#config/social-proof'

export default function MarketingHomePage() {
	return (
		<PageLayout
			showGridPattern={true}
			containerClass="flex flex-col section-gap"
		>
			{/* Hero Section with Dashboard Mockup */}
			<section className="relative flex-1 flex flex-col">
				<div className="flex-1 w-full">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center lg:min-h-[32rem]">
							{/* Content */}
							<div className="flex flex-col justify-center space-y-8">
								<div className="space-y-6">
									<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
										Stop juggling{' '}
										<span className="hero-highlight">multiple tools</span>
									</h1>

									<p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
										TenantFlow brings all your property management needs
										together. Streamline operations, automate workflows, and
										scale your business.
									</p>
								</div>

								<div className="flex flex-row gap-4">
									<Button asChild size="lg">
										<Link href="/pricing">
											Start Managing Properties
											<ArrowRight className="ml-2 size-4" />
										</Link>
									</Button>
									<Button asChild variant="outline" size="lg">
										<Link href="/pricing">View Pricing</Link>
									</Button>
								</div>

								<p className="text-muted-foreground text-sm">
									{`Join ${SOCIAL_PROOF.managerCount} property managers already using TenantFlow`}
								</p>
							</div>

							{/* Dashboard Mockup */}
							<div className="relative hidden lg:block">
								<HeroDashboardMockup className="w-full" />
							</div>
						</div>
					</div>
				</div>

				{/* Logo Cloud - Trusted Integrations */}
				<LogoCloud />
			</section>

			{/* How It Works */}
			<LazySection
				fallback={<SectionSkeleton height={500} variant="grid" />}
				minHeight={500}
			>
				<HowItWorks />
			</LazySection>

			{/* Features Section */}
			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<FeaturesSectionDemo />
			</LazySection>

			{/* Testimonials Carousel */}
			<LazySection
				fallback={<SectionSkeleton height={500} variant="card" />}
				minHeight={500}
			>
				<TestimonialsSection />
			</LazySection>

			{/* Stats Showcase */}
			<LazySection
				fallback={<SectionSkeleton height={400} variant="card" />}
				minHeight={400}
			>
				<StatsShowcase />
			</LazySection>

			{/* Comparison Table */}
			<LazySection
				fallback={<SectionSkeleton height={600} variant="grid" />}
				minHeight={600}
			>
				<ComparisonTable />
			</LazySection>

			{/* FAQ Section */}
			<LazySection
				fallback={<SectionSkeleton height={500} variant="card" />}
				minHeight={500}
			>
				<HomeFaq />
			</LazySection>

			{/* Premium CTA */}
			<LazySection
				fallback={<SectionSkeleton height={400} variant="card" />}
				minHeight={400}
			>
				<PremiumCta />
			</LazySection>
		</PageLayout>
	)
}
