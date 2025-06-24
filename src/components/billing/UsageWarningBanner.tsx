import { AlertTriangle, Zap, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { useUsageMetrics, useUserPlan, useCreateCheckoutSession } from '../../hooks/useSubscription'
import { formatCurrency } from '../../utils/currency'

export function UsageWarningBanner() {
  const { data: usage } = useUsageMetrics()
  const { data: userPlan } = useUserPlan()
  const createCheckoutSession = useCreateCheckoutSession()
  const [isDismissed, setIsDismissed] = useState(false)

  if (!usage || !userPlan || !usage.limits || isDismissed) {
    return null
  }

  // Check if any limits are at 80% or higher
  const warnings = []
  
  if (usage.propertiesCount / usage.limits.properties >= 0.8) {
    warnings.push({
      type: 'properties',
      current: usage.propertiesCount,
      limit: usage.limits.properties,
      percentage: Math.round((usage.propertiesCount / usage.limits.properties) * 100),
      action: 'add properties'
    })
  }

  if (usage.tenantsCount / usage.limits.tenants >= 0.8) {
    warnings.push({
      type: 'tenants',
      current: usage.tenantsCount,
      limit: usage.limits.tenants,
      percentage: Math.round((usage.tenantsCount / usage.limits.tenants) * 100),
      action: 'invite tenants'
    })
  }

  // Don't show if no warnings
  if (warnings.length === 0) {
    return null
  }

  const handleUpgrade = () => {
    const suggestedPlan = userPlan.id === 'free' ? 'starter' : 'growth'
    createCheckoutSession.mutate({
      planId: suggestedPlan,
      billingPeriod: 'monthly',
      successUrl: `${window.location.origin}/dashboard?upgrade=success`,
      cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-6"
      >
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-orange-900">
                      Approaching Plan Limits
                    </h3>
                    <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs font-medium rounded-full">
                      {userPlan.name} Plan
                    </span>
                  </div>
                  
                  <p className="text-sm text-orange-700 mb-3">
                    You're using most of your plan's resources. Consider upgrading to avoid interruptions.
                  </p>

                  <div className="space-y-3">
                    {warnings.map((warning) => (
                      <div key={warning.type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-orange-900 capitalize">
                            {warning.type}
                          </span>
                          <span className="text-orange-700">
                            {warning.current} / {warning.limit}
                          </span>
                        </div>
                        <div className="relative">
                          <Progress 
                            value={warning.percentage} 
                            className="h-2 bg-orange-100"
                          />
                          {warning.percentage >= 100 && (
                            <div className="absolute inset-0 bg-red-500 rounded-full opacity-20" />
                          )}
                        </div>
                        <div className="text-xs text-orange-600">
                          {warning.percentage >= 100 ? (
                            <span className="font-medium text-red-600">
                              ⚠️ Limit reached - upgrade to {warning.action}
                            </span>
                          ) : (
                            <span>
                              {100 - warning.percentage}% remaining
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3 mt-4">
                    <Button
                      onClick={handleUpgrade}
                      disabled={createCheckoutSession.isPending}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Upgrade Now
                    </Button>
                    
                    <div className="text-xs text-orange-600">
                      Starting at {formatCurrency(userPlan.id === 'free' ? 49 : 99)}/month
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="text-orange-500 hover:text-orange-700 hover:bg-orange-100 p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}