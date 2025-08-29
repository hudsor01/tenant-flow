/**
 * Pricing Section - Server Component
 * Using semantic tokens and gradients for consistency
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
		<section className="bg-gradient-to-b from-background to-base2 py-16 sm:py-20">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-sm font-semibold text-primary">
						Pricing
					</h2>
					<p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Simple, transparent pricing
					</p>
					<p className="mt-4 text-base text-muted-foreground">
						Choose the plan that fits your portfolio size. Start
						free, upgrade as you grow.
					</p>
				</div>

				<div className="mx-auto mt-12 grid max-w-lg grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-3">
					{pricingPlans.map((plan, index) => (
						<div
							key={index}
							className={cn(
								'rounded-2xl p-6 transition-all duration-300',
								plan.popular
									? 'bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg ring-2 ring-primary'
									: 'bg-card ring-1 ring-border hover:ring-2 hover:ring-primary/50'
							)}
						>
							<div className="flex items-center justify-between">
								<h3 className="text-base font-semibold text-foreground">
									{plan.name}
								</h3>
								{plan.popular && (
									<span className="rounded-full bg-gradient-to-r from-primary to-accent px-2 py-0.5 text-xs font-medium text-white">
										Popular
									</span>
								)}
							</div>
							<p className="mt-2 text-sm text-muted-foreground">
								{plan.units}
							</p>
							<p className="mt-4 flex items-baseline gap-x-1">
								<span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
									{plan.price}
								</span>
								{plan.price !== 'Custom' && (
									<span className="text-sm text-muted-foreground">
										/month
									</span>
								)}
							</p>

							<Link href="/auth/signup?source=pricing">
								<Button
									size="sm"
									className={cn(
										'mt-4 w-full transition-all',
										plan.popular
											? 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90'
											: 'bg-card text-primary ring-1 ring-border hover:bg-primary/10'
									)}
									variant={
										plan.popular ? 'default' : 'outline'
									}
								>
									Get started
								</Button>
							</Link>

							<ul className="mt-6 space-y-2 text-sm text-muted-foreground">
								{plan.features.map((feature, idx) => (
									<li key={idx} className="flex gap-x-2">
										<i className="i-lucide-check-circle mt-0.5 h-4 w-4 flex-none text-success" />
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
						className="text-sm font-medium text-primary hover:text-accent transition-colors"
					>
						View detailed pricing and features →
					</Link>
				</div>
			</div>
		</section>
	)
}