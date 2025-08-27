
/**
 * Optimized Features Section - Server Component
 * Static feature showcase with stats and descriptions
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface OptimizedFeaturesSectionProps {
	locale: string
}

export function OptimizedFeaturesSection({
	locale
}: OptimizedFeaturesSectionProps) {
	const features = [
		{
			icon: 'i-lucide-clock',
			title: 'Save 10+ Hours Weekly',
			description:
				'Automate rent collection, maintenance requests, and tenant communications',
			stat: '87%',
			statLabel: 'Time Saved'
		},
		{
			icon: 'i-lucide-trending-up',
			title: 'Increase Revenue 23%',
			description:
				'Reduce vacancy rates and collect rent faster with automated reminders',
			stat: '99%',
			statLabel: 'Collection Rate'
		},
		{
			icon: 'i-lucide-users',
			title: 'Delight Your Tenants',
			description:
				'24/7 self-service portal for payments and maintenance requests',
			stat: '4.9★',
			statLabel: 'Tenant Rating'
		}
	]

	return (
		<section className="bg-gray-50 px-4 py-20">
			<div className="container mx-auto">
				<div className="mb-12 text-center">
					<Badge className="mb-4 bg-blue-100 text-blue-700">
						WHY TENANTFLOW
					</Badge>
					<h2 className="mb-4 text-4xl font-bold text-gray-900">
						Stop Losing Time & Money on Manual Tasks
					</h2>
					<p className="mx-auto max-w-2xl text-xl text-gray-600">
						Every hour you spend on paperwork is an hour not growing
						your portfolio
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{features.map((feature, index) => (
						<Card
							key={index}
							className="border-2 p-6 transition-all duration-300 hover:border-blue-100 hover:shadow-xl"
						>
							<div className="mb-4 flex items-start justify-between">
								<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
									<feature.icon className="text-primary h-6 w-6" />
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-green-600">
										{feature.stat}
									</div>
									<div className="text-xs text-gray-500">
										{feature.statLabel}
									</div>
								</div>
							</div>
							<h3 className="mb-2 text-xl font-semibold">
								{feature.title}
							</h3>
							<p className="text-gray-600">
								{feature.description}
							</p>
						</Card>
					))}
				</div>

				<div className="mt-12 text-center">
					<Link href={`/${locale}/demo`}>
						<Button
							variant="outline"
							className="border-primary text-primary border-2 hover:bg-blue-50"
						>
							<i className="i-lucide-play inline-block mr-2 h-4 w-4"  />
							Watch 2-Minute Demo
						</Button>
					</Link>
				</div>
			</div>
		</section>
	)
}
