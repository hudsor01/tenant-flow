import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
		<section className="bg-gray-50 py-16 sm:py-20">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-sm font-semibold text-blue-600">Pricing</h2>
					<p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Simple, transparent pricing
					</p>
					<p className="mt-4 text-base text-gray-600">
						Choose the plan that fits your portfolio size. Start free, upgrade as you grow.
					</p>
				</div>

				<div className="mx-auto mt-12 grid max-w-lg grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-3">
					{pricingPlans.map((plan, index) => (
						<div
							key={index}
							className={cn(
								'rounded-2xl p-6',
								plan.popular
									? 'ring-2 ring-blue-600 bg-white shadow-lg'
									: 'ring-1 ring-gray-200 bg-white'
							)}
						>
							<div className="flex items-center justify-between">
								<h3 className="text-base font-semibold text-gray-900">
									{plan.name}
								</h3>
								{plan.popular && (
									<span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
										Popular
									</span>
								)}
							</div>
							<p className="mt-2 text-sm text-gray-600">
								{plan.units}
							</p>
							<p className="mt-4 flex items-baseline gap-x-1">
								<span className="text-3xl font-bold text-gray-900">
									{plan.price}
								</span>
								{plan.price !== 'Custom' && (
									<span className="text-sm text-gray-600">
										/month
									</span>
								)}
							</p>

							<Link href="/signup">
								<Button
									size="sm"
									className={cn(
										'mt-4 w-full',
										plan.popular
											? 'bg-blue-600 text-white hover:bg-blue-700'
											: 'bg-white text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50'
									)}
									variant={plan.popular ? 'default' : 'outline'}
								>
									Get started
								</Button>
							</Link>

							<ul className="mt-6 space-y-2 text-sm text-gray-600">
								{plan.features.map((feature, idx) => (
									<li key={idx} className="flex gap-x-2">
										<CheckCircle className="h-4 w-4 flex-none text-blue-600 mt-0.5" />
										{feature}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="mt-12 text-center">
					<Link
						href="/pricing"
						className="text-sm font-medium text-blue-600 hover:text-blue-500"
					>
						View detailed pricing and features →
					</Link>
				</div>
			</div>
		</section>
	)
}
