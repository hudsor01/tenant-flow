/**
 * Optimized Hero Section - React 19 + Next.js 15 Server Component
 * Static hero with trust indicators and modern UnoCSS styling
 */

import Link from 'next/link'

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
			<div className="w-container-lg mx-auto text-center">
				{/* Trust Indicators - UnoCSS styling */}
				<div className="mb-8 center gap-8">
					<div className="hstack gap-1">
						{[...Array(5)].map((_, i) => (
							<i className="i-lucide-star inline-block h-5 w-5 fill-yellow-400 text-yellow-400" key={i} />
						))}
						<span className="ml-2 font-medium text-neutral-600">
							4.9/5 (2,847 reviews)
						</span>
					</div>
				</div>

				{/* Main Value Prop - Modern typography */}
				<h1 className="mb-6 text-5xl font-bold text-neutral-900 md:text-6xl lg:text-7xl">
					Property_ Management
					<span className="text-brand-500 block">
						Without the Headache
					</span>
				</h1>

				<p className="mx-auto mb-8 w-container-md text-xl text-neutral-600 md:text-2xl">
					Join 10,000+ property managers saving 10 hours per week with
					automated rent collection, maintenance tracking, and tenant
					portals.
				</p>

				{/* CTA with React 19 + UnoCSS patterns */}
				<div className="mb-6">
					<Link 
						href={`/${locale}/signup`}
						className="inline-block"
					>
						<button className="btn-primary text-lg px-10 py-6 transform hover:(-translate-y-1 shadow-xl) transition-all duration-300">
							<span className="hstack">
								Start Your 14-Day Free Trial
								<i className="i-lucide-arrow-right inline-block h-5 w-5"  />
							</span>
						</button>
					</Link>
					<p className="mt-3 text-sm text-neutral-500">
						No credit card required • Setup in 5 minutes • Cancel
						anytime
					</p>
					<p className="mt-2 text-sm font-semibold text-warning">
						🔥 437 property managers started their trial this week
					</p>
				</div>

				{/* Social Proof - Simplified */}
				<div className="mt-12">
					<p className="mb-4 text-sm text-neutral-500">
						Trusted by leading property management companies
					</p>
					<div className="hstack justify-center gap-8 opacity-60 grayscale">
						{trustLogos.map(logo => (
							<div
								key={logo.name}
								className="text-lg font-semibold text-neutral-400"
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
