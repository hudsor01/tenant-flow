import { useState, useEffect } from 'react'
import { Clock, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useCreateCheckoutSession } from '../../hooks/useSubscription'
import { formatCurrency } from '../../utils/currency'

interface LimitedTimeOfferProps {
  offerType?: 'black-friday' | 'new-year' | 'summer' | 'spring'
  isVisible?: boolean
  onDismiss?: () => void
}

// Define different promotional offers
const offers = {
  'black-friday': {
    title: 'Black Friday Special',
    discount: '50% OFF',
    description: 'Your first year of TenantFlow',
    emoji: '🔥',
    color: 'bg-gradient-to-r from-destructive to-destructive/80',
    textColor: 'text-destructive-foreground',
    endsDate: new Date('2024-11-30'),
    urgencyMessage: 'Limited time only!'
  },
  'new-year': {
    title: 'New Year Resolution',
    discount: '40% OFF',
    description: 'First 3 months of any plan',
    emoji: '🎊',
    color: 'bg-gradient-to-r from-primary to-primary/80',
    textColor: 'text-primary-foreground',
    endsDate: new Date('2024-01-31'),
    urgencyMessage: 'Start your property management journey!'
  },
  'summer': {
    title: 'Summer Growth Special',
    discount: '25% OFF',
    description: 'First 6 months of annual plans',
    emoji: '☀️',
    color: 'bg-gradient-to-r from-accent to-accent/80',
    textColor: 'text-accent-foreground',
    endsDate: new Date('2024-08-31'),
    urgencyMessage: 'Perfect time to grow your portfolio!'
  },
  'spring': {
    title: 'Spring Into Action',
    discount: '30% OFF',
    description: 'First year for new customers',
    emoji: '🌱',
    color: 'bg-gradient-to-r from-primary to-accent',
    textColor: 'text-primary-foreground',
    endsDate: new Date('2024-04-30'),
    urgencyMessage: 'Fresh start, fresh savings!'
  }
}

export function LimitedTimeOffer({ 
  offerType = 'new-year', 
  isVisible = true,
  onDismiss 
}: LimitedTimeOfferProps) {
  const [isOfferVisible, setIsOfferVisible] = useState(isVisible)
  const [timeLeft, setTimeLeft] = useState('')
  const createCheckoutSession = useCreateCheckoutSession()

  const offer = offers[offerType]

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const difference = offer.endsDate.getTime() - now.getTime()
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
        const minutes = Math.floor((difference / 1000 / 60) % 60)
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m left`)
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m left`)
        } else {
          setTimeLeft(`${minutes}m left`)
        }
      } else {
        setTimeLeft('Offer expired')
        setIsOfferVisible(false)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [offer.endsDate])

  const handleClaimOffer = (billingPeriod: 'monthly' | 'annual' = 'annual') => {
    createCheckoutSession.mutate({
      planId: 'starter',
      billingPeriod,
      // Add coupon code or special pricing parameters here
      successUrl: `${window.location.origin}/dashboard?upgrade=success&offer=${offerType}`,
      cancelUrl: `${window.location.origin}/pricing?upgrade=cancelled`
    })
  }

  const handleDismiss = () => {
    setIsOfferVisible(false)
    onDismiss?.()
    // Store dismissal in localStorage so it doesn't show again today
    localStorage.setItem(`offer-dismissed-${offerType}`, new Date().toDateString())
  }

  // Check if offer was already dismissed today
  useEffect(() => {
    const dismissed = localStorage.getItem(`offer-dismissed-${offerType}`)
    if (dismissed === new Date().toDateString()) {
      setIsOfferVisible(false)
    }
  }, [offerType])

  if (!isOfferVisible) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Card className="border-2 border-dashed border-accent overflow-hidden relative">
          <div className={`${offer.color} relative`}>
            {/* Animated sparkles background */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-primary-foreground/30"
                  initial={{ opacity: 0.3 }}
                  animate={{ 
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                  style={{
                    left: `${10 + (i * 12)}%`,
                    top: `${20 + (i % 3) * 30}%`
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              ))}
            </div>

            <CardContent className="p-4 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-4xl">{offer.emoji}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className={`font-bold text-lg ${offer.textColor}`}>
                        {offer.title}
                      </h3>
                      <Badge variant="secondary" className="bg-background/20 text-primary-foreground border-background/30">
                        <Clock className="w-3 h-3 mr-1" />
                        {timeLeft}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`text-3xl font-bold ${offer.textColor}`}>
                        {offer.discount}
                      </div>
                      <div className={`${offer.textColor}`}>
                        <div className="font-medium">{offer.description}</div>
                        <div className="text-sm opacity-90">{offer.urgencyMessage}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() => handleClaimOffer('annual')}
                        disabled={createCheckoutSession.isPending}
                        size="sm"
                        className="bg-background text-foreground hover:bg-background/90 font-medium"
                      >
                        🎯 Claim Offer - Annual
                      </Button>
                      
                      <Button
                        onClick={() => handleClaimOffer('monthly')}
                        disabled={createCheckoutSession.isPending}
                        variant="outline"
                        size="sm"
                        className="border-background/50 text-primary-foreground bg-background/10 hover:bg-background/20"
                      >
                        Monthly Plan
                      </Button>
                      
                      <div className={`text-xs ${offer.textColor} opacity-75`}>
                        Starting at {formatCurrency(29)}/month
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className={`${offer.textColor} hover:bg-background/20 p-1 h-auto`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </div>

          {/* Bottom stripe with additional urgency */}
          <div className="bg-background px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="font-medium text-success-foreground">
                    Limited spots available
                  </span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-foreground/80">14-day free trial included</span>
              </div>
              <div className="text-muted-foreground">
                Use code: <span className="font-mono font-bold">{offerType.toUpperCase()}2024</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}