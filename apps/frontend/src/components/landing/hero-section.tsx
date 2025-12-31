'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'

export function HeroSection() {
	return (
		<section className="relative pb-16 overflow-hidden page-offset-navbar">
			<div className="absolute inset-0 bg-[color-mix(in_oklch,var(--color-primary)_5%,transparent)]" />
			<div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_1px_1px,var(--color-foreground)_1px,transparent_0)] bg-size-[32px_32px]" />

			<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
				<BlurFade delay={0.1} inView>
					<div className="text-center max-w-5xl mx-auto space-y-8">
						<h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
							<span className="text-foreground">
								Transform your portfolio into a
							</span>{' '}
							<span className="hero-highlight">profit powerhouse</span>
						</h1>

						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl font-medium">
							Join 10,000+ property managers who&apos;ve increased NOI by 40%
							with enterprise-grade automation and AI-powered analytics.{' '}
							<span className="text-foreground font-semibold">
								ROI guaranteed in 90 days.
							</span>
						</p>

						<div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
							<Button
								size="lg"
								className="group relative overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 typography-large px-8 py-4"
								asChild
							>
								<Link href="/pricing" aria-label="Start free trial">
									<span className="relative z-10 flex items-center">
										Start Free Trial
										<ArrowRight className="size-5 ml-3 transition-transform group-hover:translate-x-1" />
									</span>
								</Link>
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 typography-large px-8 py-4 transition-all duration-300"
								asChild
							>
								<Link href="/contact" aria-label="See TenantFlow in action">
									<ArrowRight className="size-5 mr-3 opacity-70 group-hover:opacity-100" />
									See it in action
								</Link>
							</Button>
						</div>

						<p className="text-muted-foreground/80 typography-small">
							<Check className="size-4 inline text-primary mr-2" />
							Join 10,000+ managers already growing NOI • No credit card required
						</p>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}
