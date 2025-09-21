'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Building2, MapPin, Star, TrendingUp, Users } from 'lucide-react'
import * as React from 'react'

const statsData = [
	{
		id: 'properties',
		label: 'Properties Managed',
		value: 50000,
		suffix: '+',
		icon: Building2,
		description: 'Active properties across our platform',
		change: '+12% this quarter',
		changeType: 'positive' as const,
		color: 'text-[var(--color-system-blue)] dark:text-[var(--color-system-blue-85)]'
	},
	{
		id: 'collection-rate',
		label: 'Rent Collection Rate',
		value: 98.5,
		suffix: '%',
		icon: TrendingUp,
		description: 'Average collection success rate',
		change: '+2.3% vs last year',
		changeType: 'positive' as const,
		color: 'text-green-600 dark:text-green-400'
	},
	{
		id: 'users',
		label: 'Happy Property Managers',
		value: 25000,
		suffix: '+',
		icon: Users,
		description: 'Active users managing properties',
		change: '+45% growth',
		changeType: 'positive' as const,
		color: 'text-purple-600 dark:text-purple-400'
	},
	{
		id: 'satisfaction',
		label: 'Customer Satisfaction',
		value: 4.9,
		suffix: '/5',
		decimalPlaces: 1,
		icon: Star,
		description: 'Average rating from our users',
		change: '+0.2 improvement',
		changeType: 'positive' as const,
		color: 'text-amber-600 dark:text-amber-400'
	}
]

const features = [
	{
		icon: MapPin,
		title: 'Global Reach',
		description: 'Properties managed across 50+ cities worldwide'
	},
	{
		icon: Building2,
		title: 'Portfolio Scale',
		description: 'From single properties to enterprise portfolios'
	},
	{
		icon: TrendingUp,
		title: 'Proven Growth',
		description: 'Consistent 40%+ YoY growth in user satisfaction'
	}
]

interface StatsProps extends React.ComponentProps<'section'> {
	showFeatures?: boolean
	variant?: 'default' | 'minimal' | 'featured'
}

export const Stats = React.forwardRef<HTMLElement, StatsProps>(
	(
		{ showFeatures = true, className, ...props },
		ref
	) => {
		return (
			<section
				ref={ref}
				className={cn(
					'relative overflow-hidden py-24 bg-gradient-to-b from-[var(--color-fill-quaternary)]/50 via-white to-[var(--color-fill-quaternary)]/30 dark:from-[var(--color-fill-primary)]/20 dark:via-background dark:to-[var(--color-fill-primary)]/10',
					className
				)}
				{...props}
			>
				{/* Background Pattern */}
				<div className="absolute inset-0 bg-grid-small-gray/[0.02] dark:bg-grid-small-gray/[0.05]" />

				<div className="relative container mx-auto px-6 max-w-7xl">
					{/* Header */}
					<BlurFade delay={0.1}>
						<div className="text-center mb-16 max-w-4xl mx-auto">
							<Badge
								variant="secondary"
								className="mb-6 text-sm font-medium bg-[var(--color-fill-tertiary)] text-[var(--color-label-secondary)] dark:bg-[var(--color-fill-tertiary)] dark:text-[var(--color-label-secondary)] border-[var(--color-fill-secondary)] dark:border-[var(--color-fill-secondary)]"
							>
								<TrendingUp className="mr-2 size-4" />
								Trusted by Property Managers Nationwide
							</Badge>

							<h2 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[var(--color-label-primary)] via-[var(--color-label-secondary)] to-[var(--color-label-tertiary)] dark:from-[var(--color-label-primary)] dark:via-[var(--color-label-secondary)] dark:to-[var(--color-label-tertiary)] bg-clip-text text-transparent tracking-tight">
								The Numbers Speak for Themselves
							</h2>

							<p className="text-xl text-[var(--color-label-secondary)] dark:text-[var(--color-label-secondary)] leading-relaxed max-w-3xl mx-auto">
								TenantFlow is more than just software.{' '}
								<span className="font-semibold text-[var(--color-label-primary)] dark:text-[var(--color-label-primary)]">
									It's a complete property management ecosystem
								</span>{' '}
								— from tenant screening to rent collection.
							</p>
						</div>
					</BlurFade>

					{/* Stats Grid */}
					<BlurFade delay={0.3}>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
							{statsData.map((stat, index) => {
								const Icon = stat.icon
								return (
									<Card
										key={stat.id}
										className={cn(
											'group relative overflow-hidden border-[var(--color-fill-secondary)]/50 dark:border-[var(--color-fill-secondary)]/30',
											'bg-gradient-to-br from-white/80 via-[var(--color-fill-quaternary)]/50 to-white/60',
											'dark:from-[var(--color-fill-primary)]/40 dark:via-[var(--color-fill-secondary)]/20 dark:to-[var(--color-fill-primary)]/60',
											'backdrop-blur-sm shadow-lg shadow-[var(--color-label-tertiary)]/10',
											'hover:shadow-xl hover:shadow-[var(--color-label-tertiary)]/20 transition-all duration-500',
											'hover:scale-105'
										)}
									>
										<CardContent className="p-6">
											{/* Icon and Change Indicator */}
											<div className="flex items-start justify-between mb-4">
												<div
													className={cn(
														'p-3 rounded-full bg-[var(--color-fill-tertiary)] dark:bg-[var(--color-fill-tertiary)]/50',
														stat.color
													)}
												>
													<Icon className="size-5" />
												</div>
												<Badge
													variant="outline"
													className={cn(
														'text-xs',
														stat.changeType === 'positive'
															? 'border-[var(--color-system-green-25)] text-[var(--color-system-green)] bg-[var(--color-system-green-10)] dark:border-[var(--color-system-green-25)] dark:text-[var(--color-system-green-85)] dark:bg-[var(--color-system-green-15)]'
															: 'border-[var(--color-system-red-25)] text-[var(--color-system-red)] bg-[var(--color-system-red-10)] dark:border-[var(--color-system-red-25)] dark:text-[var(--color-system-red-85)] dark:bg-[var(--color-system-red-15)]'
													)}
												>
													{stat.change}
												</Badge>
											</div>

											{/* Main Number */}
											<div className="mb-2">
												<NumberTicker
													value={stat.value}
													decimalPlaces={stat.decimalPlaces || 0}
													suffix={stat.suffix}
													className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100"
													size="sf-display-md-bold"
													variant="default"
													animationDuration={2000}
													delay={index * 0.2}
												/>
											</div>

											{/* Label and Description */}
											<div>
												<div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
													{stat.label}
												</div>
												<div className="text-sm text-[var(--color-label-secondary)] dark:text-[var(--color-label-tertiary)]">
													{stat.description}
												</div>
											</div>
										</CardContent>
									</Card>
								)
							})}
						</div>
					</BlurFade>

					{/* Features Section */}
					{showFeatures && (
						<BlurFade delay={0.6}>
							<div className="border-t border-[var(--color-fill-secondary)]/50 dark:border-[var(--color-fill-secondary)]/30 pt-16">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
									{features.map((feature, index) => {
										const Icon = feature.icon
										return (
											<div key={index} className="text-center group">
												<div className="flex items-center justify-center mb-4">
													<div className="p-4 rounded-full bg-[var(--color-fill-tertiary)] dark:bg-[var(--color-fill-tertiary)]/30 group-hover:bg-[var(--color-fill-secondary)] dark:group-hover:bg-[var(--color-fill-secondary)]/50 transition-colors">
														<Icon className="size-6 text-[var(--color-label-secondary)] dark:text-[var(--color-label-tertiary)]" />
													</div>
												</div>
												<div className="text-lg font-semibold text-[var(--color-label-primary)] dark:text-[var(--color-label-primary)] mb-2">
													{feature.title}
												</div>
												<div className="text-[var(--color-label-secondary)] dark:text-[var(--color-label-tertiary)]">
													{feature.description}
												</div>
											</div>
										)
									})}
								</div>

								{/* Testimonial Quote */}
								<div className="mt-16 max-w-4xl mx-auto">
									<Card className="border-[var(--color-fill-secondary)]/50 dark:border-[var(--color-fill-secondary)]/30 bg-gradient-to-br from-white/80 to-[var(--color-fill-quaternary)]/60 dark:from-[var(--color-fill-primary)]/40 dark:to-[var(--color-fill-secondary)]/60 backdrop-blur-sm">
										<CardContent className="p-8">
											<blockquote className="text-center">
												<div className="text-xl md:text-2xl text-[var(--color-label-secondary)] dark:text-[var(--color-label-secondary)] mb-6 leading-relaxed">
													"TenantFlow has completely transformed how I manage my
													50+ units. The automated rent collection alone saves
													me over{' '}
													<NumberTicker
														value={15}
														className="font-semibold text-[var(--color-system-blue)] dark:text-[var(--color-system-blue-85)]"
														variant="primary"
														animationDuration={1500}
														delay={1}
													/>{' '}
													hours every week, and the tenant portal has virtually
													eliminated maintenance request calls."
												</div>
												<footer className="flex items-center justify-center gap-4">
													<div className="text-center">
														<cite className="font-semibold text-[var(--color-label-primary)] dark:text-[var(--color-label-primary)] not-italic">
															Sarah Chen
														</cite>
														<div className="text-sm text-[var(--color-label-secondary)] dark:text-[var(--color-label-tertiary)]">
															Property Manager, Mountain View Properties
														</div>
													</div>
												</footer>
											</blockquote>
										</CardContent>
									</Card>
								</div>
							</div>
						</BlurFade>
					)}
				</div>
			</section>
		)
	}
)

Stats.displayName = 'Stats'
