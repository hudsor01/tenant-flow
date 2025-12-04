'use client'

import Footer from '#components/ui/layout/footer'
import Navbar from '#components/ui/layout/navbar'
import { HeroSection } from '#components/sections/hero-section'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import FeaturesSectionDemo from '#components/sections/features-section'
import { StatsShowcase } from '#components/sections/stats-showcase'
import { PremiumCta } from '#components/sections/premium-cta'

export default function MarketingHomePage() {
	return (
		<div className="relative min-h-screen flex flex-col marketing-page">
			<Navbar />

			{/* Main content with navbar offset */}
			<main className="flex-1 flex flex-col page-offset-navbar section-gap">
				{/* Hero Section - Loaded immediately (above fold) */}
				<HeroSection
					title="Stop juggling"
					titleHighlight="multiple tools"
					subtitle="TenantFlow brings all your property management needs together. Streamline operations, automate workflows, and scale your business."
					primaryCta={{ label: 'Start Managing Properties', href: '/pricing' }}
					secondaryCta={{ label: 'View Pricing', href: '/pricing' }}
					image={{
						src: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
						alt: 'Modern luxury apartment building showcasing TenantFlow property management'
					}}
				/>

				{/* Below-the-fold sections - Lazy loaded with intersection observer */}
				<LazySection
					fallback={<SectionSkeleton height={600} variant="grid" />}
					minHeight={600}
				>
					<FeaturesSectionDemo />
				</LazySection>

				<LazySection
					fallback={<SectionSkeleton height={400} variant="card" />}
					minHeight={400}
				>
					<StatsShowcase />
				</LazySection>

				<LazySection
					fallback={<SectionSkeleton height={400} variant="card" />}
					minHeight={400}
				>
					<PremiumCta />
				</LazySection>
			</main>

			<Footer />
		</div>
	)
}
