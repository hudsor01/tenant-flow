import { motion } from 'framer-motion'
import { Check, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PricingCardProps } from '@repo/shared'
import { calculateYearlySavings } from '@repo/shared'

function formatPricingPrice(price: number): string {
  return `$${price}`
}

export function PricingCard({
  plan,
  billingInterval,
  isCurrentPlan = false,
  loading = false,
  onSubscribe,
  className,
}: PricingCardProps) {
  const price = billingInterval === 'yearly' ? plan.prices.yearly : plan.prices.monthly
  const originalMonthlyPrice = plan.prices.monthly
  const yearlyMonthlyEquivalent = Math.round(plan.prices.yearly / 12)
  const savings = billingInterval === 'yearly' && plan.prices.monthly > 0
    ? calculateYearlySavings(plan.prices.monthly, plan.prices.yearly)
    : 0

  const isFreePlan = plan.id === 'free'
  const isEnterprise = plan.id === 'tenantflow_max'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(className)}
    >
      <Card
        className={cn(
          'relative h-full transition-all duration-300 hover:shadow-lg',
          plan.recommended
            ? 'border-2 border-blue-500 shadow-md'
            : 'border border-gray-200 hover:border-gray-300',
          isCurrentPlan && 'ring-2 ring-green-500 ring-offset-2'
        )}
      >
        {/* Recommended Badge */}
        {plan.recommended && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-600 text-white px-3 py-1 text-xs font-semibold">
              <Star className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
          </div>
        )}

        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <div className="absolute -top-3 right-4">
            <Badge className="bg-green-600 text-white px-3 py-1 text-xs font-semibold">
              Current Plan
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pb-4">
          <h3 className={cn(
            'text-2xl font-bold',
            plan.recommended ? 'text-blue-600' : 'text-gray-900'
          )}>
            {plan.name}
          </h3>
          <p className="text-gray-600 text-sm mt-2">
            {plan.description}
          </p>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          {/* Pricing */}
          <div className="text-center mb-6">
            {isFreePlan ? (
              <div>
                <span className="text-4xl font-bold text-gray-900">Free</span>
                <p className="text-sm text-gray-600 mt-1">14-day trial</p>
              </div>
            ) : isEnterprise ? (
              <div>
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Custom
                </span>
                <p className="text-sm text-gray-600 mt-1">Contact for pricing</p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPricingPrice(billingInterval === 'yearly' ? yearlyMonthlyEquivalent : price)}
                  </span>
                  <span className="text-gray-600 ml-1">
                    /{billingInterval === 'yearly' ? 'month' : 'month'}
                  </span>
                </div>

                {billingInterval === 'yearly' && savings > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      <span className="line-through">
                        {formatPricingPrice(originalMonthlyPrice)}/month
                      </span>
                      <span className="ml-2 text-green-600 font-medium">
                        Save {savings}%
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Billed {formatPricingPrice(price)} annually
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Limits Display (for non-tenantflow_max plans) */}
          {!isEnterprise && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {plan.limits.properties === null ? '∞' : plan.limits.properties}
                  </div>
                  <div className="text-gray-600">Properties</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {plan.limits.tenants === null ? '∞' : plan.limits.tenants}
                  </div>
                  <div className="text-gray-600">Tenants</div>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="space-y-3">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter className="px-6 pt-0">
          <Button
            onClick={onSubscribe}
            disabled={loading || isCurrentPlan}
            className={cn(
              'w-full transition-all duration-200',
              plan.recommended
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : isFreePlan
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : isEnterprise
                ? 'bg-gray-900 hover:bg-gray-800 text-white'
                : 'bg-gray-900 hover:bg-gray-800 text-white',
              isCurrentPlan && 'bg-gray-100 text-gray-500 cursor-not-allowed'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isCurrentPlan ? (
              'Current Plan'
            ) : (
              plan.cta
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
