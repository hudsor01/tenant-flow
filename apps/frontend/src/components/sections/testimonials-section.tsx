'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '#lib/utils'
import { BlurFade } from '#components/ui/blur-fade'
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { Button } from '#components/ui/button'

interface Testimonial {
	quote: string
	author: string
	title: string
	company: string
	metric?: string
	metricLabel?: string
}

interface TestimonialsSectionProps {
	className?: string
	testimonials?: Testimonial[]
	autoRotate?: boolean
	rotateInterval?: number
	variant?: 'carousel' | 'grid'
}

const defaultTestimonials: Testimonial[] = [
	{
		quote:
			'TenantFlow transformed how we manage our 35-unit portfolio. The automation alone saves us 20+ hours per week on rent collection and maintenance coordination.',
		author: 'Sarah Chen',
		title: 'Portfolio Manager',
		company: 'Westside Properties',
		metric: '+47%',
		metricLabel: 'NOI increase'
	},
	{
		quote:
			"We evaluated 6 different platforms before choosing TenantFlow. The ROI was clear within 60 days - best property management decision we've made.",
		author: 'Marcus Rodriguez',
		title: 'Director of Operations',
		company: 'Urban Real Estate Group',
		metric: '60 days',
		metricLabel: 'to positive ROI'
	},
	{
		quote:
			'The tenant portal has completely changed our relationship with residents. Maintenance requests are handled faster, and tenants love being able to pay rent online.',
		author: 'Jennifer Walsh',
		title: 'Property Manager',
		company: 'Metropolitan Holdings',
		metric: '4.9/5',
		metricLabel: 'tenant satisfaction'
	},
	{
		quote:
			"As a small landlord with 8 units, I thought enterprise software was overkill. TenantFlow proved me wrong - it's powerful yet simple enough for solo operators.",
		author: 'David Park',
		title: 'Independent Owner',
		company: 'Park Properties LLC',
		metric: '25 hrs',
		metricLabel: 'saved weekly'
	},
	{
		quote:
			'The financial reporting alone is worth the subscription. I can generate professional reports for my investors in minutes instead of hours with spreadsheets.',
		author: 'Amanda Foster',
		title: 'Asset Manager',
		company: 'Foster Investments',
		metric: '90%',
		metricLabel: 'faster reporting'
	}
]

export function TestimonialsSection({
	className,
	testimonials = defaultTestimonials,
	autoRotate = true,
	rotateInterval = 6000,
	variant = 'carousel'
}: TestimonialsSectionProps) {
	const [currentIndex, setCurrentIndex] = useState(0)
	const [isAutoRotating, setIsAutoRotating] = useState(autoRotate)

	const goToNext = useCallback(() => {
		setCurrentIndex(prev => (prev + 1) % testimonials.length)
	}, [testimonials.length])

	const goToPrev = useCallback(() => {
		setCurrentIndex(
			prev => (prev - 1 + testimonials.length) % testimonials.length
		)
	}, [testimonials.length])

	const goToSlide = useCallback((index: number) => {
		setCurrentIndex(index)
		setIsAutoRotating(false)
	}, [])

	// Auto-rotate
	useEffect(() => {
		if (!isAutoRotating || variant === 'grid') return

		const interval = setInterval(goToNext, rotateInterval)
		return () => clearInterval(interval)
	}, [isAutoRotating, goToNext, rotateInterval, variant])

	const currentTestimonial = testimonials[currentIndex]

	if (variant === 'grid') {
		return (
			<section
				className={cn('section-spacing relative overflow-hidden', className)}
			>
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16 max-w-3xl mx-auto">
						<BlurFade delay={0.1} inView>
							<h2 className="text-3xl lg:typography-h1 tracking-tight text-foreground mb-4">
								What Our Customers Say
							</h2>
							<p className="text-xl text-muted-foreground leading-relaxed">
								Real results from property managers who chose TenantFlow
							</p>
						</BlurFade>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
						{testimonials.slice(0, 4).map((testimonial, index) => (
							<BlurFade
								key={testimonial.author}
								delay={0.2 + index * 0.1}
								inView
							>
								<TestimonialCard testimonial={testimonial} />
							</BlurFade>
						))}
					</div>
				</div>
			</section>
		)
	}

	return (
		<section className={cn('section-spacing bg-muted/30', className)}>
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<BlurFade delay={0.1} inView>
					<div className="text-center mb-12">
						<h2 className="text-3xl lg:typography-h1 tracking-tight text-foreground mb-4">
							Trusted by property managers{' '}
							<span className="hero-highlight">everywhere</span>
						</h2>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							Join thousands of property managers who've transformed their
							operations with TenantFlow
						</p>
					</div>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<div className="relative max-w-4xl mx-auto">
						{/* Main testimonial card */}
						<div className="relative bg-card rounded-2xl border border-border p-8 md:p-12 shadow-lg">
							{/* Quote icon */}
							<div className="absolute -top-4 left-8 md:left-12">
								<div className="icon-container-lg bg-primary text-primary-foreground shadow-lg">
									<Quote className="size-6" />
								</div>
							</div>

							{/* Stars */}
							<div className="flex gap-1 mb-6 pt-4">
								{[...Array(5)].map((_, i) => (
									<Star key={i} className="size-5 fill-accent text-accent" />
								))}
							</div>

							{/* Quote */}
							<blockquote className="text-xl md:text-2xl text-foreground font-medium leading-relaxed mb-8">
								"{currentTestimonial?.quote}"
							</blockquote>

							{/* Author info */}
							<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
								<div className="flex items-center gap-4">
									{/* Initial avatar instead of photo */}
									<div className="size-14 rounded-full bg-primary/10 flex-center text-primary text-xl font-bold">
										{currentTestimonial?.author
											.split(' ')
											.map(n => n[0])
											.join('')}
									</div>
									<div>
										<div className="font-semibold text-foreground text-lg">
											{currentTestimonial?.author}
										</div>
										<div className="text-muted-foreground">
											{currentTestimonial?.title}
										</div>
										<div className="text-muted-foreground text-sm">
											{currentTestimonial?.company}
										</div>
									</div>
								</div>

								{/* Metric highlight */}
								{currentTestimonial?.metric && (
									<div className="text-center md:text-right p-4 rounded-xl bg-primary/5 border border-primary/10">
										<div className="typography-h2 text-primary">
											{currentTestimonial.metric}
										</div>
										<div className="text-sm text-muted-foreground">
											{currentTestimonial.metricLabel}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Navigation */}
						<div className="flex items-center justify-center gap-4 mt-8">
							<Button
								variant="outline"
								size="icon"
								onClick={() => {
									goToPrev()
									setIsAutoRotating(false)
								}}
								className="rounded-full"
								aria-label="Previous testimonial"
							>
								<ChevronLeft className="size-5" />
							</Button>

							{/* Dots */}
							<div className="flex gap-2">
								{testimonials.map((_, index) => (
									<button
										key={index}
										type="button"
										onClick={() => goToSlide(index)}
										className={cn(
											'size-2.5 rounded-full transition-all duration-300',
											index === currentIndex
												? 'bg-primary w-8'
												: 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
										)}
										aria-label={`Go to testimonial ${index + 1}`}
									/>
								))}
							</div>

							<Button
								variant="outline"
								size="icon"
								onClick={() => {
									goToNext()
									setIsAutoRotating(false)
								}}
								className="rounded-full"
								aria-label="Next testimonial"
							>
								<ChevronRight className="size-5" />
							</Button>
						</div>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	return (
		<div className="relative group h-full">
			<div className="card-standard p-8 h-full flex flex-col hover:border-primary/20 hover:shadow-lg transition-all duration-300">
				{/* Quote icon */}
				<Quote className="size-8 text-primary/20 mb-4" />

				{/* Stars */}
				<div className="flex gap-0.5 mb-4">
					{[...Array(5)].map((_, i) => (
						<Star key={i} className="size-4 fill-accent text-accent" />
					))}
				</div>

				{/* Quote text */}
				<blockquote className="text-foreground/90 leading-relaxed mb-6 flex-1">
					"{testimonial.quote}"
				</blockquote>

				{/* Attribution */}
				<div className="flex items-center justify-between pt-4 border-t border-border/50">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-full bg-primary/10 flex-center text-primary text-sm font-bold">
							{testimonial.author
								.split(' ')
								.map(n => n[0])
								.join('')}
						</div>
						<div>
							<div className="font-semibold text-foreground">
								{testimonial.author}
							</div>
							<div className="text-sm text-muted-foreground">
								{testimonial.company}
							</div>
						</div>
					</div>

					{testimonial.metric && (
						<div className="text-right">
							<div className="text-lg font-bold text-primary">
								{testimonial.metric}
							</div>
							<div className="text-xs text-muted-foreground">
								{testimonial.metricLabel}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default TestimonialsSection
