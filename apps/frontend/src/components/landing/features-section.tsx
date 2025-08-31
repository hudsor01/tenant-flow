/**
 * Features Section - Client Component with Magic UI
 * Enhanced with AnimatedGradientText and Magic UI components
 */

'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, Wrench, FileText } from 'lucide-react'
import { AnimatedGradientText, BlurFade, BorderBeam, InteractiveHoverButton, NumberTicker } from '@/components/magicui'
import { ANIMATION_DELAYS, getStaggerDelay, BORDER_BEAM_PRESETS } from '@/lib/animations/constants'

interface FeaturesSectionProps {
	locale: string
}

export function FeaturesSection({
	locale
}: FeaturesSectionProps) {
	const features = [
		{
			icon: Home,
			title: 'Property Portfolio Management',
			description:
				'Track units, occupancy rates, and monthly revenue across all properties in real-time',
			stat: '98',
			statLabel: 'Avg Occupancy',
			suffix: '%'
		},
		{
			icon: Wrench,
			title: 'Maintenance Tracking',
			description:
				'Manage maintenance requests with status updates and completion tracking',
			stat: '24',
			statLabel: 'Response Time',
			suffix: 'hr'
		},
		{
			icon: FileText,
			title: 'Lease & Tenant Management',
			description:
				'Monitor lease terms, renewal dates, and tenant information in one dashboard',
			stat: '100',
			statLabel: 'Automated',
			suffix: '%'
		}
	]

	return (
		<section className="bg-base2 px-4 py-20">
			<div className="container mx-auto">
				<div className="mb-12 text-center">
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 0}>
						<Badge className="mb-4 bg-primary/10 text-primary">
							WHY TENANTFLOW
						</Badge>
					</BlurFade>
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 1}>
						<h2 className="mb-4 text-4xl font-bold text-foreground">
							Complete <AnimatedGradientText className="text-4xl font-bold">Property Management</AnimatedGradientText> Suite
						</h2>
					</BlurFade>
					<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 2}>
						<p className="mx-auto max-w-2xl text-xl text-muted-foreground">
							Everything you need to manage properties, tenants, and maintenance
							in one powerful platform
						</p>
					</BlurFade>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{features.map((feature, index) => {
						const IconComponent = feature.icon
						return (
							<BlurFade
								key={index}
								delay={ANIMATION_DELAYS.FAST_STAGGER * (3 + index)}
							>
								<Card
									className="relative border-2 border-border bg-card p-6 transition-all duration-300 hover:border-primary hover:shadow-xl overflow-hidden"
								>
									<BorderBeam {...BORDER_BEAM_PRESETS.LARGE} />
									<div className="mb-4 flex items-start justify-between">
										<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
											<IconComponent className="h-6 w-6 text-primary" />
										</div>
										<div className="text-right">
											<div className="text-2xl font-bold text-success flex items-center">
												<NumberTicker 
													value={parseFloat(feature.stat)} 
													direction="up"
													delay={getStaggerDelay(index, 'EXTRA_SLOW_STAGGER', 1.5)}
													className="inline-block"
												/>
												{feature.suffix && <span>{feature.suffix}</span>}
											</div>
											<div className="text-xs text-muted-foreground">
												{feature.statLabel}
											</div>
										</div>
									</div>
									<h3 className="mb-2 text-xl font-semibold text-foreground">
										{feature.title}
									</h3>
									<p className="text-muted-foreground">
										{feature.description}
									</p>
								</Card>
							</BlurFade>
						)
					})}
				</div>

				<BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 6}>
					<div className="mt-12 text-center">
						<Link href={`/${locale}/demo`}>
							<InteractiveHoverButton
								className="border-2 border-primary text-primary hover:bg-primary/10 px-6 py-3"
							>
								Watch 2-Minute Demo
							</InteractiveHoverButton>
						</Link>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}