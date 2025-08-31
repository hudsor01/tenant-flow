/**
 * CTA Section - Client Component with Magic UI
 * Enhanced with animations and ShimmerButton CTAs
 */
'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'
import { DollarSign, Shield, Bell, Home, Sparkles, ArrowRight, Phone, Star } from 'lucide-react'
import { ShimmerButton, BlurFade } from '@/components/magicui'
import { ANIMATION_DELAYS } from '@/lib/animations/constants'

const trustPoints = [
	{
		icon: DollarSign,
		title: 'Free Trial',
		subtitle: '14 days, no CC required',
		gradient: 'from-success/80 to-success'
	},
	{
		icon: Shield,
		title: 'Secure',
		subtitle: 'Bank-level encryption',
		gradient: 'from-primary/80 to-primary'
	},
	{
		icon: Bell,
		title: '24/7 Support',
		subtitle: 'Always here to help',
		gradient: 'from-accent/80 to-accent'
	},
	{
		icon: Home,
		title: '10,000+ Users',
		subtitle: 'Trusted nationwide',
		gradient: 'from-warning/80 to-warning'
	}
]

export function CtaSection() {
	const posthog = usePostHog()

	const handleSignupClick = useCallback(() => {
		posthog?.capture('cta_signup_clicked', {
			location: 'hero_section',
			cta_text: 'Start Your Free Trial Now',
			source: 'landing_page'
		})
	}, [posthog])

	const handleDemoClick = useCallback(() => {
		posthog?.capture('cta_demo_clicked', {
			location: 'hero_section',
			cta_text: 'Schedule a Demo',
			source: 'landing_page'
		})
	}, [posthog])

	return (
	<section className="section-spacing relative overflow-hidden bg-gradient-to-br from-primary via-accent to-primary/80 text-white">
			{/* Enhanced background effects */}
			<div className="absolute inset-0">
				<div className="animate-blob absolute left-10 top-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
				<div className="animate-blob animation-delay-2000 absolute bottom-10 right-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
				<div className="animate-blob animation-delay-4000 absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-white/5 blur-3xl" />
			</div>

			<div className="container relative z-10 mx-auto max-w-5xl px-6 lg:px-8 text-center">
				{/* Enhanced header with badge */}
				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 0}>
					<div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
						<Sparkles className="h-4 w-4" />
						<span className="text-sm font-medium">
							Join 10,000+ Property Managers
						</span>
					</div>
				</BlurFade>

				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 1}>
					<h2 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
						Ready to Transform Your
						<span className="block bg-gradient-to-r from-warning to-warning/70 bg-clip-text text-transparent">
							Property Management?
						</span>
					</h2>
				</BlurFade>

				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 2}>
					<p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-white/80">
						Join thousands of property managers who save time, increase
						revenue, and delight tenants with TenantFlow
					</p>
				</BlurFade>

				{/* Enhanced CTA buttons with glassmorphism */}
				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 3}>
					<div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Link
						href="/auth/signup?source=cta"
						className="w-full sm:w-auto"
					>
						<ShimmerButton
							className="hover:shadow-3xl group h-16 w-full min-w-[280px] rounded-xl px-8 text-lg font-semibold shadow-2xl transition-all duration-300 hover:scale-105 sm:w-auto"
							onClick={handleSignupClick}
							aria-label="Start your free 14-day trial - no credit card required"
							shimmerColor="#3b82f6"
							background="rgba(255, 255, 255, 0.95)"
						>
							<span className="flex items-center justify-center gap-3 text-primary">
								Start Your Free Trial Now
								<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
							</span>
						</ShimmerButton>
					</Link>

					<Link
						href="/contact?demo=true&source=cta"
						className="w-full sm:w-auto"
					>
						<ShimmerButton
							className="h-16 w-full min-w-[280px] rounded-xl border-2 border-white/30 px-8 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white sm:w-auto"
							onClick={handleDemoClick}
							aria-label="Schedule a personalized demo with our team"
							shimmerColor="#ffffff"
							background="rgba(255, 255, 255, 0.1)"
						>
							<span className="flex items-center justify-center gap-3">
								<Phone className="h-5 w-5" />
								Schedule a Demo
							</span>
						</ShimmerButton>
					</Link>
					</div>
				</BlurFade>

				{/* Enhanced trust points with cards */}
				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 4}>
					<div className="mx-auto mb-12 grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
					{trustPoints.map((point, index) => (
						<Card
							key={index}
							className="group border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
						>
							<CardContent className="p-6 text-center">
								<div
									className={`mx-auto mb-4 h-12 w-12 bg-gradient-to-br ${point.gradient} flex items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110`}
								>
									<point.icon className="inline-block h-6 w-6 text-white" />
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
				</BlurFade>

				{/* Social proof with stars */}
				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 5}>
					<div className="flex flex-col items-center justify-center gap-6 text-white/80 sm:flex-row">
					<div className="flex items-center gap-2">
						<div className="flex">
							{[...Array(5)].map((_, i) => (
								<Star className="h-4 w-4 fill-warning text-warning" key={i} />
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
				</BlurFade>
			</div>
		</section>
	)
}

// Export both for compatibility
export { CtaSection as CTASection }
