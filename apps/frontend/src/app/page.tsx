import { HeroSection } from 'src/components/marketing/hero-section'
import { Navbar } from 'src/components/navbar'
import { CTAMinimal } from 'src/components/sections/cta-minimal'
import FAQsFour from 'src/components/faqs-4'
import { FeaturesGrid } from 'src/components/sections/features-grid'
import FooterSection from 'src/components/footer'
import { MinimalistPricingSection } from 'src/components/sections/minimalist-pricing-section'
import StatsSection from 'src/components/stats-4'
import { TestimonialsMinimal } from 'src/components/sections/testimonials-minimal'

export default function HomePage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Navigation - Floating Glass Effect */}
			<Navbar />

			{/* Hero Section - Premium Video Background */}
			<HeroSection />

			{/* Stats Section - Social Proof */}
			<StatsSection />

			{/* Features Grid - Visual Showcase */}
			<FeaturesGrid className="py-24" />

			{/* Testimonials - Trust Building */}
			<TestimonialsMinimal className="bg-accent/5 py-24" />

			{/* Pricing - Clear Value Proposition */}
			<MinimalistPricingSection className="py-24" />

			{/* FAQ - Address Concerns */}
			<FAQsFour />

			{/* CTA - Final Conversion */}
			<CTAMinimal className="py-24" />

			{/* Footer - Clean and Functional */}
			<FooterSection />
		</div>
	)
}
