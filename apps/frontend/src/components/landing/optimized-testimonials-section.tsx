/**
 * Optimized Testimonials Section - Server Component
 * Static customer testimonials with ratings and metrics
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'

export function OptimizedTestimonialsSection() {
	const testimonials = [
		{
			name: 'Sarah Mitchell',
			role: 'Property Manager',
			company: 'Mitchell Properties (47 units)',
			content:
				'TenantFlow saved me 15 hours per week. The automated rent collection alone paid for itself in the first month.',
			rating: 5,
			metric: '15 hrs/week saved',
			image: '👩‍💼'
		},
		{
			name: 'David Chen',
			role: 'Real Estate Investor',
			company: 'Chen Investments (120 units)',
			content:
				'Our vacancy rate dropped from 8% to 2% after implementing TenantFlow. The ROI is incredible.',
			rating: 5,
			metric: '75% vacancy reduction',
			image: '👨‍💼'
		},
		{
			name: 'Maria Rodriguez',
			role: 'Independent Landlord',
			company: 'Self-Managed (8 units)',
			content:
				'Finally, professional tools at a price I can afford. My tenants love the online portal.',
			rating: 5,
			metric: '100% tenant adoption',
			image: '👩‍💼'
		}
	]

	return (
		<section className="bg-white px-4 py-20">
			<div className="container mx-auto">
				<div className="mb-12 text-center">
					<Badge className="mb-4 bg-yellow-100 text-yellow-700">
						CUSTOMER SUCCESS
					</Badge>
					<h2 className="mb-4 text-4xl font-bold text-gray-900">
						Real Results from Real Property Managers
					</h2>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{testimonials.map((testimonial, index) => (
						<Card
							key={index}
							className="p-6 transition-all hover:shadow-xl"
						>
							<div className="mb-4 flex items-start justify-between">
								<div className="flex items-center gap-1">
									{[...Array(5)].map((_, i) => (
										<Star
											key={i}
											className="h-4 w-4 fill-yellow-400 text-yellow-400"
										/>
									))}
								</div>
								<Badge className="bg-green-100 text-xs text-green-700">
									{testimonial.metric}
								</Badge>
							</div>

							<p className="mb-4 italic text-gray-600">
								"{testimonial.content}"
							</p>

							<div className="flex items-center gap-3">
								<div className="text-3xl">
									{testimonial.image}
								</div>
								<div>
									<p className="font-semibold text-gray-900">
										{testimonial.name}
									</p>
									<p className="text-sm text-gray-500">
										{testimonial.role}
									</p>
									<p className="text-xs text-gray-400">
										{testimonial.company}
									</p>
								</div>
							</div>
						</Card>
					))}
				</div>

				<div className="mt-8 text-center">
					<p className="text-gray-600">
						Join{' '}
						<span className="font-bold text-gray-900">10,000+</span>{' '}
						property managers with a combined{' '}
						<span className="font-bold text-gray-900">
							500,000+
						</span>{' '}
						units under management
					</p>
				</div>
			</div>
		</section>
	)
}
