'use client'

import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { createCheckoutSession } from '@/lib/stripe-client'
import { useMutation } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const plans = [
	{
		id: 'starter',
		name: 'Starter',
		price: 29,
		interval: 'month',
		features: [
			'Up to 5 properties',
			'Up to 25 units',
			'Basic tenant management',
			'Email support'
		],
		stripePriceId: 'price_starter_monthly' // TODO: Replace with actual Stripe price ID
	},
	{
		id: 'growth',
		name: 'Growth',
		price: 79,
		interval: 'month',
		features: [
			'Up to 50 properties',
			'Up to 250 units',
			'Advanced analytics',
			'Maintenance tracking',
			'Priority support',
			'Custom reports'
		],
		stripePriceId: 'price_professional_monthly'
	},
	{
		id: 'tenantflow_max',
		name: 'TenantFlow Max',
		price: 199,
		interval: 'month',
		features: [
			'Unlimited properties',
			'Unlimited units',
			'White-label options',
			'API access',
			'Dedicated support',
			'Custom integrations'
		],
		stripePriceId: 'price_enterprise_monthly'
	}
]

export function SubscriptionPlans() {
	const router = useRouter()
	const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

	const createCheckoutMutation = useMutation({
		mutationFn: async ({
			priceId,
			planName
		}: {
			priceId: string
			planName: string
		}) => {
			return await createCheckoutSession({
				priceId,
				planName,
				description: `${planName} subscription plan`
			})
		},
		onSuccess: data => {
			if (data?.url) {
				router.push(data.url)
			}
		},
		onError: error => {
			toast.error(`Payment failed: ${error.message}`)
			setLoadingPlan(null)
		}
	})

	const handleSubscribe = (planId: string, priceId: string) => {
		const plan = plans.find(p => p.id === planId)
		setLoadingPlan(planId)
		createCheckoutMutation.mutate({
			priceId,
			planName: plan?.name || planId
		})
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{plans.map(plan => (
				<CardLayout
					key={plan.id}
					title={plan.name}
					description={`$${plan.price}/${plan.interval}`}
					className={`relative ${plan.id === 'professional' ? 'border-primary' : ''}`}
				>
					{plan.id === 'professional' && (
						<div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
							<span className="bg-primary text-primary-foreground px-3 py-1 text-sm rounded-full">
								Most Popular
							</span>
						</div>
					)}

					<div className="mt-4 text-center">
						<span className="text-4xl font-bold">${plan.price}</span>
						<span className="text-muted-foreground">/{plan.interval}</span>
					</div>

					<ul className="space-y-3 pt-6">
						{plan.features.map((feature, index) => (
							<li key={index} className="flex items-center gap-3">
								<Check className="w-5 h-5 text-[var(--color-system-green)]" />
								<span className="text-sm">{feature}</span>
							</li>
						))}
					</ul>

					<Button
						className="w-full mt-6"
						size="lg"
						onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
						disabled={loadingPlan === plan.id}
					>
						{loadingPlan === plan.id ? 'Loading...' : 'Get Started'}
					</Button>
				</CardLayout>
			))}
		</div>
	)
}
