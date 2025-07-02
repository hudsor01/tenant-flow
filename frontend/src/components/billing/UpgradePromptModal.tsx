import { X, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { useCreateCheckoutSession } from '../../hooks/useSubscription'
import { PLANS, calculateAnnualSavings, getAnnualSavingsMessage } from '../../types/subscription'

interface UpgradePromptModalProps {
  isOpen: boolean
  onClose: () => void
  action: string
  reason: string
  currentPlan: string
  suggestedPlan?: 'starter' | 'growth' | 'enterprise'
}

const planColors = {
  starter: 'from-primary to-primary/80',
  growth: 'from-primary/90 to-accent', 
  enterprise: 'from-destructive to-destructive/80'
}

const planIcons = {
  starter: '🚀',
  growth: '📈',
  enterprise: '⚡'
}

export function UpgradePromptModal({ 
  isOpen, 
  onClose, 
  action, 
  reason, 
  suggestedPlan = 'starter'
}: UpgradePromptModalProps) {
  const createCheckoutSession = useCreateCheckoutSession()
  
  const suggestedPlanData = PLANS.find(p => p.id === suggestedPlan)
  
  if (!suggestedPlanData) return null

  const annualSavings = calculateAnnualSavings(suggestedPlanData)
  const savingsMessage = getAnnualSavingsMessage(suggestedPlanData)

  // Simplified upgrade flow - just redirect to Stripe Checkout
  const handleUpgradeClick = (billingPeriod: 'monthly' | 'annual' = 'monthly') => {
    createCheckoutSession.mutate({
      planId: suggestedPlan,
      billingPeriod,
      // Stripe automatically redirects to their hosted checkout
      successUrl: `${window.location.origin}/dashboard?upgrade=success`,
      cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {/* Header with gradient */}
              <div className={`bg-gradient-to-r ${planColors[suggestedPlan]} p-6 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-background/20 hover:bg-background/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-3xl">{planIcons[suggestedPlan]}</div>
                    <div>
                      <h2 className="text-xl font-bold">Upgrade Required</h2>
                      <p className="text-white/90 text-sm">{reason}</p>
                    </div>
                  </div>
                  
                  <div className="bg-background/20 rounded-lg p-3 backdrop-blur-sm">
                    <p className="font-medium text-sm mb-1">You're trying to:</p>
                    <p className="text-sm">"{action}"</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Unlock More with {suggestedPlanData.name}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Get access to more properties, tenants, and powerful features
                  </p>
                </div>

                {/* Simple upgrade buttons using Stripe Checkout */}
                <div className="space-y-3">
                  {/* Monthly */}
                  <Button
                    onClick={() => handleUpgradeClick('monthly')}
                    disabled={createCheckoutSession.isPending}
                    className={`w-full h-auto p-4 bg-gradient-to-r ${planColors[suggestedPlan]} hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-left">
                        <div className="font-semibold">Monthly Plan</div>
                        <div className="text-sm opacity-90">Billed monthly</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">${suggestedPlanData.monthlyPrice}</div>
                        <div className="text-sm opacity-90">per month</div>
                      </div>
                    </div>
                  </Button>

                  {/* Annual */}
                  <Button
                    onClick={() => handleUpgradeClick('annual')}
                    disabled={createCheckoutSession.isPending}
                    variant="outline"
                    className="w-full h-auto p-4 border-2 border-success bg-success hover:bg-success/90"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-left">
                        <div className="font-semibold flex items-center">
                          Annual Plan
                          <span className="ml-2 text-xs bg-success-foreground text-success px-2 py-1 rounded-full">
                            🎉 {savingsMessage}
                          </span>
                        </div>
                        <div className="text-sm text-success-foreground">
                          Save ${annualSavings.dollarsSaved}/year
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">${Math.round(suggestedPlanData.annualPrice / 12)}</div>
                        <div className="text-sm text-muted-foreground">per month</div>
                      </div>
                    </div>
                  </Button>
                </div>

                {/* Benefits */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">What you get:</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>✓ 14-day free trial</div>
                    <div>✓ Cancel anytime</div>
                    <div>✓ Secure Stripe checkout</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                  <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}