import FooterSection from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { PremiumHeroSection } from '@/components/sections/hero-section'

export default function HomePage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Navigation - Clean and Functional */}
			<Navbar />

			{/* Premium Hero Section - Design System Compliant */}
			<PremiumHeroSection
				announcementText="Trusted by 10,000+ property managers"
				headline="Stop juggling multiple tools"
				subheadline="TenantFlow brings all your property management needs together. Streamline operations, automate workflows, and scale your business with our enterprise-grade platform."
				primaryCTAText="Get Started Free"
				primaryCTAHref="/login"
				secondaryCTAText="View Pricing"
				secondaryCTAHref="/pricing"
			/>

			{/* Footer - Clean and Functional */}
			<FooterSection />
		</div>
	)
}
