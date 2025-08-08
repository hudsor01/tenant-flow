'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Check, Sparkles, Zap, Crown, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BillingInterval } from './billing-toggle'

interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  monthlyPriceId: string
  annualPriceId: string
  features: string[]
  iconName: 'Sparkles' | 'Zap' | 'Crown' | 'Rocket'
  popular?: boolean
  propertyLimit: number | 'unlimited'
  unitLimit: number | 'unlimited'
  supportLevel: string
}

// Icon mapping for client-side rendering
const iconMap = {
  Sparkles,
  Zap,
  Crown,
  Rocket,
} as const

interface PricingPlanCardProps {
  plan: PricingPlan
  billingInterval: BillingInterval
  isCurrentPlan: boolean
  isLoading: boolean
  onSelect: (plan: PricingPlan) => void
  className?: string
}

/**
 * Client component for individual pricing plan card
 * Needs interactivity for button clicks
 */
export function PricingPlanCard({
  plan,
  billingInterval,
  isCurrentPlan,
  isLoading,
  onSelect,
  className
}: PricingPlanCardProps) {
  const Icon = iconMap[plan.iconName]
  const price = billingInterval === 'monthly' ? plan.monthlyPrice : plan.annualPrice
  
  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    const yearlyCost = monthlyPrice * 12
    const savings = yearlyCost - annualPrice
    const percentSaved = Math.round((savings / yearlyCost) * 100)
    return percentSaved
  }

  const savings = plan.annualPrice > 0 
    ? calculateSavings(plan.monthlyPrice, plan.annualPrice)
    : 0

  return (
    <Card
      className={cn(
        'relative transition-all hover:shadow-xl flex flex-col min-w-[280px]',
        plan.popular && 'border-primary shadow-lg lg:scale-105 z-10',
        className
      )}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-0 right-0 mx-auto w-fit">
          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-1">
            MOST POPULAR
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-8 w-8 text-primary flex-shrink-0" />
          {isCurrentPlan && (
            <Badge variant="outline" className="text-xs">
              Current Plan
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl lg:text-2xl">{plan.name}</CardTitle>
        <CardDescription className="mt-2 text-sm">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">
              ${price}
            </span>
            <span className="text-muted-foreground">
              /{billingInterval === 'monthly' ? 'month' : 'year'}
            </span>
          </div>
          {billingInterval === 'annual' && plan.monthlyPrice > 0 && (
            <p className="text-sm text-muted-foreground">
              ${(plan.annualPrice / 12).toFixed(2)}/month billed annually
              {savings > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Save {savings}%
                </Badge>
              )}
            </p>
          )}
        </div>

        {/* Key Limits */}
        <div className="space-y-2 pb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Properties</span>
            <span className="font-semibold tabular-nums">
              {plan.propertyLimit === 'unlimited' ? '∞' : plan.propertyLimit}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Units</span>
            <span className="font-semibold tabular-nums">
              {plan.unitLimit === 'unlimited' ? '∞' : plan.unitLimit}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Support</span>
            <span className="font-semibold text-xs truncate max-w-[100px]">
              {plan.supportLevel}
            </span>
          </div>
        </div>
        
        <Separator className="my-3" />

        {/* Features List */}
        <ScrollArea className="h-[180px] pr-3">
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm leading-relaxed break-words">{feature}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className="w-full"
          size="default"
          variant={plan.popular ? 'default' : 'outline'}
          disabled={isCurrentPlan || isLoading}
          onClick={() => onSelect(plan)}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : plan.id === 'FREE_TRIAL' ? (
            'Start Free Trial'
          ) : (
            'Get Started'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}