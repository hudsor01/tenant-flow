'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid'
import { cn } from '@/lib/utils'
import { Building2, MapPin, Quote, Star, TrendingUp, Users } from 'lucide-react'
import * as React from 'react'

const testimonials = [
	{
		id: 'sarah-chen',
		name: 'Sarah Chen',
		role: 'Property Manager',
		company: 'Metropolitan Properties',
		location: 'San Francisco, CA',
		avatar:
			'https://images.unsplash.com/photo-1494790108755-2616b612b1fa?w=150&h=150&fit=crop&crop=face',
		content:
			"TenantFlow has completely transformed our property management operations. We've increased efficiency by 300% and our tenant satisfaction scores are at an all-time high.",
		stars: 5,
		metric: '300% efficiency boost',
		properties: '47 properties',
		highlight: true,
		gridArea: 'tw-:col-span-2 tw-:row-span-2'
	},
	{
		id: 'michael-rodriguez',
		name: 'Michael Rodriguez',
		role: 'Real Estate Investor',
		company: 'Rodriguez Holdings',
		location: 'Austin, TX',
		avatar:
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
		content:
			'The automated systems have saved us countless hours. Our tenant satisfaction has never been higher and rent collection is now 99% automated.',
		stars: 5,
		metric: '15 hrs/week saved',
		properties: '23 properties',
		gridArea: 'tw-:col-span-1 tw-:row-span-1'
	},
	{
		id: 'emily-johnson',
		name: 'Emily Johnson',
		role: 'Portfolio Director',
		company: 'Urban Living Group',
		location: 'Denver, CO',
		avatar:
			'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
		content:
			"Best investment we've made for our portfolio. The ROI tracking and reporting features are absolutely game-changing for our business.",
		stars: 5,
		metric: '30% ROI increase',
		properties: '91 properties',
		gridArea: 'tw-:col-span-1 tw-:row-span-1'
	},
	{
		id: 'david-park',
		name: 'David Park',
		role: 'Operations Manager',
		company: 'Coastal Rentals',
		location: 'Miami, FL',
		avatar:
			'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
		content:
			'TenantFlow streamlined our entire workflow. From screening to maintenance requests, everything is seamless and professional.',
		stars: 5,
		metric: '50% faster processing',
		properties: '34 properties',
		gridArea: 'tw-:col-span-1 tw-:row-span-2'
	}
]

const trustMetrics = [
	{
		icon: Users,
		label: '25,000+',
		description: 'Happy Property Managers',
		color: 'text-blue-600'
	},
	{
		icon: Building2,
		label: '500K+',
		description: 'Properties Managed',
		color: 'text-blue-600'
	},
	{
		icon: TrendingUp,
		label: '98.5%',
		description: 'Customer Satisfaction',
		color: 'text-blue-600'
	},
	{
		icon: Star,
		label: '4.9/5',
		description: 'Average Rating',
		color: 'text-blue-600'
	}
]

interface TestimonialsBentoProps extends React.ComponentProps<'section'> {
	showTrustMetrics?: boolean
	variant?: 'default' | 'compact'
}

export const TestimonialsBento = React.forwardRef<
	HTMLElement,
	TestimonialsBentoProps
>(
	(
		{
			showTrustMetrics = true,
			className,
			...props
		},
		ref
	) => {
		return (
			<section
				ref={ref}
				className={cn(
					'relative overflow-hidden py-24 bg-gradient-to-b from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-950/10',
					className
				)}
				{...props}
			>
				{/* Background Pattern */}
				<div className="absolute inset-0 bg-grid-small-blue/[0.02] dark:bg-grid-small-blue/[0.05]" />

				<div className="relative container mx-auto px-6 max-w-7xl">
					{/* Enhanced Header */}
					<BlurFade delay={0.1}>
						<div className="text-center mb-16 max-w-4xl mx-auto">
							<Badge
								variant="secondary"
								className="mb-6 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
							>
								<Users className="mr-2 size-4" />
								Trusted by 25,000+ Property Managers
							</Badge>

							<h2 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 dark:from-blue-100 dark:via-blue-200 dark:to-blue-300 bg-clip-text text-transparent tracking-tight">
								Loved by Property Managers Worldwide
							</h2>

							<p className="text-xl text-[var(--color-label-secondary)] dark:text-[var(--color-label-secondary)] leading-relaxed max-w-3xl mx-auto">
								Join thousands of property managers who have transformed their
								operations with TenantFlow's all-in-one platform
							</p>
						</div>
					</BlurFade>

					{/* Bento Testimonials Grid */}
					<BlurFade delay={0.3}>
						<BentoGrid className="tw-:grid tw-:w-full tw-:auto-rows-[20rem] tw-:grid-cols-3 tw-:gap-6 tw-:mb-16">
							{testimonials.map((testimonial) => (
								<BentoCard
									key={testimonial.id}
									name={testimonial.name}
									className={cn(
										testimonial.gridArea,
										'tw-:group tw-:relative tw-:overflow-hidden tw-:rounded-2xl tw-:border-blue-200/50 dark:tw-:border-blue-800/30',
										'tw-:bg-gradient-to-br tw-:from-blue-50/80 tw-:via-white tw-:to-blue-100/60',
										'dark:tw-:from-blue-950/40 dark:tw-:via-blue-900/20 dark:tw-:to-blue-950/60',
										'tw-:backdrop-blur-sm tw-:shadow-lg tw-:shadow-blue-500/10',
										'hover:tw-:shadow-xl hover:tw-:shadow-blue-500/20 tw-:transition-all tw-:duration-500',
										testimonial.highlight &&
											'tw-:ring-2 tw-:ring-blue-500/20 dark:tw-:ring-blue-400/30'
									)}
									Icon={() => (
										<Quote className="tw-:h-8 tw-:w-8 tw-:text-blue-600 dark:tw-:text-blue-400" />
									)}
									description={testimonial.content}
									href="#"
									cta="View Full Story"
									background={
										<div className="tw-:absolute tw-:inset-0 tw-:p-6 tw-:flex tw-:flex-col tw-:justify-between">
											{/* Header with Avatar and Stars */}
											<div className="tw-:flex tw-:items-start tw-:justify-between tw-:mb-4">
												<div className="tw-:flex tw-:items-center tw-:gap-3">
													<Avatar className="tw-:w-12 tw-:h-12 tw-:ring-2 tw-:ring-blue-200 dark:tw-:ring-blue-700">
														<AvatarImage
															src={testimonial.avatar}
															alt={testimonial.name}
														/>
														<AvatarFallback className="tw-:bg-blue-100 tw-:text-blue-700 dark:tw-:bg-blue-800 dark:tw-:text-blue-200">
															{testimonial.name
																.split(' ')
																.map(n => n[0])
																.join('')}
														</AvatarFallback>
													</Avatar>
													<div>
														<div className="tw-:font-semibold tw-:text-[var(--color-label-primary)] dark:tw-:text-[var(--color-label-primary)]">
															{testimonial.name}
														</div>
														<div className="tw-:text-sm tw-:text-[var(--color-label-secondary)] dark:tw-:text-[var(--color-label-tertiary)]">
															{testimonial.role}
														</div>
													</div>
												</div>
												<div className="tw-:flex tw-:gap-1">
													{[...Array(testimonial.stars)].map((_, i) => (
														<Star
															key={i}
															className="tw-:w-4 tw-:h-4 tw-:fill-amber-400 tw-:text-amber-400"
														/>
													))}
												</div>
											</div>

											{/* Quote */}
											<blockquote className="tw-:text-[var(--color-label-secondary)] dark:tw-:text-[var(--color-label-secondary)] tw-:leading-relaxed tw-:flex-grow tw-:mb-4">
												"{testimonial.content}"
											</blockquote>

											{/* Footer with Company and Metrics */}
											<div className="tw-:flex tw-:items-center tw-:justify-between tw-:text-sm">
												<div className="tw-:flex tw-:items-center tw-:gap-2 tw-:text-blue-600 dark:tw-:text-blue-400">
													<Building2 className="tw-:w-4 tw-:h-4" />
													<span className="tw-:font-medium">
														{testimonial.company}
													</span>
												</div>
												<div className="tw-:flex tw-:items-center tw-:gap-4">
													<Badge
														variant="outline"
														className="tw-:text-xs tw-:border-blue-200 dark:tw-:border-blue-700"
													>
														{testimonial.metric}
													</Badge>
													<div className="tw-:flex tw-:items-center tw-:gap-1 tw-:text-[var(--color-label-tertiary)] dark:tw-:text-[var(--color-label-tertiary)]">
														<MapPin className="tw-:w-3 tw-:h-3" />
														<span className="tw-:text-xs">
															{testimonial.location}
														</span>
													</div>
												</div>
											</div>
										</div>
									}
								/>
							))}
						</BentoGrid>
					</BlurFade>

					{/* Trust Metrics */}
					{showTrustMetrics && (
						<BlurFade delay={0.6}>
							<div className="border-t border-blue-200/50 dark:border-blue-800/30 pt-16">
								<div className="text-center mb-8">
									<p className="text-lg text-[var(--color-label-secondary)] dark:text-[var(--color-label-secondary)]">
										Trusted by property management professionals worldwide
									</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
									{trustMetrics.map((metric, index) => {
										const Icon = metric.icon
										return (
											<div key={index} className="text-center group">
												<div className="flex items-center justify-center mb-4">
													<div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
														<Icon className={cn('size-6', metric.color)} />
													</div>
												</div>
												<div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
													{metric.label}
												</div>
												<div className="text-[var(--color-label-secondary)] dark:text-[var(--color-label-tertiary)]">
													{metric.description}
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

TestimonialsBento.displayName = 'TestimonialsBento'
