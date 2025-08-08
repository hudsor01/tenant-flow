import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Check, Sparkles, Zap, Crown, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PricingCardActions } from './pricing-card-actions'
import type { BillingInterval } from './billing-toggle'

export interface PricingTier {
  product: {
    id: string
    name: string
    description: string
    metadata: {
      tier: string
      propertyLimit: string
      unitLimit: string
      storageGB: string
      support: string
      features: string
      popular?: string
      order: string
    }
  }
  prices: Array<{
    id: string
    nickname: string
    unit_amount: number
    currency: string
    interval: 'month' | 'year'
    metadata: {
      tier: string
      billing: string
      savings?: string
      monthly_equivalent?: string
    }
  }>
}

interface PricingCardServerProps {
  tier: PricingTier
  billingInterval: BillingInterval
  isProcessing?: boolean
  onSelectPlan?: (priceId: string, productName: string) => void
}

const tierIcons = {
  free_trial: Sparkles,
  starter: Zap,
  growth: Crown,
  tenantflow_max: Rocket,
} as const

const tierColors = {
  free_trial: 'bg-gray-50 dark:bg-gray-900/50',
  starter: 'bg-blue-50 dark:bg-blue-900/20',
  growth: 'bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500',
  tenantflow_max: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
} as const

/**
 * Server component for pricing card content
 * Only the action buttons need client-side interactivity
 */
export function PricingCardServer({ 
  tier, 
  billingInterval, 
  isProcessing = false,
  onSelectPlan 
}: PricingCardServerProps) {
  const Icon = tierIcons[tier.product.metadata.tier as keyof typeof tierIcons] || Sparkles
  const mappedInterval = billingInterval === 'monthly' ? 'month' : 'year'
  const price = tier.prices.find(p => p.interval === mappedInterval)
  const features = JSON.parse(tier.product.metadata.features || '[]') as string[]
  const isPopular = tier.product.metadata.popular === 'true'
  const monthlyEquivalent = billingInterval === 'annual' && price?.metadata.monthly_equivalent
  
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-2xl',
        'flex flex-col',
        tierColors[tier.product.metadata.tier as keyof typeof tierColors],
        isPopular && 'scale-105 shadow-xl'
      )}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-8 py-1 rotate-12 transform">
            MOST POPULAR
          </div>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn(
            'p-2 rounded-lg',
            isPopular ? 'bg-purple-500/20' : 'bg-primary/10'
          )}>
            <Icon className={cn(
              'h-6 w-6',
              isPopular ? 'text-purple-500' : 'text-primary'
            )} />
          </div>
          {tier.product.metadata.tier === 'free_trial' && (
            <Badge variant="secondary" className="text-xs">
              14 DAYS
            </Badge>
          )}
        </div>
        <CardTitle className="text-2xl">{tier.product.name}</CardTitle>
        <CardDescription className="text-sm mt-2">
          {tier.product.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Pricing */}
        <div className="space-y-1">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold">
              ${price ? (price.unit_amount / 100).toFixed(0) : '0'}
            </span>
            <span className="text-muted-foreground text-sm mb-1">
              /{billingInterval === 'monthly' ? 'mo' : 'yr'}
            </span>
          </div>
          {monthlyEquivalent && (
            <p className="text-xs text-muted-foreground">
              ${(parseInt(monthlyEquivalent) / 100).toFixed(2)}/month when billed annually
            </p>
          )}
        </div>

        {/* Key Limits */}
        <div className="grid grid-cols-2 gap-2 py-3">
          <div className="text-center p-2 rounded bg-background/50">
            <p className="text-2xl font-bold">
              {tier.product.metadata.propertyLimit === 'unlimited' ? '∞' : tier.product.metadata.propertyLimit}
            </p>
            <p className="text-xs text-muted-foreground">Properties</p>
          </div>
          <div className="text-center p-2 rounded bg-background/50">
            <p className="text-2xl font-bold">
              {tier.product.metadata.unitLimit === 'unlimited' ? '∞' : tier.product.metadata.unitLimit}
            </p>
            <p className="text-xs text-muted-foreground">Units</p>
          </div>
        </div>

        <Separator />

        {/* Features */}
        <ScrollArea className="h-[200px] pr-3 flex-1">
          <ul className="space-y-2">
            {features.map((feature: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <Check className={cn(
                  'h-4 w-4 mt-0.5 flex-shrink-0',
                  isPopular ? 'text-purple-500' : 'text-primary'
                )} />
                <span className="text-sm leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>

        {/* Support Level */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Support</span>
            <Badge variant="outline" className="text-xs">
              {tier.product.metadata.support}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <PricingCardActions
          tier={tier}
          price={price}
          isPopular={isPopular}
          isProcessing={isProcessing}
          onSelectPlan={onSelectPlan}
        />
      </CardFooter>
    </Card>
  )
}