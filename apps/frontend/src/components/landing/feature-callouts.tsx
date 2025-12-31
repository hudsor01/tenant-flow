'use client'

import { BarChart3, Zap, Shield } from 'lucide-react'
import { FeaturePill } from './feature-pill'

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
						<FeaturePill
							key={callout.title}
							icon={callout.icon}
							title={callout.title}
							description={callout.description}
						/>
					))}
				</div>
			</div>
		</section>
	)
}
