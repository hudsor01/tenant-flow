'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'

const checkItems = [
	'No setup fees',
	'Enterprise security',
	'99.9% uptime SLA',
	'Cancel anytime'
]

export function FinalCtaSection() {
	return (
		<LazySection
			fallback={<SectionSkeleton height={400} variant="card" />}
			minHeight={400}
		>
			<section className="section-spacing relative overflow-hidden">
				<div className="absolute inset-0 bg-muted/40" />

				<div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
					<BlurFade delay={0.5} inView>
						<div className="text-center space-y-8">
							<h2 className="font-bold tracking-tight leading-tight">
								<span className="text-foreground">
									Start your transformation{' '}
								</span>
								<span className="hero-highlight">today</span>
							</h2>

							<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
								Join 10,000+ property managers who&apos;ve transformed their
								portfolios with TenantFlow.
								<span className="block mt-2 text-foreground font-semibold">
									ROI guaranteed in 90 days or your money back.
								</span>
							</p>

							<div className="flex flex-col sm:flex-row gap-6 justify-center">
								<Button
									size="lg"
									className="group relative overflow-hidden shadow-2xl shadow-primary/25 hover:shadow-3xl hover:shadow-primary/40 transform hover:scale-[1.02] transition-all duration-300 typography-large px-10 py-5"
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
									variant="outline"
									size="lg"
									className="group border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 typography-large px-10 py-5 transition-all duration-300"
									asChild
								>
									<Link href="/contact" aria-label="Schedule demo">
										<ArrowRight className="size-5 mr-3 opacity-70 group-hover:opacity-100" />
										Schedule Demo
									</Link>
								</Button>
							</div>

							<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/80 typography-small">
								{checkItems.map(item => (
									<div key={item} className="flex-start">
										<Check className="size-4 text-primary mr-2" />
										{item}
									</div>
								))}
							</div>
						</div>
					</BlurFade>
				</div>
			</section>
		</LazySection>
	)
}
