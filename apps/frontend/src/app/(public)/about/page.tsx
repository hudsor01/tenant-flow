'use client'

import React from 'react'
import { motion } from '@/lib/lazy-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
	Building2,
	Users,
	Target,
	Zap,
	Heart,
	Shield,
	Award,
	ArrowRight,
	Sparkles
} from 'lucide-react'
import Link from 'next/link'

const values = [
	{
		icon: Target,
		title: 'User-Focused',
		description:
			'Every feature starts with understanding your actual needs, not what we think you need.'
	},
	{
		icon: Zap,
		title: 'Lightning Fast',
		description:
			'Time is money. Our platform is optimized for speed so you can work efficiently.'
	},
	{
		icon: Heart,
		title: 'Built with Care',
		description:
			'We obsess over the details so you can focus on growing your business.'
	},
	{
		icon: Shield,
		title: 'Secure & Reliable',
		description:
			'Bank-level security and 99.9% uptime guarantee. Your data is safe with us.'
	}
]

// Server Component for static content
function CompanyStats() {
	const stats = [
		{ label: 'Properties Managed', value: '10K+', icon: Building2 },
		{ label: 'Happy Property Owners', value: '2.5K+', icon: Users },
		{ label: 'Years of Experience', value: '8+', icon: Award },
		{ label: 'Uptime Guarantee', value: '99.9%', icon: Shield }
	]

	return (
		<div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
			{stats.map(stat => {
				const IconComponent = stat.icon
				return (
					<Card
						key={stat.label}
						className="to-muted/30 border-0 bg-gradient-to-br from-white transition-all duration-300 hover:shadow-lg"
					>
						<CardContent className="p-6 text-center">
							<div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
								<IconComponent className="text-primary h-6 w-6" />
							</div>
							<div className="text-foreground mb-2 text-3xl font-bold">
								{stat.value}
							</div>
							<div className="text-muted-foreground text-sm">
								{stat.label}
							</div>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}

export function AboutContent() {
	return (
		<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
			{/* Hero Section */}
			<section className="px-4 pb-16 pt-24">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 text-center">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="mb-6"
						>
							<Badge className="from-primary via-accent to-success border-0 bg-gradient-to-r px-6 py-2 text-sm font-semibold text-white shadow-lg">
								<Sparkles className="mr-2 h-4 w-4" />
								About TenantFlow
							</Badge>
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							className="text-foreground mb-6 text-5xl font-bold leading-tight lg:text-6xl"
						>
							Revolutionizing{' '}
							<span className="from-primary via-accent to-success bg-gradient-to-r bg-clip-text text-transparent">
								Property Management
							</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed"
						>
							We&apos;re on a mission to simplify property
							management for everyone. From individual landlords
							to large property management companies, TenantFlow
							makes it easy to manage properties, tenants, and
							maintenance - all in one place.
						</motion.p>
					</div>

					{/* Stats Grid */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.3 }}
					>
						<CompanyStats />
					</motion.div>
				</div>
			</section>

			{/* Story Section */}
			<section className="px-4 py-16">
				<div className="mx-auto max-w-4xl">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="prose prose-lg text-muted-foreground mx-auto"
					>
						<h2 className="text-foreground mb-8 text-center text-3xl font-bold">
							Our Story
						</h2>

						<div className="space-y-6 leading-relaxed">
							<p>
								TenantFlow was born from frustration. In 2016,
								our founders - property owners themselves - were
								drowning in spreadsheets, paper leases, and
								endless phone calls. They knew there had to be a
								better way to manage rental properties.
							</p>

							<p>
								After trying every property management software
								on the market, they found the same problems
								everywhere: complex interfaces, bloated
								features, and pricing that didn't make sense for
								small to medium property owners. So they decided
								to build something different.
							</p>

							<p>
								Starting with just five beta users in a
								co-working space in Austin, TenantFlow grew
								through word-of-mouth from property owners who
								finally found software that actually made their
								lives easier. No venture capital, no aggressive
								sales tactics - just a commitment to building
								the best property management platform possible.
							</p>

							<p>
								Today, TenantFlow serves thousands of property
								owners worldwide, from individual investors
								managing a single rental to large portfolios
								spanning multiple markets. Every feature we
								build, every design decision we make, stems from
								real feedback from real property managers facing
								real challenges.
							</p>
						</div>
					</motion.div>
				</div>
			</section>

			{/* Values Section */}
			<section className="from-muted/20 to-muted/10 bg-gradient-to-r px-4 py-16">
				<div className="mx-auto max-w-6xl">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="mb-16 text-center"
					>
						<h2 className="text-foreground mb-6 text-4xl font-bold">
							Our Values
						</h2>
						<p className="text-muted-foreground mx-auto max-w-2xl text-xl">
							These core principles guide every decision we make
							and every feature we build.
						</p>
					</motion.div>

					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
						{values.map((value, index) => {
							const IconComponent = value.icon
							return (
								<motion.div
									key={value.title}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{
										duration: 0.5,
										delay: index * 0.1
									}}
									viewport={{ once: true }}
								>
									<Card className="h-full border-0 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
										<CardContent className="p-6 text-center">
											<div className="from-primary to-accent mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br">
												<IconComponent className="h-8 w-8 text-white" />
											</div>
											<h3 className="text-foreground mb-3 text-xl font-semibold">
												{value.title}
											</h3>
											<p className="text-muted-foreground leading-relaxed">
												{value.description}
											</p>
										</CardContent>
									</Card>
								</motion.div>
							)
						})}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-4 py-16">
				<div className="mx-auto max-w-4xl text-center">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
					>
						<Card className="from-primary/5 via-accent/5 to-success/5 border-0 bg-gradient-to-br backdrop-blur-sm">
							<CardContent className="p-12">
								<h2 className="text-foreground mb-6 text-4xl font-bold">
									Ready to Transform Your Property Management?
								</h2>
								<p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
									Join thousands of property owners who've
									already simplified their operations with
									TenantFlow.
								</p>
								<div className="flex flex-col justify-center gap-4 sm:flex-row">
									<Link href="/auth/signup">
										<Button
											variant="premium"
											size="lg"
											className="group"
										>
											Start Free Trial
											<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
										</Button>
									</Link>
									<Link href="/contact">
										<Button variant="outline" size="lg">
											Talk to Sales
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</section>
		</div>
	)
}

export default function AboutPage() {
	return <AboutContent />
}
