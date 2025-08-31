/**
 * Stats Section - Client Component with Magic UI
 * Animated statistics with NumberTicker and BlurFade
 */

'use client'

import { Home, DollarSign, Wrench, Shield } from 'lucide-react'
import { NumberTicker, BlurFade, BorderBeam } from '@/components/magicui'
import { ANIMATION_DELAYS } from '@/lib/animations/constants'

const benefits = [
	{ value: 98, suffix: '%', label: 'Avg Occupancy Rate', icon: Home },
	{ value: 2.5, suffix: 'M', prefix: '$', label: 'Monthly Revenue Tracked', icon: DollarSign },
	{ value: 24, suffix: 'hr', label: 'Maintenance Response', icon: Wrench },
	{ value: 99.9, suffix: '%', label: 'Platform Uptime', icon: Shield }
]

export function StatsSection() {
	return (
		<section className="bg-gradient-to-r from-primary to-accent py-16 text-white">
			<div className="container mx-auto px-6 lg:px-8">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
					{benefits.map((benefit, index) => {
						const IconComponent = benefit.icon
						return (
							<BlurFade
								key={index}
								delay={ANIMATION_DELAYS.FAST_STAGGER * index}
							>
								<div className="text-center">
									<IconComponent className="mx-auto mb-3 h-8 w-8 text-white/80" />
									<div className="text-3xl font-bold mb-2">
										{benefit.prefix && (
											<span>{benefit.prefix}</span>
										)}
										<NumberTicker
											value={benefit.value}
											className="inline"
										/>
										{benefit.suffix && (
											<span>{benefit.suffix}</span>
										)}
									</div>
									<div className="text-sm text-white/90">
										{benefit.label}
									</div>
								</div>
							</BlurFade>
						)
					})}
				</div>
			</div>
		</section>
	)
}
