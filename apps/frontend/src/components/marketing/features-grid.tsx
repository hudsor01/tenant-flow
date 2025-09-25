'use client'

import { BlurFade } from '@/components/magicui/blur-fade'
import { cn, containerClasses } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { CloudUpload, Fingerprint, Lock, RotateCcw } from 'lucide-react'

const features = [
	{
		name: 'Automated Workflows',
		description:
			'Intelligent automation handles rent collection, lease renewals, and tenant communications, saving 25+ hours per week.',
		icon: CloudUpload
	},
	{
		name: 'Enterprise Security',
		description:
			'SOC 2 Type II certified platform with 256-bit encryption, role-based access control, and regular security audits.',
		icon: Lock
	},
	{
		name: 'Smart Screening',
		description:
			'AI-powered tenant screening reduces vacancy time by 65% while ensuring quality tenants for your properties.',
		icon: RotateCcw
	},
	{
		name: 'Advanced Analytics',
		description:
			'Real-time insights and predictive analytics help optimize rental pricing and identify profitable opportunities.',
		icon: Fingerprint
	}
]

interface FeaturesGridProps {
	className?: string
}

export function FeaturesGrid({ className }: FeaturesGridProps) {
	return (
		<div className={cn('bg-background py-24 sm:py-32', className)}>
			<div className={containerClasses('xl')}>
				<BlurFade delay={0.1} inView>
					<div className="mx-auto max-w-2xl lg:text-center">
						<h2 className="text-base/7 font-semibold text-primary">
							Scale faster
						</h2>
						<p
							className="mt-2 text-foreground font-bold tracking-tight"
							style={TYPOGRAPHY_SCALE['display-lg']}
						>
							Everything you need to maximize your portfolio
						</p>
						<p
							className="mt-6 text-muted-foreground leading-relaxed"
							style={TYPOGRAPHY_SCALE['body-lg']}
						>
							From tenant screening to rent collection, TenantFlow automates
							every aspect of property management so you can focus on growing
							your portfolio and maximizing NOI.
						</p>
					</div>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
						<dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
							{features.map(feature => (
								<div key={feature.name} className="relative pl-16 group">
									<dt className="text-base/7 font-semibold text-foreground">
										<div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground group-hover:scale-110 transition-transform duration-300">
											<feature.icon aria-hidden="true" className="h-6 w-6" />
										</div>
										{feature.name}
									</dt>
									<dd className="mt-2 text-base/7 text-muted-foreground">
										{feature.description}
									</dd>
								</div>
							))}
						</dl>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
