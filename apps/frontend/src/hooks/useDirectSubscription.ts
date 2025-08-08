import { useState } from 'react'
import { toast } from 'sonner'

export function useDirectSubscription() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processPlan = async (planType: string, paymentMethodId?: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Here you would call your backend API to process the subscription
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          paymentMethodId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create subscription')
      }

      const data = await response.json()
      toast.success('Subscription created successfully!')
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process subscription'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    processPlan,
    isProcessing,
    error,
  }
}