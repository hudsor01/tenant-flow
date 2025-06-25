import { Clock, Zap, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { useUserPlan, useCreateCheckoutSession } from '../../hooks/useSubscription'
import { PLANS, calculateAnnualSavings } from '../../types/subscription'
import { formatCurrency } from '../../utils/currency'

export function TrialCountdownBanner() {
  const { data: userPlan } = useUserPlan()
  const createCheckoutSession = useCreateCheckoutSession()
  const [isDismissed, setIsDismissed] = useState(false)

  if (!userPlan || !userPlan.subscription || isDismissed) {
    return null
  }

  const trialDaysRemaining = userPlan.trialDaysRemaining || 0
  
  // Only show if user is on trial and has 7 days or less remaining
  if (trialDaysRemaining === 0 || trialDaysRemaining > 7) {
    return null
  }

  const getUrgencyLevel = () => {
    if (trialDaysRemaining <= 1) return 'critical'
    if (trialDaysRemaining <= 3) return 'high'
    return 'medium'
  }

  const urgency = getUrgencyLevel()
  
  const colors = {
    critical: {
      bg: 'from-red-50 to-pink-50',
      border: 'border-red-200',
      icon: 'bg-red-100 text-red-600',
      text: 'text-red-900',
      subtext: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700'
    },
    high: {
      bg: 'from-orange-50 to-yellow-50',
      border: 'border-orange-200',
      icon: 'bg-orange-100 text-orange-600',
      text: 'text-orange-900',
      subtext: 'text-orange-700',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    medium: {
      bg: 'from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700'
    }
  }

  const theme = colors[urgency]

  const starterPlan = PLANS.find(p => p.id === 'starter')!
  const annualSavings = calculateAnnualSavings(starterPlan)

  const handleUpgrade = (billingPeriod: 'monthly' | 'annual' = 'monthly') => {
    createCheckoutSession.mutate({
      planId: 'starter', // Default to starter plan
      billingPeriod,
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
        <Card className={`${theme.border} bg-gradient-to-r ${theme.bg}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`p-2 rounded-lg ${theme.icon}`}>
                  <Clock className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className={`font-semibold ${theme.text}`}>
                      {trialDaysRemaining === 1 ? 'Trial Expires Tomorrow!' : `${trialDaysRemaining} Days Left in Trial`}
                    </h3>
                    <span className={`px-2 py-1 bg-white/70 ${theme.subtext} text-xs font-medium rounded-full`}>
                      Free Trial
                    </span>
                  </div>
                  
                  <p className={`text-sm ${theme.subtext} mb-4`}>
                    {trialDaysRemaining === 1 
                      ? "Your free trial ends tomorrow. Upgrade now to keep your data and continue managing your properties."
                      : `Your free trial ends in ${trialDaysRemaining} days. Upgrade now to unlock unlimited properties and tenants.`
                    }
                  </p>

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => handleUpgrade('monthly')}
                      disabled={createCheckoutSession.isPending}
                      size="sm"
                      className={`${theme.button} text-white`}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Upgrade Now
                    </Button>
                    
                    <Button
                      onClick={() => handleUpgrade('annual')}
                      disabled={createCheckoutSession.isPending}
                      variant="outline"
                      size="sm"
                      className="border-white/50 bg-white/50 hover:bg-white/70"
                    >
                      🎉 Save ${annualSavings.dollarsSaved}/year
                    </Button>
                    
                    <div className={`text-xs ${theme.subtext}`}>
                      Starting at {formatCurrency(49)}/month
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className={`${theme.subtext.replace('text-', 'text-')} hover:bg-white/30 p-1 h-auto`}
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