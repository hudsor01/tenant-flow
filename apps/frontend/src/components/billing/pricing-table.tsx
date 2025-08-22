import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { PLAN_TYPE } from '@repo/shared'
import type { PlanType } from '@repo/shared'
import { useCreateCheckout } from '@/hooks/useSubscriptionActions'

interface Plan {
	id: PlanType
	name: string
	description: string
	price: { monthly: number; annual: number }
	features: string[]
	propertyLimit: number
	storageLimit: number
	apiCallLimit: number
	priority: boolean
}

interface PricingTableProps {
	currentPlan?: string
}

export function PricingTable({ currentPlan }: PricingTableProps) {
	const router = useRouter()
	const { user } = useAuth()
	const [billingInterval, setBillingInterval] = useState<
		'monthly' | 'annual'
	>('monthly')
	const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

	// Plan data will be loaded from Stripe pricing API
	const plans: Plan[] = []

	const { mutate: createCheckout } = useCreateCheckout()

	const handleSelectPlan = async (planId: string) => {
		if (!user) {
			void router.push('/auth/signup')
			return
		}

		setLoadingPlan(planId)

		createCheckout({
			planType: planId,
			billingPeriod: billingInterval === 'annual' ? 'annual' : 'monthly'
		}, {
			onSettled: () => {
				setLoadingPlan(null)
			}
		})
	}

	const getMonthlyPrice = (price: { monthly: number; annual: number }) =>
		price.monthly
	const getAnnualPrice = (price: { monthly: number; annual: number }) =>
		price.annual

	return (
		<div className="space-y-8">
			{/* Billing Toggle */}
			<div className="flex justify-center">
				<div className="bg-muted inline-flex rounded-lg p-1">
					<button
						onClick={() => setBillingInterval('monthly')}
						className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
							billingInterval === 'monthly'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						Monthly
					</button>
					<button
						onClick={() => setBillingInterval('annual')}
						className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
							billingInterval === 'annual'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						Annual
						<Badge variant="secondary" className="ml-2">
							Save 17%
						</Badge>
					</button>
				</div>
			</div>

			{/* Pricing Cards */}
			<div className="grid gap-8 md:grid-cols-3">
				{plans.map((plan: Plan) => {
					const monthlyPrice = getMonthlyPrice(plan.price)
					const annualPrice = getAnnualPrice(plan.price)
					const price =
						billingInterval === 'monthly'
							? monthlyPrice
							: annualPrice
					const isCurrentPlan = currentPlan === plan.id
					const isPremium = plan.id === PLAN_TYPE.GROWTH

					return (
						<Card
							key={plan.id}
							className={
								isPremium ? 'border-primary shadow-lg' : ''
							}
						>
							{isPremium && (
								<div className="bg-primary text-primary-foreground rounded-t-lg py-2 text-center text-sm font-medium">
									Most Popular
								</div>
							)}
							<CardHeader>
								<CardTitle>{plan.name}</CardTitle>
								<CardDescription>
									Perfect for{' '}
									{plan.propertyLimit === -1
										? 'unlimited'
										: plan.propertyLimit}{' '}
									properties
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div>
									<span className="text-4xl font-bold">
										${price}
									</span>
									<span className="text-muted-foreground">
										/
										{billingInterval === 'monthly'
											? 'month'
											: 'year'}
									</span>
									{billingInterval === 'annual' && (
										<p className="text-muted-foreground mt-1 text-sm">
											${monthlyPrice}/month billed
											annually
										</p>
									)}
								</div>

								<ul className="space-y-3">
									<li className="flex items-center gap-3">
										<Check className="text-primary h-4 w-4" />
										<span>
											Up to{' '}
											{plan.propertyLimit === -1
												? 'unlimited'
												: plan.propertyLimit}{' '}
											properties
										</span>
									</li>
									<li className="flex items-center gap-3">
										<Check className="text-primary h-4 w-4" />
										<span>Unlimited tenants & units</span>
									</li>
									<li className="flex items-center gap-3">
										<Check className="text-primary h-4 w-4" />
										<span>Maintenance tracking</span>
									</li>
									<li className="flex items-center gap-3">
										<Check className="text-primary h-4 w-4" />
										<span>Document storage</span>
									</li>
									{plan.id === PLAN_TYPE.GROWTH && (
										<li className="flex items-center gap-3">
											<Check className="text-primary h-4 w-4" />
											<span>Priority support</span>
										</li>
									)}
									{plan.id === PLAN_TYPE.TENANTFLOW_MAX && (
										<>
											<li className="flex items-center gap-3">
												<Check className="text-primary h-4 w-4" />
												<span>
													Unlimited properties
												</span>
											</li>
											<li className="flex items-center gap-3">
												<Check className="text-primary h-4 w-4" />
												<span>Dedicated support</span>
											</li>
											<li className="flex items-center gap-3">
												<Check className="text-primary h-4 w-4" />
												<span>Custom integrations</span>
											</li>
										</>
									)}
								</ul>
							</CardContent>
							<CardFooter>
								<Button
									className="w-full"
									variant={isPremium ? 'default' : 'outline'}
									disabled={
										isCurrentPlan || loadingPlan !== null
									}
									onClick={() =>
										void handleSelectPlan(plan.id)
									}
								>
									{loadingPlan === plan.id ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Loading...
										</>
									) : isCurrentPlan ? (
										'Current Plan'
									) : (
										'Get Started'
									)}
								</Button>
							</CardFooter>
						</Card>
					)
				})}
			</div>
		</div>
	)
}
