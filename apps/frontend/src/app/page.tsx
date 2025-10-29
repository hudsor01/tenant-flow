'use client'

import Footer from '#components/layout/footer'
import { MarketingNav } from '#components/layout/marketing-nav'
import FeaturesSectionDemo from '#components/sections/features-section'
import { HeroSection } from '#components/sections/hero-section'
import { PremiumCta } from '#components/sections/premium-cta'
import { StatsShowcase } from '#components/sections/stats-showcase'

export default function HomePage() {
	return (
		<div className="relative min-h-screen flex flex-col">
			<MarketingNav />

			{/* Hero Section */}
			<HeroSection
				trustBadge="Trusted by 10,000+ property managers"
				title="Stop juggling"
				titleHighlight="multiple tools"
				subtitle="TenantFlow brings all your property management needs together. Streamline operations, automate workflows, and scale your business."
				primaryCta={{ label: 'Start Managing Properties', href: '/signup' }}
				secondaryCta={{ label: 'View Pricing', href: '/pricing' }}
				trustSignals="No setup fees • Enterprise security • 99.9% uptime SLA"
				image={{
					src: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3',
					alt: 'Modern luxury apartment building showcasing TenantFlow property management'
				}}
			/>

			{/* Magic UI Components */}
			<FeaturesSectionDemo />
			<StatsShowcase />
			<PremiumCta />

			<Footer />
		</div>
	)
}
