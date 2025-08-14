'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import { AlertTriangleIcon, CheckIcon, XIcon } from 'lucide-react'
import { useSubscriptionCancellation } from '../../hooks/use-subscription-management'
import { LoadingSpinner } from '../ui/loading-spinner'
import type { PlanType } from '@repo/database'

interface SubscriptionCancelModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: PlanType
  userId: string
  onCancelSuccess?: () => void
}

const CANCELLATION_REASONS = [
  'Too expensive',
  'Not using the service enough',
  'Missing features I need',
  'Found a better alternative',
  'Technical issues',
  'Business no longer needs it',
  'Other'
]

export function SubscriptionCancelModal({
  isOpen,
  onClose,
  currentPlan,
  userId,
  onCancelSuccess
}: SubscriptionCancelModalProps) {
  const [step, setStep] = useState<'reason' | 'retention' | 'confirm' | 'success'>('reason')
  const [cancelAt, setCancelAt] = useState<'immediate' | 'end_of_period'>('end_of_period')
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showRetention, setShowRetention] = useState(true)

  const {
    cancelImmediately,
    cancelAtPeriodEnd,
    isCanceling,
    cancelError
  } = useSubscriptionCancellation(userId)

  const handleCancel = async () => {
    try {
      const result = cancelAt === 'immediate' 
        ? await cancelImmediately(reason, feedback)
        : await cancelAtPeriodEnd(reason, feedback)

      if (result.success) {
        setStep('success')
        setTimeout(() => {
          onCancelSuccess?.()
          onClose()
          resetState()
        }, 3000)
      }
    } catch (error) {
      console.error('Cancellation failed:', error)
    }
  }

  const resetState = () => {
    setStep('reason')
    setCancelAt('end_of_period')
    setReason('')
    setFeedback('')
    setShowRetention(true)
  }

  const handleClose = () => {
    if (!isCanceling) {
      onClose()
      resetState()
    }
  }

  // Success step
  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Cancellation Processed</h3>
            <p className="text-gray-600 mb-4">
              {cancelAt === 'immediate' 
                ? 'Your subscription has been canceled immediately.'
                : 'Your subscription will be canceled at the end of your billing period.'}
            </p>
            <p className="text-sm text-gray-500">
              You can reactivate anytime from your account settings.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Reason step
  if (step === 'reason') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Why are you canceling?</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600">
              We'd love to understand why you're leaving so we can improve our service.
            </p>

            <RadioGroup value={reason} onValueChange={setReason}>
              {CANCELLATION_REASONS.map((reasonOption) => (
                <div key={reasonOption} className="flex items-center space-x-2">
                  <RadioGroupItem value={reasonOption} id={reasonOption} />
                  <Label htmlFor={reasonOption}>{reasonOption}</Label>
                </div>
              ))}
            </RadioGroup>

            {reason === 'Other' && (
              <Textarea
                placeholder="Please tell us more..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={() => showRetention ? setStep('retention') : setStep('confirm')}
              disabled={!reason}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Retention step
  if (step === 'retention' && showRetention) {
    const retentionOffers = {
      'Too expensive': {
        title: 'Would a discount help?',
        offer: 'We can offer you 50% off your next 3 months.',
        action: 'Get Discount'
      },
      'Not using the service enough': {
        title: 'Let us help you get more value',
        offer: 'Schedule a free consultation to optimize your workflow.',
        action: 'Schedule Call'
      },
      'Missing features I need': {
        title: 'Tell us what you need',
        offer: 'Our product team would love to hear your feature requests.',
        action: 'Share Feedback'
      }
    }

    const offer = retentionOffers[reason as keyof typeof retentionOffers]

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Before you go...</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {offer ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{offer.title}</h4>
                <p className="text-blue-800 mb-3">{offer.offer}</p>
                <Button size="sm" className="mr-2">
                  {offer.action}
                </Button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">We're sorry to see you go</h4>
                <p className="text-gray-600">
                  Your feedback helps us improve. Thank you for being a customer.
                </p>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>If you still want to cancel, you can:</p>
              <ul className="list-disc ml-5 mt-2">
                <li>Cancel at the end of your billing period (recommended)</li>
                <li>Cancel immediately and lose access right away</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('confirm')}>
              Still Cancel
            </Button>
            <Button onClick={handleClose}>
              Keep Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Confirmation step
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
            Confirm Cancellation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-900 mb-2">
              You're about to cancel your {currentPlan} subscription
            </h4>
            <p className="text-orange-800 text-sm">
              This action cannot be undone, but you can always resubscribe later.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-medium">When should the cancellation take effect?</p>
            
            <RadioGroup value={cancelAt} onValueChange={(value) => setCancelAt(value as 'immediate' | 'end_of_period')}>
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="end_of_period" id="end_of_period" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="end_of_period" className="font-medium">
                    At the end of billing period (Recommended)
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    You'll keep access until your current billing period ends, then your subscription will be canceled.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="immediate" id="immediate" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="immediate" className="font-medium">
                    Immediately
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Your subscription will be canceled right away and you'll lose access immediately.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="additional-feedback">Additional feedback (optional)</Label>
            <Textarea
              id="additional-feedback"
              placeholder="Anything else you'd like us to know?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Error Display */}
          {cancelError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XIcon className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">
                  {cancelError.message || 'Cancellation failed. Please try again.'}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCanceling}>
            Keep Subscription
          </Button>
          <Button 
            variant="destructive"
            onClick={handleCancel}
            disabled={isCanceling}
            className="flex items-center gap-2"
          >
            {isCanceling ? (
              <>
                <LoadingSpinner size="sm" />
                Processing...
              </>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}