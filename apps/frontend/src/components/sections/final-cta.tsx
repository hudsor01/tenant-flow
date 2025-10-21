'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Particles } from '@/components/magicui/particles'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, Check } from 'lucide-react'

interface FinalCtaProps {
	className?: string
}

export function FinalCta({ className }: FinalCtaProps) {
	return (
		<section
			className={cn(
				'relative py-32 lg:py-40 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10',
				className
			)}
		>
			{/* Particles background */}
			<Particles
				className="absolute inset-0"
				quantity={60}
				preset="floating"
				size={1}
				color="oklch(var(--primary))"
				density="medium"
			/>

			<div className="container px-4 mx-auto relative z-10">
				<div className="max-w-4xl mx-auto text-center">
					<BlurFade delay={0.1} inView>
						<h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-8 leading-tight">
							Ready to transform your
							<span className="text-primary block">property portfolio?</span>
						</h2>
					</BlurFade>

					<BlurFade delay={0.2} inView>
						<p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed mb-12 max-w-3xl mx-auto">
							Join 2,847 property managers who've increased their NOI by 40% and
							save 20+ hours weekly.
							<span className="block mt-2 text-foreground font-semibold">
								Start your free 14-day trial today — no credit card required.
							</span>
						</p>
					</BlurFade>

					<BlurFade delay={0.3} inView>
						<div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
							<Button
								size="lg"
								className="group relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 text-xl font-semibold px-12 py-6"
								asChild
							>
								<a href="/signup" aria-label="Start free trial">
									<span className="relative z-10 flex items-center">
										Start Free 14-Day Trial
										<ArrowRight className="w-6 h-6 ml-3 transition-transform group-hover:translate-x-1" />
									</span>
								</a>
							</Button>

							<Button
								variant="outline"
								size="lg"
								className="group border-2 border-border hover:border-primary/50 hover:bg-primary/5 text-xl font-semibold px-12 py-6 transition-all duration-300 backdrop-blur-sm"
								asChild
							>
								<a href="/contact" aria-label="Schedule demo">
									<ArrowRight className="w-6 h-6 mr-3 opacity-70 group-hover:opacity-100" />
									Book a Demo
								</a>
							</Button>
						</div>
					</BlurFade>

					<BlurFade delay={0.4} inView>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-3xl mx-auto">
							<div className="flex flex-col items-center">
								<Check className="w-6 h-6 text-accent mb-2" />
								<span className="text-sm font-medium text-muted-foreground">
									No setup fees or hidden costs
								</span>
							</div>
							<div className="flex flex-col items-center">
								<Check className="w-6 h-6 text-accent mb-2" />
								<span className="text-sm font-medium text-muted-foreground">
									Cancel anytime, no questions asked
								</span>
							</div>
							<div className="flex flex-col items-center">
								<Check className="w-6 h-6 text-accent mb-2" />
								<span className="text-sm font-medium text-muted-foreground">
									ROI guaranteed in 90 days
								</span>
							</div>
						</div>
					</BlurFade>

					<BlurFade delay={0.5} inView>
						<div className="mt-16 pt-8 border-t border-border/20">
							<p className="text-muted-foreground/80 text-sm">
								🔒 Your data is secure with SOC 2 Type II certification and
								bank-level encryption
							</p>
						</div>
					</BlurFade>
				</div>
			</div>

			{/* Decorative gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/20 pointer-events-none" />
		</section>
	)
}
