/**
 * Modern Pricing Hero Component
 * Inspired by Supabase's clean gradient design
 */

import { Shield, Star, Zap, Users, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function PricingHero() {
	return (
		<section className="relative bg-gradient-to-b from-white via-gray-50/30 to-white py-24">
			{/* Background pattern */}
<<<<<<< HEAD
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(15_23_42_/_0.15)_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(circle_at_center,white,transparent_85%)]" />
=======
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(15_23_42_/_0.15)_1px,transparent_0)] [mask-image:radial-gradient(circle_at_center,white,transparent_85%)] [background-size:24px_24px]" />
>>>>>>> origin/main

			<div className="relative mx-auto max-w-7xl px-4 text-center">
				{/* Badge */}
				<div className="mb-8">
					<Badge
						variant="secondary"
						className="border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700 hover:bg-blue-100"
					>
						<Zap className="mr-2 h-4 w-4" />
						Simple, transparent pricing
					</Badge>
				</div>

				{/* Main headline */}
<<<<<<< HEAD
				<h1 className="mb-6 text-5xl font-bold leading-tight text-gray-900 sm:text-6xl lg:text-7xl">
=======
				<h1 className="mb-6 text-5xl leading-tight font-bold text-gray-900 sm:text-6xl lg:text-7xl">
>>>>>>> origin/main
					Pricing that grows
					<br />
					<span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
						with your business
					</span>
				</h1>

				{/* Subtitle */}
				<p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-gray-600 sm:text-2xl">
					Start managing your properties today with our 14-day free
					trial. Choose a plan that fits your portfolio size—upgrade
					anytime as you grow.
				</p>

				{/* Trust indicators */}
				<div className="mb-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
					<div className="flex items-center gap-2">
						<Shield className="h-5 w-5 text-green-600" />
						<span className="font-medium">Bank-level security</span>
					</div>
					<div className="flex items-center gap-2">
						<Star className="h-5 w-5 text-yellow-500" />
						<span className="font-medium">
							4.9/5 customer rating
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Users className="h-5 w-5 text-blue-600" />
						<span className="font-medium">
							10,000+ properties managed
						</span>
					</div>
					<div className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-purple-600" />
						<span className="font-medium">99.9% uptime SLA</span>
					</div>
				</div>

				{/* Value propositions */}
				<div className="mx-auto max-w-5xl">
					<div className="grid gap-8 md:grid-cols-3">
						<div className="group rounded-2xl border border-gray-200 bg-white p-8 text-left shadow-sm transition-all hover:shadow-lg">
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-colors group-hover:bg-blue-200">
								<Zap className="h-6 w-6 text-blue-600" />
							</div>
							<h3 className="mb-3 text-lg font-semibold text-gray-900">
								Start in minutes
							</h3>
							<p className="leading-relaxed text-gray-600">
								No complex setup required. Import your existing
								properties and start managing tenants
								immediately with our intuitive interface.
							</p>
						</div>

						<div className="group rounded-2xl border border-gray-200 bg-white p-8 text-left shadow-sm transition-all hover:shadow-lg">
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 transition-colors group-hover:bg-green-200">
								<TrendingUp className="h-6 w-6 text-green-600" />
							</div>
							<h3 className="mb-3 text-lg font-semibold text-gray-900">
								Scale effortlessly
							</h3>
							<p className="leading-relaxed text-gray-600">
								Flexible plans that grow with your portfolio.
								Upgrade seamlessly without losing data or
								disrupting operations.
							</p>
						</div>

						<div className="group rounded-2xl border border-gray-200 bg-white p-8 text-left shadow-sm transition-all hover:shadow-lg">
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 transition-colors group-hover:bg-purple-200">
								<Shield className="h-6 w-6 text-purple-600" />
							</div>
							<h3 className="mb-3 text-lg font-semibold text-gray-900">
								Enterprise security
							</h3>
							<p className="leading-relaxed text-gray-600">
								Bank-grade encryption, SOC 2 compliance, and
								regular security audits keep your sensitive data
								protected.
							</p>
						</div>
					</div>
				</div>

				{/* Social proof */}
				<div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
					<div className="mb-6 flex items-center justify-center gap-2">
						<div className="flex">
							{[...Array(5)].map((_, i) => (
								<Star
									key={i}
									className="h-5 w-5 fill-yellow-400 text-yellow-400"
								/>
							))}
						</div>
						<span className="text-sm font-medium text-gray-600">
							4.9 out of 5
						</span>
					</div>
					<blockquote className="text-lg text-gray-700">
						"TenantFlow transformed how we manage our 200+ unit
						portfolio. The automation features alone save us 10+
						hours per week."
					</blockquote>
					<div className="mt-4 flex items-center justify-center gap-3">
						<div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600" />
						<div className="text-left">
							<div className="font-semibold text-gray-900">
								Sarah Chen
							</div>
							<div className="text-sm text-gray-600">
								Property Manager, BlueSky Realty
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
