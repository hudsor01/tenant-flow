import Navbar from '@/components/navbar'
import { StripePricingSection } from '@/components/sections/stripe-pricing-section'

export default function StripePricingPage() {
	return (
		<main className="min-h-screen surface-glow">
			<Navbar />
			<div className="pt-20">
				<StripePricingSection />
			</div>
		</main>
	)
}
