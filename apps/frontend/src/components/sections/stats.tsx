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
		color: 'text-blue-600 dark:text-blue-400'
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
		{ showFeatures = true, variant: _variant = 'default', className, ...props },
		ref
	) => {
		return (
			<section
				ref={ref}
				className={cn(
					'relative overflow-hidden py-24 bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30 dark:from-gray-950/20 dark:via-background dark:to-gray-950/10',
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
								className="mb-6 text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800"
							>
								<TrendingUp className="mr-2 size-4" />
								Trusted by Property Managers Nationwide
							</Badge>

							<h2 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-600 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
								The Numbers Speak for Themselves
							</h2>

							<p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
								TenantFlow is more than just software.{' '}
								<span className="font-semibold text-gray-900 dark:text-gray-100">
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
											'group relative overflow-hidden border-gray-200/50 dark:border-gray-800/30',
											'bg-gradient-to-br from-white/80 via-gray-50/50 to-white/60',
											'dark:from-gray-950/40 dark:via-gray-900/20 dark:to-gray-950/60',
											'backdrop-blur-sm shadow-lg shadow-gray-500/10',
											'hover:shadow-xl hover:shadow-gray-500/20 transition-all duration-500',
											'hover:scale-105'
										)}
									>
										<CardContent className="p-6">
											{/* Icon and Change Indicator */}
											<div className="flex items-start justify-between mb-4">
												<div
													className={cn(
														'p-3 rounded-full bg-gray-100 dark:bg-gray-800/50',
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
															? 'border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/30'
															: 'border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30'
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
													size="heading-lg"
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
												<div className="text-sm text-gray-600 dark:text-gray-400">
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
							<div className="border-t border-gray-200/50 dark:border-gray-800/30 pt-16">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
									{features.map((feature, index) => {
										const Icon = feature.icon
										return (
											<div key={index} className="text-center group">
												<div className="flex items-center justify-center mb-4">
													<div className="p-4 rounded-full bg-gray-100 dark:bg-gray-900/30 group-hover:bg-gray-200 dark:group-hover:bg-gray-900/50 transition-colors">
														<Icon className="size-6 text-gray-600 dark:text-gray-400" />
													</div>
												</div>
												<div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
													{feature.title}
												</div>
												<div className="text-gray-600 dark:text-gray-400">
													{feature.description}
												</div>
											</div>
										)
									})}
								</div>

								{/* Testimonial Quote */}
								<div className="mt-16 max-w-4xl mx-auto">
									<Card className="border-gray-200/50 dark:border-gray-800/30 bg-gradient-to-br from-white/80 to-gray-50/60 dark:from-gray-950/40 dark:to-gray-900/60 backdrop-blur-sm">
										<CardContent className="p-8">
											<blockquote className="text-center">
												<div className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
													"TenantFlow has completely transformed how I manage my
													50+ units. The automated rent collection alone saves
													me over{' '}
													<NumberTicker
														value={15}
														className="font-semibold text-blue-600 dark:text-blue-400"
														variant="primary"
														animationDuration={1500}
														delay={1}
													/>{' '}
													hours every week, and the tenant portal has virtually
													eliminated maintenance request calls."
												</div>
												<footer className="flex items-center justify-center gap-4">
													<div className="text-center">
														<cite className="font-semibold text-gray-900 dark:text-gray-100 not-italic">
															Sarah Chen
														</cite>
														<div className="text-sm text-gray-600 dark:text-gray-400">
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
