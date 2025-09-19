'use client'

import { cn } from '@/lib/utils'
import { ArrowRight, Play } from 'lucide-react'
import Link from 'next/link'

interface HeroSectionProps {
	className?: string
}

export function HeroSection({ className }: HeroSectionProps) {
	return (
		<div className={cn('relative overflow-hidden', className)}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
				<div className="max-w-4xl text-center mx-auto">
					<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.1]">
						Property Management Made{' '}
						<span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
							Simple
						</span>
					</h1>
					<p className="mt-6 text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
						Streamline tenant management, track maintenance, and maximize your
						real estate investments with our intuitive platform.
					</p>
				</div>

				<div className="mt-12 relative max-w-5xl mx-auto">
					{/* Main visual container with Apple-inspired design */}
					<div className="relative w-full h-[400px] sm:h-[480px] lg:h-[560px] rounded-3xl overflow-hidden bg-gradient-to-br from-primary/5 via-primary/8 to-primary/12 border border-border/30 shadow-2xl">
						{/* Premium gradient background */}
						<div className="absolute inset-0 bg-gradient-to-br from-background/95 via-primary/5 to-primary/10" />

						{/* Subtle mesh pattern overlay */}
						<div
							className="absolute inset-0 opacity-30"
							style={{
								backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--color-primary) / 0.15) 1px, transparent 0)`,
								backgroundSize: '24px 24px'
							}}
						/>

						{/* Glass overlay for depth */}
						<div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/20 backdrop-blur-[0.5px]" />

						{/* Apple-style play button overlay */}
						<div className="absolute inset-0 flex items-center justify-center">
							<button
								className="group flex items-center gap-4 px-8 py-4 bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl hover:bg-background/95 hover:shadow-3xl hover:scale-105 transition-all duration-300 ease-out"
								aria-label="Play overview video"
							>
								<div className="relative">
									<div className="absolute inset-0 bg-primary/30 rounded-full blur-xl group-hover:bg-primary/40 transition-all duration-300" />
									<div className="relative w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-xl">
										<Play
											className="w-6 h-6 text-primary-foreground ml-0.5"
											fill="currentColor"
										/>
									</div>
								</div>
								<span className="text-base font-semibold text-foreground tracking-tight">
									Play overview
								</span>
							</button>
						</div>
					</div>

					{/* Decorative elements */}
					<div className="absolute -bottom-12 -left-20 -z-10">
						<div className="w-48 h-48 bg-gradient-to-br from-primary/30 to-primary/5 rounded-2xl blur-2xl" />
					</div>

					<div className="absolute -top-12 -right-20 -z-10">
						<div className="w-48 h-48 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-full blur-2xl" />
					</div>
				</div>

				{/* Apple-style CTA Buttons */}
				<div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
					<Link href="/auth/signup" className="group relative overflow-hidden">
						<div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300" />
						<div className="relative flex items-center justify-center min-w-[220px] px-8 py-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-base rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out">
							Get Started Free
							<ArrowRight className="ml-2 h-5 w-5" />
						</div>
					</Link>

					<Link href="/demo" className="group relative overflow-hidden">
						<div className="relative flex items-center justify-center min-w-[220px] px-8 py-4 bg-background/95 backdrop-blur-sm border border-border/50 text-foreground font-semibold text-base rounded-2xl shadow-lg hover:shadow-xl hover:bg-background hover:scale-105 transition-all duration-300 ease-out">
							View Live Demo
						</div>
					</Link>
				</div>

				{/* Trust badges */}
				<div className="mt-12 text-center">
					<p className="text-sm text-muted-foreground mb-6">
						Trusted by property managers worldwide
					</p>
					<div className="flex items-center justify-center gap-8 flex-wrap">
						<div className="text-center">
							<div className="text-2xl font-bold text-foreground">500+</div>
							<div className="text-xs text-muted-foreground">
								Properties Managed
							</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-foreground">10K+</div>
							<div className="text-xs text-muted-foreground">Happy Tenants</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-foreground">99.9%</div>
							<div className="text-xs text-muted-foreground">
								Platform Uptime
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default HeroSection
