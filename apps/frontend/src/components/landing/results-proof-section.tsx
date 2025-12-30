'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { LazySection } from '#components/ui/lazy-section'
import { SectionSkeleton } from '#components/ui/section-skeleton'
import { TrendingUp, Clock, Users, BarChart3 } from 'lucide-react'

const stats = [
	{
		icon: TrendingUp,
		value: '40%',
		label: 'Average NOI increase'
	},
	{
		icon: Clock,
		value: '25+',
		label: 'Hours saved weekly'
	},
	{
		icon: Users,
		value: '10K+',
		label: 'Happy customers'
	},
	{
		icon: BarChart3,
		value: '90',
		label: 'Days to ROI'
	}
]

export function ResultsProofSection() {
	return (
		<LazySection
			fallback={<SectionSkeleton height={500} variant="grid" />}
			minHeight={500}
		>
			<section className="section-spacing bg-muted/30">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.4} inView>
						<div className="text-center mb-16">
							<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
								Real results from real property managers
							</h2>
							<p className="text-muted-foreground text-lg max-w-3xl mx-auto">
								Our customers consistently achieve these results within 90 days
								of implementation
							</p>
						</div>

						<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
							{stats.map(stat => (
								<div key={stat.label} className="text-center group">
									<div className="icon-container-lg bg-primary/10 text-primary mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
										<stat.icon className="size-8" />
									</div>
									<div className="typography-h1 text-foreground mb-2">
										{stat.value}
									</div>
									<div className="text-muted-foreground">{stat.label}</div>
								</div>
							))}
						</div>
					</BlurFade>
				</div>
			</section>
		</LazySection>
	)
}
