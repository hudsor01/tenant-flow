'use client'

import { useState, useEffect } from 'react'
import { cn } from '#lib/utils'
import { BlurFade } from '#components/ui/blur-fade'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import { Star } from 'lucide-react'
import { testimonials, type Testimonial } from './features-data'

export function TestimonialsSection() {
	const [currentTestimonial, setCurrentTestimonial] = useState(0)

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTestimonial(prev => (prev + 1) % testimonials.length)
		}, 5000)
		return () => clearInterval(interval)
	}, [])

	const t = (testimonials[currentTestimonial] ??
		testimonials[0]) as Testimonial

	return (
		<LazySection
			fallback={<SectionSkeleton height={400} variant="card" />}
			minHeight={400}
		>
			<section className="section-spacing-compact bg-muted/50">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.2} inView>
						<div className="text-center space-y-8">
							<div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/60">
								<div className="flex items-center space-x-2">
									<Star className="size-4 fill-current text-accent" />
									<span className="font-medium">Featured in PropTech Today</span>
								</div>
								<div className="flex items-center space-x-2">
									<span className="font-medium">99.9% Uptime SLA</span>
								</div>
							</div>

							<div className="max-w-4xl mx-auto">
								<div className="testimonial-card">
									<blockquote className="text-xl text-foreground font-medium leading-relaxed mb-6">
										&quot;{t.quote}&quot;
									</blockquote>
									<div className="flex-center space-x-4">
										<div className="size-12 rounded-full bg-primary/10 flex-center text-primary font-bold">
											{t.author
												.split(' ')
												.map(n => n[0])
												.join('')}
										</div>
										<div className="text-left">
											<div className="font-semibold text-foreground">
												{t.author}
											</div>
											<div className="text-muted-foreground text-sm">
												{t.title}, {t.company}
											</div>
										</div>
									</div>

									<div className="flex justify-center space-x-2 mt-6">
										{testimonials.map((testimonial, index) => (
											<button
												type="button"
												key={testimonial.author}
												onClick={() => setCurrentTestimonial(index)}
												className={cn(
													'size-2 rounded-full transition-colors duration-300',
													index === currentTestimonial
														? 'bg-primary'
														: 'bg-muted-foreground/30'
												)}
											/>
										))}
									</div>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</section>
		</LazySection>
	)
}
