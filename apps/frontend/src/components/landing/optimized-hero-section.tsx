/**
 * Optimized Hero Section - Server Component
 * Static hero with trust indicators and main value proposition
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star } from 'lucide-react'

interface OptimizedHeroSectionProps {
	locale: string
}

export function OptimizedHeroSection({ locale }: OptimizedHeroSectionProps) {
	const trustLogos = [
		{ name: 'Century 21' },
		{ name: 'RE/MAX' },
		{ name: 'Keller Williams' },
		{ name: 'Coldwell Banker' }
	]

	return (
		<section className="bg-gradient-to-b from-blue-50 to-white px-4 pb-20 pt-16">
			<div className="container mx-auto text-center">
				{/* Trust Indicators */}
				<div className="mb-8 flex justify-center gap-8">
					<div className="flex items-center gap-1">
						{[...Array(5)].map((_, i) => (
							<Star
								key={i}
								className="h-5 w-5 fill-yellow-400 text-yellow-400"
							/>
						))}
						<span className="ml-2 font-medium text-gray-600">
							4.9/5 (2,847 reviews)
						</span>
					</div>
				</div>

				{/* Main Value Prop */}
				<h1 className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl lg:text-7xl">
					Property Management
					<span className="text-primary block">
						Without the Headache
					</span>
				</h1>

				<p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600 md:text-2xl">
					Join 10,000+ property managers saving 10 hours per week with
					automated rent collection, maintenance tracking, and tenant
					portals.
				</p>

				{/* Single CTA with urgency */}
				<div className="mb-6">
					<Link href={`/${locale}/signup`}>
						<Button
							size="lg"
							className="h-auto transform bg-orange-500 px-10 py-6 text-lg font-semibold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-orange-600 hover:shadow-xl"
						>
							Start Your 14-Day Free Trial
							<ArrowRight className="ml-2 h-5 w-5" />
						</Button>
					</Link>
					<p className="mt-3 text-sm text-gray-500">
						No credit card required • Setup in 5 minutes • Cancel
						anytime
					</p>
					<p className="mt-2 text-sm font-semibold text-orange-600">
						🔥 437 property managers started their trial this week
					</p>
				</div>

				{/* Social Proof Logos */}
				<div className="mt-12">
					<p className="mb-4 text-sm text-gray-500">
						Trusted by leading property management companies
					</p>
					<div className="flex items-center justify-center gap-8 opacity-60 grayscale">
						{trustLogos.map(logo => (
							<div
								key={logo.name}
								className="text-lg font-semibold text-gray-400"
							>
								{logo.name}
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	)
}
