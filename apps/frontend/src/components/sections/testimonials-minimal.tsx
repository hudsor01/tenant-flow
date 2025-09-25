'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
	animationClasses,
	cardClasses,
	cn,
	TYPOGRAPHY_SCALE
} from '@/lib/design-system'
import { Shield, Star, TrendingUp, Users } from 'lucide-react'
import * as React from 'react'

const testimonials = [
	{
		name: 'Sarah Chen',
		role: 'Property Manager',
		company: 'Metropolitan Properties',
		avatar:
			'https://images.unsplash.com/photo-1494790108755-2616b612b1fa?w=150&h=150&fit=crop&crop=face',
		content:
			"TenantFlow has completely transformed our property management operations. We've increased efficiency by 300%.",
		stars: 5,
		metric: '300% efficiency',
		category: 'Operations'
	},
	{
		name: 'Michael Rodriguez',
		role: 'Real Estate Investor',
		company: 'Rodriguez Holdings',
		avatar:
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
		content:
			'The automated systems have saved us countless hours. Our tenant satisfaction has never been higher.',
		stars: 5,
		metric: '15 hrs/week saved',
		category: 'Automation'
	},
	{
		name: 'Emily Johnson',
		role: 'Portfolio Director',
		company: 'Urban Living Group',
		avatar:
			'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
		content:
			"Best investment we've made. The ROI tracking and reporting features are game-changing.",
		stars: 5,
		metric: '30% ROI increase',
		category: 'Analytics'
	}
]

const trustIndicators = [
	{ icon: Users, label: '25,000+ Happy Users', color: 'text-primary' },
	{ icon: Star, label: '4.9/5 Average Rating', color: 'text-primary' },
	{ icon: TrendingUp, label: '150% Growth Rate', color: 'text-primary' },
	{ icon: Shield, label: '99.8% Uptime SLA', color: 'text-primary' }
]

export interface TestimonialsMinimalProps
	extends React.ComponentProps<'section'> {
	showTrustIndicators?: boolean
	showMetrics?: boolean
	variant?: 'minimal' | 'cards' | 'quotes'
}

export const TestimonialsMinimal = React.forwardRef<
	HTMLElement,
	TestimonialsMinimalProps
>(
	(
		{
			showTrustIndicators = true,
			showMetrics = true,
			variant = 'cards',
			className,
			...props
		},
		ref
	) => {
		const variantStyles = {
			minimal: 'section-content bg-background',
			cards: 'section-hero bg-background',
			quotes: 'section-hero bg-gradient-to-b from-background to-muted/20'
		}

		return (
			<section
				ref={ref}
				className={cn(
					'relative overflow-hidden',
					variantStyles[variant],
					className
				)}
				{...props}
			>
				{/* Background Pattern */}
				<div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />

				<div className="relative container mx-auto px-6 max-w-7xl">
					{/* Enhanced Header */}
					<BlurFade delay={0.1}>
						<div className="text-center mb-16 max-w-3xl mx-auto">
							<Badge variant="secondary" className="mb-6 text-sm font-medium">
								<Users className="mr-2 size-4" />
								Trusted by industry leaders
							</Badge>

							<h2
								className="mb-6 text-foreground tracking-tight"
								style={TYPOGRAPHY_SCALE['display-lg']}
							>
								Loved by Property Managers
							</h2>

							<p
								className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								Join thousands of property managers who have transformed their
								operations with TenantFlow
							</p>
						</div>
					</BlurFade>

					{/* Testimonials Grid */}
					<div className="grid lg:grid-cols-3 gap-8 mb-16">
						{testimonials.map((testimonial, index) => (
							<BlurFade key={testimonial.name} delay={0.2 + index * 0.1}>
								<div
									className={cn(
										cardClasses('elevated'),
										animationClasses('fade-in'),
										'card-padding text-center hover:shadow-lg h-full flex flex-col'
									)}
								>
									{/* Category Badge */}
									<div className="flex items-center justify-between mb-6">
										<Badge variant="outline" className="text-xs">
											{testimonial.category}
										</Badge>
										{showMetrics && (
											<Badge
												variant="secondary"
												className="text-xs font-medium"
											>
												{testimonial.metric}
											</Badge>
										)}
									</div>

									{/* Stars */}
									<div className="flex items-center justify-center gap-1 mb-6">
										{[...Array(testimonial.stars)].map((_, i) => (
											<Star
												key={i}
												className="w-4 h-4 fill-primary text-primary"
											/>
										))}
									</div>

									{/* Quote */}
									<blockquote
										className="text-foreground mb-8 leading-relaxed flex-grow"
										style={TYPOGRAPHY_SCALE['body-md']}
									>
										"{testimonial.content}"
									</blockquote>

									{/* Author */}
									<div className="flex items-center justify-center gap-4 mt-auto">
										<Avatar className="w-12 h-12 ring-2 ring-primary/10">
											<AvatarImage
												src={testimonial.avatar}
												alt={testimonial.name}
											/>
											<AvatarFallback className="bg-primary/10 text-primary font-medium">
												{testimonial.name
													.split(' ')
													.map(n => n[0])
													.join('')}
											</AvatarFallback>
										</Avatar>
										<div className="text-left">
											<div className="font-semibold text-sm text-foreground">
												{testimonial.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{testimonial.role}
											</div>
											<div className="text-xs text-primary font-medium">
												{testimonial.company}
											</div>
										</div>
									</div>
								</div>
							</BlurFade>
						))}
					</div>

					{/* Trust Indicators */}
					{showTrustIndicators && (
						<BlurFade delay={0.6}>
							<div className="border-t border-border pt-16">
								<div className="text-center mb-8">
									<p
										className="text-muted-foreground"
										style={TYPOGRAPHY_SCALE['body-sm']}
									>
										Trusted by property management professionals worldwide
									</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
									{trustIndicators.map((indicator, index) => {
										const Icon = indicator.icon
										return (
											<div key={index} className="text-center group">
												<div className="flex items-center justify-center mb-3">
													<div className="p-3 rounded-full bg-muted/50 group-hover:bg-muted transition-colors">
														<Icon className={cn('size-6', indicator.color)} />
													</div>
												</div>
												<div
													className="font-bold text-foreground mb-1"
													style={TYPOGRAPHY_SCALE['heading-md']}
												>
													{indicator.label.split(' ')[0]}
												</div>
												<div
													className="text-muted-foreground"
													style={TYPOGRAPHY_SCALE['body-sm']}
												>
													{indicator.label.split(' ').slice(1).join(' ')}
												</div>
											</div>
										)
									})}
								</div>
							</div>
						</BlurFade>
					)}
				</div>
			</section>
		)
	}
)

TestimonialsMinimal.displayName = 'TestimonialsMinimal'
