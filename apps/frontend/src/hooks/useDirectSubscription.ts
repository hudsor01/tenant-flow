import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

export function useDirectSubscription() {
	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const processPlan = async (planType: string, paymentMethodId?: string) => {
		setIsProcessing(true)
		setError(null)

		try {
			// Here you would call your backend API to process the subscription
			const data = await apiClient.post<{ subscriptionId: string }>('/stripe/create-subscription', {
				planType,
				paymentMethodId
			})
			
			toast.success('Subscription created successfully!')
			return data
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: 'Failed to process subscription'
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
		error
	}
}
