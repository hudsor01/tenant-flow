'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, CheckCircle, Clock, Sparkles } from 'lucide-react'

interface SaasCtaSectionProps {
	className?: string
}

const guarantees = [
	'14-day free trial',
	'No credit card required',
	'Cancel anytime',
	'30-day money-back guarantee'
]

const quickFacts = [
	{ icon: Clock, text: 'Setup in under 24 hours' },
	{ icon: CheckCircle, text: '99.9% uptime guarantee' },
	{ icon: Sparkles, text: 'Award-winning support team' }
]

export function SaasCtaSection({ className }: SaasCtaSectionProps) {
	return (
		<section
			className={cn(
				'relative py-32 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden',
				className
			)}
		>
			{/* Background Effects */}
			<div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />

			<div className="container px-4 mx-auto relative z-10">
				<div className="max-w-4xl mx-auto text-center">
					{/* Main CTA Content */}
					<BlurFade delay={0.1} inView>
						<Badge
							variant="outline"
							className="mb-6 px-4 py-2 bg-background/50 backdrop-blur-sm"
						>
							<Sparkles className="w-4 h-4 mr-2" />
							Ready to get started?
						</Badge>
					</BlurFade>

					<BlurFade delay={0.2} inView>
						<h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
							<span className="block">Transform your</span>
							<span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
								property management
							</span>
							<span className="block">today</span>
						</h2>
					</BlurFade>

					<BlurFade delay={0.3} inView>
						<p className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
							Join 10,000+ property managers who have streamlined their
							operations, increased revenue, and improved tenant satisfaction
							with TenantFlow.
						</p>
					</BlurFade>

					{/* CTA Buttons */}
					<BlurFade delay={0.4} inView>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
							<ShimmerButton
								shimmerColor="hsl(var(--primary-foreground))"
								shimmerSize="0.05em"
								shimmerDuration="3s"
								borderRadius="12px"
								background="linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)"
								className="relative px-12 py-6 text-xl font-semibold text-white border-0 shadow-2xl transition-all hover:scale-105"
							>
								Start your free trial
								<ArrowRight className="w-6 h-6 ml-3 transition-transform group-hover:translate-x-1" />
							</ShimmerButton>

							<Button
								variant="outline"
								size="lg"
								className="px-12 py-6 text-xl font-medium bg-background/50 backdrop-blur-sm border-2 hover:bg-background/80"
							>
								Schedule a demo
							</Button>
						</div>
					</BlurFade>

					{/* Guarantees */}
					<BlurFade delay={0.5} inView>
						<div className="flex flex-wrap items-center justify-center gap-6 mb-16">
							{guarantees.map((guarantee, index) => (
								<div
									key={index}
									className="flex items-center text-sm text-muted-foreground"
								>
									<CheckCircle className="w-4 h-4 text-primary mr-2" />
									{guarantee}
								</div>
							))}
						</div>
					</BlurFade>

					{/* Feature Highlights */}
					<BlurFade delay={0.6} inView>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
							{quickFacts.map((fact, index) => (
								<div
									key={index}
									className="flex flex-col items-center p-6 rounded-2xl bg-background/30 backdrop-blur-sm border border-border/50"
								>
									<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4">
										<fact.icon className="w-6 h-6 text-primary-foreground" />
									</div>
									<p className="text-sm font-medium text-foreground">
										{fact.text}
									</p>
								</div>
							))}
						</div>
					</BlurFade>

					{/* Final Urgency Statement */}
					<BlurFade delay={0.7} inView>
						<div className="relative card-padding rounded-3xl bg-gradient-to-r from-muted/30 to-muted/10 backdrop-blur-sm border border-border/50">
							<BorderBeam size={250} duration={12} delay={9} />
							<div className="relative z-10">
								<h3 className="text-2xl font-bold mb-4">
									Ready to revolutionize your property management?
								</h3>
								<p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
									Don't let inefficient processes hold back your growth. Start
									your free trial today and see the difference TenantFlow can
									make in just 24 hours.
								</p>
								<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
									<Clock className="w-4 h-4" />
									<span>
										Implementation typically completed within 24 hours
									</span>
								</div>
							</div>
						</div>
					</BlurFade>

					{/* Trust Indicators */}
					<BlurFade delay={0.8} inView>
						<div className="mt-16 pt-8 border-t border-border/50">
							<div className="flex flex-wrap items-center justify-center gap-8 text-xs text-muted-foreground">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-primary"></div>
									<span>SOC 2 Type II Compliant</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-primary/80"></div>
									<span>GDPR Compliant</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-accent"></div>
									<span>256-bit SSL Encryption</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-primary/60"></div>
									<span>99.9% Uptime SLA</span>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</div>

			{/* Bottom border effect */}
			<div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
		</section>
	)
}
