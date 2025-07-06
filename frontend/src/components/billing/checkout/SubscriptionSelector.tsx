import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Building } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Plan {
  id: string
  name: string
  price: {
    monthly: number
    annual: number
  }
  features: string[]
  badge?: string
  icon?: React.ReactNode
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'freeTrial',
    name: 'Free Trial',
    price: { monthly: 0, annual: 0 },
    features: [
      'Up to 3 properties',
      '14-day free trial',
      'Basic reporting',
      'Email support'
    ],
    badge: 'Start Free',
    icon: <Building className="h-5 w-5" />
  },
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 29, annual: 290 },
    features: [
      'Up to 10 properties',
      'Advanced reporting',
      'Email & SMS notifications',
      'Document storage',
      'Priority support'
    ],
    icon: <Zap className="h-5 w-5" />,
    popular: true
  },
  {
    id: 'growth',
    name: 'Growth', 
    price: { monthly: 69, annual: 690 },
    features: [
      'Up to 50 properties',
      'Advanced analytics',
      'Maintenance management',
      'Custom branding',
      'API access',
      'Phone support'
    ],
    icon: <Crown className="h-5 w-5" />
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 149, annual: 1490 },
    features: [
      'Unlimited properties',
      'White-label solution',
      'Advanced integrations',
      'Dedicated account manager',
      'Custom workflows',
      '24/7 priority support'
    ],
    badge: 'Contact Sales',
    icon: <Crown className="h-5 w-5" />
  }
]

interface SubscriptionSelectorProps {
  onSelect: (planId: string, billingPeriod: 'monthly' | 'annual') => void
  selectedPlan?: string
  billingPeriod?: 'monthly' | 'annual'
}

export function SubscriptionSelector({ 
  onSelect, 
  selectedPlan,
  billingPeriod = 'monthly' 
}: SubscriptionSelectorProps) {
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<'monthly' | 'annual'>(billingPeriod)

  const handlePlanSelect = (planId: string) => {
    onSelect(planId, selectedBillingPeriod)
  }

  const getPrice = (plan: Plan) => {
    const price = plan.price[selectedBillingPeriod]
    if (price === 0) return 'Free'
    
    return selectedBillingPeriod === 'annual' 
      ? `$${Math.round(price / 12)}/month`
      : `$${price}/month`
  }

  const getSavings = (plan: Plan) => {
    if (plan.price.annual === 0 || plan.price.monthly === 0) return null
    
    const monthlyCost = plan.price.monthly * 12
    const savings = monthlyCost - plan.price.annual
    const percentage = Math.round((savings / monthlyCost) * 100)
    
    return percentage > 0 ? `Save ${percentage}%` : null
  }

  return (
    <div className="space-y-6">
      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            variant={selectedBillingPeriod === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedBillingPeriod('monthly')}
            className="text-sm"
          >
            Monthly
          </Button>
          <Button
            variant={selectedBillingPeriod === 'annual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedBillingPeriod('annual')}
            className="text-sm"
          >
            Annual
            <Badge variant="secondary" className="ml-2 text-xs">
              Save up to 17%
            </Badge>
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id
          const savings = getSavings(plan)
          
          return (
            <Card 
              key={plan.id}
              className={cn(
                "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
                isSelected && "ring-2 ring-blue-500 shadow-lg",
                plan.popular && "border-blue-500 shadow-lg"
              )}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {plan.icon}
                  <CardTitle className="ml-2 text-lg">{plan.name}</CardTitle>
                </div>
                
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {getPrice(plan)}
                  </div>
                  {selectedBillingPeriod === 'annual' && savings && (
                    <Badge variant="secondary" className="text-xs">
                      {savings}
                    </Badge>
                  )}
                  {selectedBillingPeriod === 'annual' && plan.price.annual > 0 && (
                    <CardDescription className="text-xs">
                      Billed annually (${plan.price.annual})
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                >
                  {plan.badge || `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <div className="text-center text-sm text-gray-500">
        <p>All plans include a 30-day money-back guarantee</p>
        <p>No setup fees • Cancel anytime • Secure payments via Stripe</p>
      </div>
    </div>
  )
}