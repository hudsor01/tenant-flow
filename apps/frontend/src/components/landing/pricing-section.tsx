import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const pricingPlans = [
	{
		name: 'Starter',
		price: '$29',
		units: 'Up to 10 units',
		features: [
			'Tenant Portal',
			'Online Payments',
			'Basic Reports',
			'Email Support'
		],
		popular: false
	},
	{
		name: 'Professional',
		price: '$79',
		units: 'Up to 50 units',
		features: [
			'Everything in Starter',
			'Advanced Analytics',
			'Maintenance Management',
			'Priority Support',
			'Custom Branding'
		],
		popular: true
	},
	{
		name: 'Enterprise',
		price: 'Custom',
		units: 'Unlimited units',
		features: [
			'Everything in Pro',
			'API Access',
			'Dedicated Account Manager',
			'Custom Integrations',
			'SLA Guarantee'
		],
		popular: false
	}
]

export function PricingSection() {
	return (
		<section className="bg-gray-50 px-4 py-20">
			<div className="container mx-auto">
				<div className="mb-12 text-center">
					<h2 className="mb-4 text-4xl font-bold">
						Simple, Transparent Pricing
					</h2>
					<p className="text-xl text-gray-600">
						Choose the plan that fits your portfolio size
					</p>
				</div>

				<div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
					{pricingPlans.map((plan, index) => (
						<Card
							key={index}
							className={cn(
								'relative p-6 transition-all duration-300 hover:shadow-2xl',
								plan.popular &&
									'border-primary scale-105 border-2'
							)}
						>
							{plan.popular && (
								<Badge className="bg-primary absolute -top-3 left-1/2 -translate-x-1/2 transform text-white">
									Most Popular
								</Badge>
							)}

							<div className="mb-6 text-center">
								<h3 className="mb-2 text-2xl font-bold">
									{plan.name}
								</h3>
								<div className="mb-1 text-4xl font-bold">
									{plan.price}
									{plan.price !== 'Custom' && (
										<span className="text-lg text-gray-500">
											/mo
										</span>
									)}
								</div>
								<p className="text-gray-600">{plan.units}</p>
							</div>

							<ul className="mb-6 space-y-3">
								{plan.features.map((feature, idx) => (
									<li key={idx} className="flex items-center">
										<CheckCircle className="mr-2 h-5 w-5 flex-shrink-0 text-green-500" />
										<span className="text-gray-600">
											{feature}
										</span>
									</li>
								))}
							</ul>

							<Link href="/signup">
								<Button
									className={cn(
										'w-full',
										plan.popular
											? 'bg-primary hover:bg-blue-700'
											: ''
									)}
									variant={
										plan.popular ? 'default' : 'outline'
									}
								>
									Get Started
								</Button>
							</Link>
						</Card>
					))}
				</div>

				<div className="mt-8 text-center">
					<Link
						href="/pricing"
						className="text-primary hover:underline"
					>
						View detailed pricing and features →
					</Link>
				</div>
			</div>
		</section>
	)
}
