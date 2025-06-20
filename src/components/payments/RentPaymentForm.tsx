import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { CreditCard, DollarSign, Shield } from 'lucide-react'
import { toast } from 'sonner'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!)

interface RentPaymentFormProps {
  leaseId: string
  rentAmount: number
  propertyName: string
  dueDate: string
}

function PaymentForm({ leaseId, rentAmount, propertyName, dueDate }: RentPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(rentAmount)

  // Calculate TenantFlow processing fee (3% + $0.30)
  const processingFee = Math.round((paymentAmount * 0.03 + 0.30) * 100) / 100
  const totalAmount = paymentAmount + processingFee

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      toast.error('Payment system not loaded. Please refresh and try again.')
      return
    }

    setIsProcessing(true)

    try {
      // Create payment intent via Supabase Edge Function
      const { data: paymentIntent, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          leaseId,
          amount: paymentAmount, // Rent amount
          processingFee, // TenantFlow fee
          totalAmount, // Total charged to tenant
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card information is required')
      }

      // Confirm payment with Stripe
      const { error: confirmError, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Tenant', // Could get from user context
            },
          }
        }
      )

      if (confirmError) {
        throw new Error(confirmError.message)
      }

      if (confirmedPayment?.status === 'succeeded') {
        toast.success('Rent payment successful! Your landlord has been notified.')
        
        // Clear the form
        cardElement.clear()
        setPaymentAmount(rentAmount)
      }

    } catch (error) {
      console.error('Payment failed:', error)
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pay Rent - {propertyName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Due: {dueDate}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="pl-9"
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="bg-muted/30 p-3 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Rent Amount:</span>
              <span>${paymentAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Processing Fee:</span>
              <span>${processingFee.toFixed(2)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Card Element */}
          <div className="space-y-2">
            <Label>Card Information</Label>
            <div className="p-3 border rounded-lg">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Your payment is secured by Stripe. We never store your card information.</span>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function RentPaymentForm(props: RentPaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  )
}