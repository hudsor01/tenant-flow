'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
	ArrowRight,
	Phone,
	DollarSign,
	Shield,
	Bell,
	Home,
	Sparkles,
	Star
} from 'lucide-react'

const trustPoints = [
	{
		icon: DollarSign,
		title: 'Free Trial',
		subtitle: '14 days, no CC required',
		gradient: 'from-green-400 to-emerald-500'
	},
	{
		icon: Shield,
		title: 'Secure',
		subtitle: 'Bank-level encryption',
		gradient: 'from-blue-400 to-cyan-500'
	},
	{
		icon: Bell,
		title: '24/7 Support',
		subtitle: 'Always here to help',
		gradient: 'from-purple-400 to-pink-500'
	},
	{
		icon: Home,
		title: '10,000+ Users',
		subtitle: 'Trusted nationwide',
		gradient: 'from-orange-400 to-red-500'
	}
]

export function CtaSection() {
	return (
		<section className="from-primary relative overflow-hidden bg-gradient-to-br via-purple-600 to-pink-600 px-4 py-24 text-white">
			{/* Enhanced background effects */}
			<div className="absolute inset-0">
				<div className="animate-blob absolute top-10 left-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
				<div className="animate-blob animation-delay-2000 absolute right-10 bottom-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
				<div className="animate-blob animation-delay-4000 absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-white/5 blur-3xl" />
			</div>

			<div className="relative z-10 container mx-auto max-w-5xl text-center">
				{/* Enhanced header with badge */}
				<div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
					<Sparkles className="h-4 w-4" />
					<span className="text-sm font-medium">
						Join 10,000+ Property Managers
					</span>
				</div>

				<h2 className="mb-6 text-4xl leading-tight font-bold md:text-6xl">
					Ready to Transform Your
					<span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
						Property Management?
					</span>
				</h2>

				<p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-white/80">
					Join thousands of property managers who save time, increase
					revenue, and delight tenants with TenantFlow
				</p>

				{/* Enhanced CTA buttons with glassmorphism */}
				<div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Link href="/auth/signup" className="w-full sm:w-auto">
						<Button
							size="lg"
							className="hover:shadow-3xl group h-16 w-full min-w-[280px] rounded-xl bg-white px-8 text-lg font-semibold text-blue-700 shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-gray-50 sm:w-auto"
						>
							<span className="flex items-center justify-center gap-3">
								Start Your Free Trial Now
								<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
							</span>
						</Button>
					</Link>

					<Link href="/contact" className="w-full sm:w-auto">
						<Button
							size="lg"
							variant="outline"
							className="h-16 w-full min-w-[280px] rounded-xl border-2 border-white/30 bg-white/10 px-8 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white/20 sm:w-auto"
						>
							<span className="flex items-center justify-center gap-3">
								<Phone className="h-5 w-5" />
								Schedule a Demo
							</span>
						</Button>
					</Link>
				</div>

				{/* Enhanced trust points with cards */}
				<div className="mx-auto mb-12 grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
					{trustPoints.map((point, index) => (
						<Card
							key={index}
							className="group border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/15"
						>
							<CardContent className="p-6 text-center">
								<div
									className={`mx-auto mb-4 h-12 w-12 bg-gradient-to-br ${point.gradient} flex items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110`}
								>
									<point.icon className="h-6 w-6 text-white" />
								</div>
								<p className="mb-1 font-semibold text-white">
									{point.title}
								</p>
								<p className="text-sm text-white/70">
									{point.subtitle}
								</p>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Social proof with stars */}
				<div className="flex flex-col items-center justify-center gap-6 text-white/80 sm:flex-row">
					<div className="flex items-center gap-2">
						<div className="flex">
							{[...Array(5)].map((_, i) => (
								<Star
									key={i}
									className="h-4 w-4 fill-yellow-300 text-yellow-300"
								/>
							))}
						</div>
						<span className="text-sm">
							4.9/5 from 1,200+ reviews
						</span>
					</div>
					<div className="text-sm">
						• Trusted by property managers nationwide
					</div>
				</div>
			</div>
		</section>
	)
}

// Export both for compatibility
export { CtaSection as CTASection }
