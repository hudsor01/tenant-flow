'use client'

import Footer from '#components/layout/footer'
import Navbar from '#components/layout/navbar'
import { HeroSection } from '#components/sections/hero-section'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import dynamic from 'next/dynamic'

// Lazy load below-the-fold sections
const FeaturesSectionDemo = dynamic(
	() => import('#components/sections/features-section'),
	{
		loading: () => <SectionSkeleton height={600} variant="grid" />
	}
)

const StatsShowcase = dynamic(
	() =>
		import('#components/sections/stats-showcase').then(mod => ({
			default: mod.StatsShowcase
		})),
	{
		loading: () => <SectionSkeleton height={400} variant="card" />
	}
)

const PremiumCta = dynamic(
	() =>
		import('#components/sections/premium-cta').then(mod => ({
			default: mod.PremiumCta
		})),
	{
		loading: () => <SectionSkeleton height={400} variant="card" />
	}
)

export default function HomePage() {
	return (
		<div className="relative min-h-screen flex flex-col marketing-page">
			<Navbar />

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

			<Footer />
		</div>
	)
}
