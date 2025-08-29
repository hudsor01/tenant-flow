/**
 * Features Section - Server Component
 * Using semantic tokens and gradients for consistency
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FeaturesSectionProps {
	locale: string
}

export function FeaturesSection({
	locale
}: FeaturesSectionProps) {
	const features = [
		{
			icon: 'i-lucide-home',
			title: 'Property Portfolio Management',
			description:
				'Track units, occupancy rates, and monthly revenue across all properties in real-time',
			stat: '98%',
			statLabel: 'Avg Occupancy'
		},
		{
			icon: 'i-lucide-wrench',
			title: 'Maintenance Tracking',
			description:
				'Manage maintenance requests with status updates and completion tracking',
			stat: '24hr',
			statLabel: 'Response Time'
		},
		{
			icon: 'i-lucide-file-text',
			title: 'Lease & Tenant Management',
			description:
				'Monitor lease terms, renewal dates, and tenant information in one dashboard',
			stat: '100%',
			statLabel: 'Automated'
		}
	]

	return (
		<section className="bg-base2 px-4 py-20">
			<div className="container mx-auto">
				<div className="mb-12 text-center">
					<Badge className="mb-4 bg-primary/10 text-primary">
						WHY TENANTFLOW
					</Badge>
					<h2 className="mb-4 text-4xl font-bold text-foreground">
						Complete Property Management Suite
					</h2>
					<p className="mx-auto max-w-2xl text-xl text-muted-foreground">
						Everything you need to manage properties, tenants, and maintenance
						in one powerful platform
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{features.map((feature, index) => (
						<Card
							key={index}
							className="border-2 border-border bg-card p-6 transition-all duration-300 hover:border-primary hover:shadow-xl"
						>
							<div className="mb-4 flex items-start justify-between">
								<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
									<i className={`${feature.icon} h-6 w-6 text-primary`} />
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-success">
										{feature.stat}
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
					))}
				</div>

				<div className="mt-12 text-center">
					<Link href={`/${locale}/demo`}>
						<Button
							variant="outline"
							className="border-2 border-primary text-primary hover:bg-primary/10"
						>
							<i className="i-lucide-play mr-2 h-4 w-4" />
							Watch 2-Minute Demo
						</Button>
					</Link>
				</div>
			</div>
		</section>
	)
}