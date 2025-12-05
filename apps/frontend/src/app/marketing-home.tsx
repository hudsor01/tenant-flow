'use client'

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

export default function MarketingHomePage() {
	return (
		<PageLayout showGridPattern={false} containerClass="flex flex-col section-gap">
				{/* Hero Section with Dashboard Mockup */}
				<section className="relative flex-1 flex flex-col">
					<div className="flex-1 w-full">
						<div className="max-w-7xl mx-auto px-6 lg:px-8">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-150">
								{/* Content */}
								<div className="flex flex-col justify-center space-y-8">
									<div className="space-y-6">
										<h1 className="text-responsive-display-xl font-bold text-foreground tracking-tight leading-[1.1]">
											Stop juggling{' '}
											<span className="hero-highlight">multiple tools</span>
										</h1>

										<p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
											TenantFlow brings all your property management needs together.
											Streamline operations, automate workflows, and scale your business.
										</p>
									</div>

									<div className="flex flex-row gap-4">
										<a
											href="/pricing"
											className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
										>
											Start Managing Properties
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="ml-2 size-4"
											>
												<path d="M5 12h14" />
												<path d="m12 5 7 7-7 7" />
											</svg>
										</a>
										<a
											href="/pricing"
											className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8"
										>
											View Pricing
										</a>
									</div>

									<p className="text-muted font-medium">
										Join 10,000+ property managers already using TenantFlow
									</p>
								</div>

								{/* Dashboard Mockup */}
								<div className="relative hidden lg:block">
									<HeroDashboardMockup className="w-full" />
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Logo Cloud - Trusted Integrations */}
				<LogoCloud />

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
