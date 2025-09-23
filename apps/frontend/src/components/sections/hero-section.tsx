'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Particles } from '@/components/magicui/particles'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import {
	ArrowRight,
	CheckCircle,
	Clock,
	Play,
	Sparkles,
	Users
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import * as React from 'react'

export interface PremiumHeroSectionProps
	extends React.ComponentProps<'section'> {
	announcementText?: string
	headline?: string
	subheadline?: string
	primaryCTAText?: string
	primaryCTAHref?: string
	secondaryCTAText?: string
	secondaryCTAHref?: string
}

export const PremiumHeroSection = React.forwardRef<
	HTMLElement,
	PremiumHeroSectionProps
>(
	(
		{
			announcementText = 'Trusted by 10,000+ property managers',
			headline = 'Simplify Property Management',
			subheadline = "Professional property managers streamline operations, automate workflows, and scale their business with TenantFlow's enterprise-grade platform.",
			primaryCTAText = 'Start 14-day transformation',
			primaryCTAHref = '/signup',
			secondaryCTAText = 'See ROI calculator',
			secondaryCTAHref = '/demo',
			className,
			...props
		},
		ref
	) => {
		const router = useRouter()

		return (
			<section
				ref={ref}
				className={cn(
					'relative min-h-screen flex items-center justify-center overflow-hidden',
					'bg-background',
					'pt-32 pb-24 sm:pt-40 sm:pb-32',
					className
				)}
				{...props}
			>
				{/* Background Effects */}
				<div className="absolute inset-0 gradient-authority opacity-10" />
				<div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />
				<Particles
					className="absolute inset-0"
					quantity={30}
					ease={80}
					color="hsl(var(--muted-foreground))"
					refresh
				/>

				{/* Content Container */}
				<div className="relative z-10 container px-4 mx-auto">
					<div className="max-w-7xl mx-auto">
						{/* Enhanced Announcement Banner */}
						<BlurFade delay={0.1} inView>
							<div className="text-center mb-12">
								<div className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-primary/20 hover:border-primary/40 bg-gradient-to-r from-background/90 via-card/90 to-background/90 backdrop-blur-sm shadow-lg hover:shadow-primary/25 cursor-pointer group transition-all duration-300 ease-out">
									<Sparkles className="w-4 h-4 mr-2 text-primary animate-pulse" />
									<span className="inline animate-gradient bg-gradient-to-r from-accent via-primary to-accent bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent font-semibold">
										{announcementText}
									</span>
									<ArrowRight className="w-4 h-4 ml-2 text-primary transition-transform group-hover:translate-x-1" />
								</div>
							</div>
						</BlurFade>

						{/* Hero Content with Property Image */}
						<div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
							{/* Left Column - Text Content */}
							<div className="lg:pr-8">
								{/* Enhanced Main Headline */}
								<BlurFade delay={0.2} inView>
									<div className="text-center lg:text-left mb-8">
										<h1
											className="text-balance leading-tight mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
											style={TYPOGRAPHY_SCALE['display-2xl']}
										>
											{headline}
										</h1>
										<p
											className="text-muted-foreground leading-relaxed text-balance"
											style={TYPOGRAPHY_SCALE['body-lg']}
										>
											{subheadline}
										</p>
									</div>
								</BlurFade>

								{/* CTA Buttons - Left Aligned */}
								<BlurFade delay={0.3} inView>
									<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
										<Button
											size="lg"
											className="px-8 py-4 text-lg font-semibold shadow-2xl bg-primary hover:bg-primary/90"
											onClick={() => router.push(primaryCTAHref)}
										>
											<span className="flex items-center gap-2">
												{primaryCTAText}
												<ArrowRight className="w-5 h-5" />
											</span>
										</Button>
										<Button
											variant="outline"
											size="lg"
											className="px-6 py-4 text-lg font-medium border-2 hover:shadow-lg"
											onClick={() => router.push(secondaryCTAHref)}
										>
											<Play className="w-4 h-4 mr-2" />
											{secondaryCTAText}
										</Button>
									</div>
									<p className="text-sm text-muted-foreground font-medium text-center lg:text-left">
										No setup fees • Enterprise security • 99.9% uptime SLA
									</p>
								</BlurFade>
							</div>

							{/* Right Column - Property Image */}
							<BlurFade delay={0.4} inView>
								<div className="relative">
									<div className="relative w-full h-[400px] lg:h-[500px] rounded-[24px] overflow-hidden shadow-2xl">
										<Image
											src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070&auto=format&fit=crop"
											alt="Modern luxury apartment building showcasing TenantFlow property management"
											fill
											className="object-cover"
											priority
											sizes="(max-width: 768px) 100vw, 50vw"
										/>
									</div>
								</div>
							</BlurFade>
						</div>

						{/* Social Proof - Stats Section */}
						<BlurFade delay={0.5} inView>
							<div className="max-w-4xl mx-auto mb-20">
								<div className="grid grid-cols-3 gap-8 text-center">
									<div>
										<div className="text-4xl font-bold text-primary mb-2">
											10K+
										</div>
										<p className="text-sm text-muted-foreground font-medium">
											Property Managers
										</p>
									</div>
									<div>
										<div className="text-4xl font-bold text-primary mb-2">
											40%
										</div>
										<p className="text-sm text-muted-foreground font-medium">
											Average NOI Increase
										</p>
									</div>
									<div>
										<div className="text-4xl font-bold text-primary mb-2">
											99.9%
										</div>
										<p className="text-sm text-muted-foreground font-medium">
											Uptime SLA
										</p>
									</div>
								</div>
							</div>
						</BlurFade>

						{/* Trust Indicators */}
						<BlurFade delay={0.4} inView>
							<div className="text-center text-muted-foreground">
								<p
									className="font-medium mb-2"
									style={TYPOGRAPHY_SCALE['body-md']}
								>
									Join property managers who've transformed their business
								</p>
								<div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
									<div className="flex items-center gap-2 text-accent">
										<CheckCircle className="size-4" />
										<span>Pays for itself in 2.3 months</span>
									</div>
									<div className="flex items-center gap-2 text-primary">
										<Users className="size-4" />
										<span>Dedicated success manager</span>
									</div>
									<div className="flex items-center gap-2 text-primary">
										<Clock className="size-4" />
										<span>Cancel anytime</span>
									</div>
								</div>
							</div>
						</BlurFade>
					</div>
				</div>

				{/* Bottom Gradient */}
				<div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
			</section>
		)
	}
)

PremiumHeroSection.displayName = 'PremiumHeroSection'
