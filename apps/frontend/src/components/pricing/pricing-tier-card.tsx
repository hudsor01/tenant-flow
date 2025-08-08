import { Check, Zap, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProductTierConfig, PlanType, BillingInterval } from '@repo/shared'

interface PricingTierCardProps {
  tier: ProductTierConfig
  planType: PlanType
  billingInterval: BillingInterval
  isCurrentPlan?: boolean
  loading?: boolean
  onSubscribe?: () => void
  isRecommended?: boolean
}

export function PricingTierCard({
  tier,
  planType,
  billingInterval,
  isCurrentPlan = false,
  loading = false,
  onSubscribe,
  isRecommended = false
}: PricingTierCardProps) {
  const price = billingInterval === 'monthly' ? tier.price.monthly : tier.price.annual
  const monthlyPrice = billingInterval === 'yearly' ? tier.price.annual / 12 : tier.price.monthly
  
  const isFree = planType === 'FREETRIAL'
  const isTenantFlowMax = planType === 'TENANTFLOW_MAX'
  
  // Calculate features to display
  const features = [
    `Up to ${tier.limits.properties === null ? 'unlimited' : tier.limits.properties} properties`,
    `Up to ${tier.limits.units === null ? 'unlimited' : tier.limits.units} units`,
    `${tier.limits.users === null ? 'Unlimited' : tier.limits.users} user${tier.limits.users !== 1 ? 's' : ''}`,
    `${tier.limits.storage === null ? 'Unlimited' : tier.limits.storage + 'GB'} storage`,
    `${tier.limits.apiCalls === null || tier.limits.apiCalls === undefined ? 'Unlimited' : tier.limits.apiCalls.toLocaleString()} API calls/month`,
    'Tenant management',
    'Maintenance tracking',
    'Document storage'
  ]

  // Add tier-specific features
  if (planType !== 'FREETRIAL') {
    features.push('Email support')
  }
  if (planType === 'GROWTH' || planType === 'TENANTFLOW_MAX') {
    features.push('Advanced analytics', 'Team collaboration')
  }
  if (planType === 'TENANTFLOW_MAX') {
    features.push('Dedicated support', 'Custom integrations', 'SLA guarantees')
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)
  }

  const getCTA = () => {
    if (isCurrentPlan) return 'Current Plan'
    if (isFree) return 'Start Free Trial'
    if (isTenantFlowMax) return 'Contact Sales'
    return `Start ${tier.name} Plan`
  }

  return (
    <Card className={cn(
      'relative h-full transition-all duration-300 hover:shadow-lg',
      isRecommended && 'ring-2 ring-blue-500 shadow-lg scale-105',
      isCurrentPlan && 'border-green-500 bg-green-50/50'
    )}>
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white px-4 py-1 flex items-center gap-1">
            <Star className="w-3 h-3" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
          {isFree && <Zap className="w-5 h-5 text-green-500" />}
        </div>
        
        <div className="mb-4">
          {isFree ? (
            <div className="text-4xl font-bold text-green-600">Free</div>
          ) : isTenantFlowMax ? (
            <div className="text-4xl font-bold text-gray-900">Custom</div>
          ) : (
            <>
              <div className="text-4xl font-bold text-gray-900">
                {formatPrice(monthlyPrice)}
                <span className="text-lg text-gray-500 font-normal">/month</span>
              </div>
              {billingInterval === 'yearly' && (
                <div className="text-sm text-green-600 font-medium">
                  Billed annually ({formatPrice(price)})
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-gray-600 text-sm">{tier.description}</p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">{feature}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={onSubscribe}
          disabled={loading || isCurrentPlan}
          className={cn(
            'w-full transition-all duration-200',
            isCurrentPlan
              ? 'bg-green-100 text-green-700 cursor-default'
              : isFree
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : isRecommended
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          )}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            getCTA()
          )}
        </Button>

        {tier.trial && tier.trial.trialPeriodDays > 0 && !isFree && (
          <p className="text-xs text-gray-500 text-center mt-2">
            {tier.trial.trialPeriodDays}-day free trial
          </p>
        )}
      </CardContent>
    </Card>
  )
}