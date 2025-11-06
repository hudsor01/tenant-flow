'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { cn } from '#lib/utils'
import { Quote } from 'lucide-react'

interface TestimonialsSectionProps {
	className?: string
}

export function TestimonialsSection({ className }: TestimonialsSectionProps) {
	const testimonials = [
		{
			quote:
				'Within 2 months, TenantFlow paid for itself. We collected 98% of rent on-time and saved 15 hours weekly on manual tasks.',
			author: 'Sarah Johnson',
			title: 'Property Manager, 24 units',
			plan: 'Growth Plan'
		},
		{
			quote:
				'The automated late fees and payment reminders alone saved us thousands. Our NOI increased by 35% in the first quarter.',
			author: 'Michael Chen',
			title: 'Portfolio Owner, 8 properties',
			plan: 'Starter Plan'
		},
		{
			quote:
				"Managing 50+ units used to be overwhelming. TenantFlow's automation handles everything seamlessly. Best investment we've made.",
			author: 'Jennifer Martinez',
			title: 'Property Management Company',
			plan: 'Growth Plan'
		},
		{
			quote:
				'The tenant screening and lease management features are game-changers. We reduced turnover by 40% and filled vacancies 60% faster.',
			author: 'David Thompson',
			title: 'Property Owner, 12 units',
			plan: 'Growth Plan'
		}
	]

	return (
		<section className={cn('relative py-20 overflow-hidden', className)}>
			<div className="container px-4 mx-auto">
				<div className="text-center mb-16 max-w-3xl mx-auto">
					<BlurFade delay={0.1} inView>
						<h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
							What Our Customers Say
						</h2>
						<p className="text-xl text-muted-foreground leading-relaxed">
							Real results from property managers who chose TenantFlow
						</p>
					</BlurFade>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
					{testimonials.map((testimonial, index) => (
						<BlurFade key={index} delay={0.2 + index * 0.1} inView>
							<div className="relative group h-full">
								<div className="relative bg-card border border-border rounded-2xl p-8 h-full hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
									{/* Quote icon */}
									<Quote className="size-10 text-primary/20 mb-6" />

									{/* Quote text */}
									<blockquote className="text-lg text-foreground/90 leading-relaxed mb-6 font-medium">
										&quot;{testimonial.quote}&quot;
									</blockquote>

									{/* Attribution */}
									<div className="border-t border-border/50 pt-6">
										<div className="font-bold text-foreground text-lg mb-1">
											{testimonial.author}
										</div>
										<div className="text-sm text-muted-foreground mb-2">
											{testimonial.title}
										</div>
										<div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
											{testimonial.plan}
										</div>
									</div>

									{/* Subtle gradient overlay on hover */}
									<div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-primary/2 rounded-2xl pointer-events-none transition-opacity duration-300" />
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</div>
		</section>
	)
}
