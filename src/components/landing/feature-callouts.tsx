'use client'

import { BarChart3, Zap, Shield } from 'lucide-react'

const callouts = [
	{
		icon: <BarChart3 className="size-5" />,
		title: 'Reduce Vacancy by 65%',
		description: 'Smart screening + marketing fill units faster'
	},
	{
		icon: <Zap className="size-5" />,
		title: 'Automate 80% of Tasks',
		description: 'Rent, renewals, and comms on autopilot'
	},
	{
		icon: <Shield className="size-5" />,
		title: 'Enterprise Security',
		description: 'SOC 2, RBAC, and audit logging'
	}
]

export function FeatureCallouts() {
	return (
		<section className="section-spacing-compact">
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<div className="grid gap-3 md:grid-cols-3">
					{callouts.map(callout => (
						<div
							key={callout.title}
							className="flex items-center gap-3 card-standard px-4 py-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
						>
							<div className="icon-container-md icon-container-primary">
								{callout.icon}
							</div>
							<div>
								<div className="font-semibold text-foreground text-sm">
									{callout.title}
								</div>
								<div className="text-muted-foreground text-xs">
									{callout.description}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
