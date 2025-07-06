import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export function useCustomerPortal() {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const { user } = useAuth()

	const redirectToPortal = async () => {
		if (!user) {
			toast.error('Please sign in to access billing portal')
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			// Call the backend API to create portal session
			const data = await apiClient.subscriptions.createPortalSession({
				returnUrl: `${window.location.origin}/dashboard?portal=return`
			})

			if (!data?.url) {
				throw new Error('Invalid portal session response')
			}

			// Redirect to Stripe Customer Portal
			window.location.href = data.url
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Something went wrong'
			setError(errorMessage)
			toast.error(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}

	const redirectToPortalWithFlow = async (flowType: string) => {
		if (!user) {
			toast.error('Please sign in to access billing portal')
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			// Flow type support - for future Stripe Customer Portal flow enhancements
			const data = await apiClient.subscriptions.createPortalSession({
				returnUrl: `${window.location.origin}/dashboard?portal=return&flow=${flowType}`
			})

			if (!data?.url) {
				throw new Error('Invalid portal session response')
			}

			window.location.href = data.url
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Something went wrong'
			setError(errorMessage)
			toast.error(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		redirectToPortal,
		redirectToPortalWithFlow,
		isLoading,
		error
	}
}
