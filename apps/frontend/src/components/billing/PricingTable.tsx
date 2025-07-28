import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { PLAN_TYPE } from '@tenantflow/shared/types/billing'
import type { PlanType } from '@tenantflow/shared/types/billing'
import { useCheckout } from '@/hooks/useCheckout'

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
  const navigate = useNavigate()
  const { user } = useAuth()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  // TODO: Replace with actual plan data or hook
  const plans: Plan[] = []

  const { createCheckout } = useCheckout()

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate({ to: '/auth/Signup' })
      return
    }

    setLoadingPlan(planId)

    try {
      await createCheckout({
        planType: planId as keyof typeof PLAN_TYPE,
        billingInterval
      })
    } catch {
      // Error is handled in the hook
    } finally {
      setLoadingPlan(null)
    }
  }

  const getMonthlyPrice = (price: { monthly: number; annual: number }) => price.monthly
  const getAnnualPrice = (price: { monthly: number; annual: number }) => price.annual

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-muted p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('annual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'annual'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annual
            <Badge variant="secondary" className="ml-2">Save 17%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan: Plan) => {
          const monthlyPrice = getMonthlyPrice(plan.price)
          const annualPrice = getAnnualPrice(plan.price)
          const price = billingInterval === 'monthly' ? monthlyPrice : annualPrice
          const isCurrentPlan = currentPlan === plan.id
          const isPremium = plan.id === PLAN_TYPE.GROWTH

          return (
            <Card
              key={plan.id}
              className={isPremium ? 'border-primary shadow-lg' : ''}
            >
              {isPremium && (
                <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium rounded-t-lg">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  Perfect for {plan.propertyLimit === -1 ? 'unlimited' : plan.propertyLimit} properties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-muted-foreground">
                    /{billingInterval === 'monthly' ? 'month' : 'year'}
                  </span>
                  {billingInterval === 'annual' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${monthlyPrice}/month billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Up to {plan.propertyLimit === -1 ? 'unlimited' : plan.propertyLimit} properties</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Unlimited tenants & units</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Maintenance tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Document storage</span>
                  </li>
                  {plan.id === PLAN_TYPE.GROWTH && (
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Priority support</span>
                    </li>
                  )}
                  {plan.id === PLAN_TYPE.ENTERPRISE && (
                    <>
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Unlimited properties</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Dedicated support</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary" />
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
                  disabled={isCurrentPlan || loadingPlan !== null}
                  onClick={() => handleSelectPlan(plan.id)}
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
